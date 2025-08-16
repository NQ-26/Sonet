import {useCallback, useEffect, useMemo, useRef} from 'react'
import {
  type SonetProfile,
  type SonetFeedInfo,
  type SonetSavedFeed,
} from '#/types/sonet'
import {
  type InfiniteData,
  keepPreviousData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {SONET_FEED_CONFIG} from '#/lib/constants'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {STALE} from '#/state/queries'
import {RQKEY as listQueryKey} from '#/state/queries/list'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useAgent, useSession} from '#/state/session'
import {router} from '#/routes'
import {useModerationOpts} from '../preferences/moderation-opts'
import {type FeedDescriptor} from './note-feed'
import {precacheResolvedUri} from './resolve-uri'

export type FeedSourceFeedInfo = {
  type: 'feed'
  uri: string
  feedDescriptor: FeedDescriptor
  route: {
    href: string
    name: string
    params: Record<string, string>
  }
  cid: string
  avatar: string | undefined
  displayName: string
  description: string
  contentMode: 'text' | 'images' | 'video' | undefined
}

export type FeedSourceListInfo = {
  type: 'list'
  uri: string
  feedDescriptor: FeedDescriptor
  route: {
    href: string
    name: string
    params: Record<string, string>
  }
  cid: string
  avatar: string | undefined
  displayName: string
  description: string
  contentMode: undefined
}

export type FeedSourceInfo = FeedSourceFeedInfo | FeedSourceListInfo

const feedSourceInfoQueryKeyRoot = 'getFeedSourceInfo'
export const feedSourceInfoQueryKey = ({uri}: {uri: string}) => [
  feedSourceInfoQueryKeyRoot,
  uri,
]

const feedSourceNSIDs = {
  feed: 'app.sonet.feed.generator',
  list: 'app.sonet.graph.list',
}

export function hydrateFeedGenerator(
  feedInfo: SonetSavedFeed,
): FeedSourceInfo {
  // For centralized feeds, we use simple routing
  const href = `/feed/${feedInfo.value}`
  const route = router.matchPath(href)

  return {
    type: 'feed',
    uri: feedInfo.value,
    feedDescriptor: `feed|${feedInfo.value}`,
    cid: feedInfo.id,
    route: {
      href,
      name: route[0],
      params: route[1],
    },
    avatar: feedInfo.avatar,
    displayName: feedInfo.displayName,
    description: feedInfo.description,
    contentMode: feedInfo.contentMode,
  }
}

export function hydrateList(
  listView: SonetListView,
): FeedSourceInfo {
  // For lists, we use list routing
  const href = `/list/${listView.uri.split('/').pop()}`
  const route = router.matchPath(href)

  return {
    type: 'list',
    uri: listView.uri,
    feedDescriptor: `list|${listView.uri}`,
    cid: listView.cid,
    route: {
      href,
      name: route[0],
      params: route[1],
    },
    avatar: listView.avatar,
    displayName: listView.displayName,
    description: listView.description || '',
    contentMode: undefined,
  }
}

// For centralized feeds, we don't need complex URI parsing
export function getFeedTypeFromUri(uri: string) {
  return uri.startsWith('feed|') ? 'feed' : 'timeline'
}

export function getAvatarTypeFromUri(uri: string) {
  return getFeedTypeFromUri(uri) === 'feed' ? 'algo' : 'timeline'
}

export function useFeedSourceInfoQuery({uri}: {uri: string}) {
  const type = getFeedTypeFromUri(uri)

  return useQuery({
    staleTime: STALE.INFINITY,
    queryKey: feedSourceInfoQueryKey({uri}),
    queryFn: async () => {
      // For centralized feeds, we create feed info from constants
      const feedValue = uri.replace('feed|', '').replace('timeline|', '')
      
      if (type === 'feed') {
        // Map feed values to feed config
        const feedConfig = Object.values(SONET_FEED_CONFIG).find(
          config => config.value === feedValue
        )
        
        if (feedConfig) {
          return hydrateFeedGenerator({
            id: feedValue,
            type: 'feed',
            value: feedValue,
            pinned: true,
            displayName: feedConfig.displayName,
            description: feedConfig.description,
            contentMode: feedConfig.contentMode
          })
        }
      }
      
      // Default to following timeline
      return {
        type: 'timeline' as const,
        uri: 'following',
        feedDescriptor: 'following',
        route: {
          href: '/following',
          name: 'Following',
          params: {}
        },
        cid: 'following',
        avatar: undefined,
        displayName: 'Following',
        description: 'Notes from people you follow',
        contentMode: undefined
      }
    },
  })
}

// HACK
// the protocol doesn't yet tell us which feeds are personalized
// this list is used to filter out feed recommendations from logged out users
// for the ones we know need it
// -prf
export const KNOWN_AUTHED_ONLY_FEEDS = [
  'sonet://userId:plc:z72i7hdynmk6r22z27h6tvur/app.sonet.feed.generator/with-friends', // popular with friends, by sonet.app
  'sonet://userId:plc:tenurhgjptubkk5zf5qhi3og/app.sonet.feed.generator/mutuals', // mutuals, by skyfeed
  'sonet://userId:plc:tenurhgjptubkk5zf5qhi3og/app.sonet.feed.generator/only-notes', // only notes, by skyfeed
  'sonet://userId:plc:wzsilnxf24ehtmmc3gssy5bu/app.sonet.feed.generator/mentions', // mentions, by flicknow
  'sonet://userId:plc:q6gjnaw2blty4crticxkmujt/app.sonet.feed.generator/bangers', // my bangers, by jaz
  'sonet://userId:plc:z72i7hdynmk6r22z27h6tvur/app.sonet.feed.generator/mutuals', // mutuals, by bluesky
  'sonet://userId:plc:q6gjnaw2blty4crticxkmujt/app.sonet.feed.generator/my-followers', // followers, by jaz
  'sonet://userId:plc:vpkhqolt662uhesyj6nxm7ys/app.sonet.feed.generator/followpics', // the gram, by why
]

type GetPopularFeedsOptions = {limit?: number; enabled?: boolean}

export function createGetPopularFeedsQueryKey(
  options?: GetPopularFeedsOptions,
) {
  return ['getPopularFeeds', options?.limit]
}

export function useGetPopularFeedsQuery(options?: GetPopularFeedsOptions) {
  const {hasSession} = useSession()
  const agent = useAgent()
  const limit = options?.limit || 10
  const {data: preferences} = usePreferencesQuery()
  const queryClient = useQueryClient()
  const moderationOpts = useModerationOpts()

  // Make sure this doesn't invalidate unless really needed.
  const selectArgs = useMemo(
    () => ({
      hasSession,
      savedFeeds: preferences?.savedFeeds || [],
      moderationOpts,
    }),
    [hasSession, preferences?.savedFeeds, moderationOpts],
  )
  const lastPageCountRef = useRef(0)

  const query = useInfiniteQuery<
    SonetUnspeccedGetPopularFeedGenerators.OutputSchema,
    Error,
    InfiniteData<SonetUnspeccedGetPopularFeedGenerators.OutputSchema>,
    QueryKey,
    string | undefined
  >({
    enabled: Boolean(moderationOpts) && options?.enabled !== false,
    queryKey: createGetPopularFeedsQueryKey(options),
    queryFn: async ({pageParam}) => {
      const res = await agent.app.sonet.unspecced.getPopularFeedGenerators({
        limit,
        cursor: pageParam,
      })

      // precache feeds
      for (const feed of res.data.feeds) {
        const hydratedFeed = hydrateFeedGenerator(feed)
        precacheFeed(queryClient, hydratedFeed)
      }

      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    select: useCallback(
      (
        data: InfiniteData<SonetUnspeccedGetPopularFeedGenerators.OutputSchema>,
      ) => {
        const {
          savedFeeds,
          hasSession: hasSessionInner,
          moderationOpts,
        } = selectArgs
        return {
          ...data,
          pages: data.pages.map(page => {
            return {
              ...page,
              feeds: page.feeds.filter(feed => {
                if (
                  !hasSessionInner &&
                  KNOWN_AUTHED_ONLY_FEEDS.includes(feed.uri)
                ) {
                  return false
                }
                const alreadySaved = Boolean(
                  savedFeeds?.find(f => {
                    return f.value === feed.uri
                  }),
                )
                const decision = moderateFeedGenerator(feed, moderationOpts!)
                return !alreadySaved && !decision.ui('contentList').filter
              }),
            }
          }),
        }
      },
      [selectArgs /* Don't change. Everything needs to go into selectArgs. */],
    ),
  })

  useEffect(() => {
    const {isFetching, hasNextPage, data} = query
    if (isFetching || !hasNextPage) {
      return
    }

    // avoid double-fires of fetchNextPage()
    if (
      lastPageCountRef.current !== 0 &&
      lastPageCountRef.current === data?.pages?.length
    ) {
      return
    }

    // fetch next page if we haven't gotten a full page of content
    let count = 0
    for (const page of data?.pages || []) {
      count += page.feeds.length
    }
    if (count < limit && (data?.pages.length || 0) < 6) {
      query.fetchNextPage()
      lastPageCountRef.current = data?.pages?.length || 0
    }
  }, [query, limit])

  return query
}

export function useSearchPopularFeedsMutation() {
  const agent = useAgent()
  const moderationOpts = useModerationOpts()

  return useMutation({
    mutationFn: async (query: string) => {
      const res = await agent.app.sonet.unspecced.getPopularFeedGenerators({
        limit: 10,
        query: query,
      })

      if (moderationOpts) {
        return res.data.feeds.filter(feed => {
          const decision = moderateFeedGenerator(feed, moderationOpts)
          return !decision.ui('contentMedia').blur
        })
      }

      return res.data.feeds
    },
  })
}

const popularFeedsSearchQueryKeyRoot = 'popularFeedsSearch'
export const createPopularFeedsSearchQueryKey = (query: string) => [
  popularFeedsSearchQueryKeyRoot,
  query,
]

export function usePopularFeedsSearch({
  query,
  enabled,
}: {
  query: string
  enabled?: boolean
}) {
  const agent = useAgent()
  const moderationOpts = useModerationOpts()
  const enabledInner = enabled ?? Boolean(moderationOpts)

  return useQuery({
    enabled: enabledInner,
    queryKey: createPopularFeedsSearchQueryKey(query),
    queryFn: async () => {
      const res = await agent.app.sonet.unspecced.getPopularFeedGenerators({
        limit: 15,
        query: query,
      })

      return res.data.feeds
    },
    placeholderData: keepPreviousData,
    select(data) {
      return data.filter(feed => {
        const decision = moderateFeedGenerator(feed, moderationOpts!)
        return !decision.ui('contentMedia').blur
      })
    },
  })
}

export type SavedFeedSourceInfo = FeedSourceInfo & {
  savedFeed: SonetSavedFeed
}

const PWI_DISCOVER_FEED_STUB: SavedFeedSourceInfo = {
  type: 'feed',
  displayName: 'Discover',
  uri: DISCOVER_FEED_URI,
  feedDescriptor: `feedgen|${DISCOVER_FEED_URI}`,
  route: {
    href: '/',
    name: 'Home',
    params: {},
  },
  cid: '',
  avatar: '',
  description: new string({text: ''}),
  creatorDid: '',
  creatorUsername: '',
  likeCount: 0,
  likeUri: '',
  // ---
  savedFeed: {
    id: 'pwi-discover',
    ...DISCOVER_SAVED_FEED,
  },
  contentMode: undefined,
}

const pinnedFeedInfosQueryKeyRoot = 'pinnedFeedsInfos'

export function usePinnedFeedsInfos() {
  const {hasSession} = useSession()
  const agent = useAgent()
  const {data: preferences, isLoading: isLoadingPrefs} = usePreferencesQuery()
  const pinnedItems = preferences?.savedFeeds.filter(feed => feed.pinned) ?? []

  return useQuery({
    staleTime: STALE.INFINITY,
    enabled: !isLoadingPrefs,
    queryKey: [
      pinnedFeedInfosQueryKeyRoot,
      (hasSession ? 'authed:' : 'unauthed:') +
        pinnedItems.map(f => f.value).join(','),
    ],
    queryFn: async () => {
      if (!hasSession) {
        return [PWI_DISCOVER_FEED_STUB]
      }

      let resolved = new Map<string, FeedSourceInfo>()

      // Get all feeds. We can do this in a batch.
      const pinnedFeeds = pinnedItems.filter(feed => feed.type === 'feed')
      let feedsPromise = Promise.resolve()
      if (pinnedFeeds.length > 0) {
        feedsPromise = agent.app.sonet.feed
          .getFeedGenerators({
            feeds: pinnedFeeds.map(f => f.value),
          })
          .then(res => {
            for (let i = 0; i < res.data.feeds.length; i++) {
              const feedView = res.data.feeds[i]
              resolved.set(feedView.uri, hydrateFeedGenerator(feedView))
            }
          })
      }

      // Get all lists. This currently has to be done individually.
      const pinnedLists = pinnedItems.filter(feed => feed.type === 'list')
      const listsPromises = pinnedLists.map(list =>
        agent.app.sonet.graph
          .getList({
            list: list.value,
            limit: 1,
          })
          .then(res => {
            const listView = res.data.list
            resolved.set(listView.uri, hydrateList(listView))
          }),
      )

      await feedsPromise // Fail the whole query if it fails.
      await Promise.allSettled(listsPromises) // Ignore individual failing ones.

      // order the feeds/lists in the order they were pinned
      const result: SavedFeedSourceInfo[] = []
      for (let pinnedItem of pinnedItems) {
        const feedInfo = resolved.get(pinnedItem.value)
        if (feedInfo) {
          result.push({
            ...feedInfo,
            savedFeed: pinnedItem,
          })
        } else if (pinnedItem.type === 'timeline') {
          result.push({
            type: 'feed',
            displayName: 'Following',
            uri: pinnedItem.value,
            feedDescriptor: 'following',
            route: {
              href: '/',
              name: 'Home',
              params: {},
            },
            cid: '',
            avatar: '',
            description: new string({text: ''}),
            creatorDid: '',
            creatorUsername: '',
            likeCount: 0,
            likeUri: '',
            savedFeed: pinnedItem,
            contentMode: undefined,
          })
        }
      }
      return result
    },
  })
}

export type SavedFeedItem =
  | {
      type: 'feed'
      config: SonetSavedFeed
      view: SonetFeedGenerator
    }
  | {
      type: 'list'
      config: SonetSavedFeed
      view: SonetListView
    }
  | {
      type: 'timeline'
      config: SonetSavedFeed
      view: undefined
    }

export function useSavedFeeds() {
  const agent = useAgent()
  const {data: preferences, isLoading: isLoadingPrefs} = usePreferencesQuery()
  const savedItems = preferences?.savedFeeds ?? []
  const queryClient = useQueryClient()

  return useQuery({
    staleTime: STALE.INFINITY,
    enabled: !isLoadingPrefs,
    queryKey: [pinnedFeedInfosQueryKeyRoot, ...savedItems],
    placeholderData: previousData => {
      return (
        previousData || {
          // The likely count before we try to resolve them.
          count: savedItems.length,
          feeds: [],
        }
      )
    },
    queryFn: async () => {
      const resolvedFeeds = new Map<string, SonetFeedGenerator>()
      const resolvedLists = new Map<string, SonetListView>()

      const savedFeeds = savedItems.filter(feed => feed.type === 'feed')
      const savedLists = savedItems.filter(feed => feed.type === 'list')

      let feedsPromise = Promise.resolve()
      if (savedFeeds.length > 0) {
        feedsPromise = agent.app.sonet.feed
          .getFeedGenerators({
            feeds: savedFeeds.map(f => f.value),
          })
          .then(res => {
            res.data.feeds.forEach(f => {
              resolvedFeeds.set(f.uri, f)
            })
          })
      }

      const listsPromises = savedLists.map(list =>
        agent.app.sonet.graph
          .getList({
            list: list.value,
            limit: 1,
          })
          .then(res => {
            const listView = res.data.list
            resolvedLists.set(listView.uri, listView)
          }),
      )

      await Promise.allSettled([feedsPromise, ...listsPromises])

      resolvedFeeds.forEach(feed => {
        const hydratedFeed = hydrateFeedGenerator(feed)
        precacheFeed(queryClient, hydratedFeed)
      })
      resolvedLists.forEach(list => {
        precacheList(queryClient, list)
      })

      const result: SavedFeedItem[] = []
      for (let savedItem of savedItems) {
        if (savedItem.type === 'timeline') {
          result.push({
            type: 'timeline',
            config: savedItem,
            view: undefined,
          })
        } else if (savedItem.type === 'feed') {
          const resolvedFeed = resolvedFeeds.get(savedItem.value)
          if (resolvedFeed) {
            result.push({
              type: 'feed',
              config: savedItem,
              view: resolvedFeed,
            })
          }
        } else if (savedItem.type === 'list') {
          const resolvedList = resolvedLists.get(savedItem.value)
          if (resolvedList) {
            result.push({
              type: 'list',
              config: savedItem,
              view: resolvedList,
            })
          }
        }
      }

      return {
        // By this point we know the real count.
        count: result.length,
        feeds: result,
      }
    },
  })
}

function precacheFeed(queryClient: QueryClient, hydratedFeed: FeedSourceInfo) {
  precacheResolvedUri(
    queryClient,
    hydratedFeed.creatorUsername,
    hydratedFeed.creatorDid,
  )
  queryClient.setQueryData<FeedSourceInfo>(
    feedSourceInfoQueryKey({uri: hydratedFeed.uri}),
    hydratedFeed,
  )
}

export function precacheList(
  queryClient: QueryClient,
  list: SonetListView,
) {
  precacheResolvedUri(queryClient, list.creator.username, list.creator.userId)
  queryClient.setQueryData<SonetListView>(
    listQueryKey(list.uri),
    list,
  )
}

export function precacheFeedFromGeneratorView(
  queryClient: QueryClient,
  view: SonetFeedGenerator,
) {
  const hydratedFeed = hydrateFeedGenerator(view)
  precacheFeed(queryClient, hydratedFeed)
}
