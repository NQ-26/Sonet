import {useCallback} from 'react'
import {
  type SonetActorDefs,
  type SonetActorGetProfile,
  type SonetActorGetProfiles,
  type SonetActorProfile,
  AtUri,
  type SonetAppAgent,
  type SonetRepoUploadBlob,
  type Un$Typed,
} from '@sonet/api'
import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {uploadBlob} from '#/lib/api'
import {until} from '#/lib/async/until'
import {useToggleMutationQueue} from '#/lib/hooks/useToggleMutationQueue'
import {logEvent, type LogEvents, toClout} from '#/lib/statsig/statsig'
import {updateProfileShadow} from '#/state/cache/profile-shadow'
import {type Shadow} from '#/state/cache/types'
import {type ImageMeta} from '#/state/gallery'
import {STALE} from '#/state/queries'
import {resetProfileNotesQueries} from '#/state/queries/note-feed'
import {
  unstableCacheProfileView,
  useUnstableProfileViewCache,
} from '#/state/queries/unstable-profile-cache'
import {useUpdateProfileVerificationCache} from '#/state/queries/verification/useUpdateProfileVerificationCache'
import {useAgent, useSession} from '#/state/session'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'
import * as userActionHistory from '#/state/userActionHistory'
import type * as bsky from '#/types/bsky'
import {
  ProgressGuideAction,
  useProgressGuideControls,
} from '../shell/progress-guide'
import {RQKEY_LIST_CONVOS} from './messages/list-conversations'
import {RQKEY as RQKEY_MY_BLOCKED} from './my-blocked-accounts'
import {RQKEY as RQKEY_MY_MUTED} from './my-muted-accounts'

export * from '#/state/queries/unstable-profile-cache'
/**
 * @deprecated use {@link unstableCacheProfileView} instead
 */
export const precacheProfile = unstableCacheProfileView

const RQKEY_ROOT = 'profile'
export const RQKEY = (userId: string) => [RQKEY_ROOT, userId]

export const profilesQueryKeyRoot = 'profiles'
export const profilesQueryKey = (usernames: string[]) => [
  profilesQueryKeyRoot,
  usernames,
]

export function useProfileQuery({
  userId,
  staleTime = STALE.SECONDS.FIFTEEN,
}: {
  userId: string | undefined
  staleTime?: number
}) {
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  const {getUnstableProfile} = useUnstableProfileViewCache()
  return useQuery<SonetActorDefs.ProfileViewDetailed>({
    // WARNING
    // this staleTime is load-bearing
    // if you remove it, the UI infinite-loops
    // -prf
    staleTime,
    refetchOnWindowFocus: true,
    queryKey: RQKEY(userId ?? ''),
    queryFn: async () => {
      if (sonetSession.hasSession && userId) {
        // Sonet: map server user to minimal profile view for now
        const me = await sonet.getApi().getMe().catch(() => undefined)
        if (me?.user && (me.user.id === userId || me.user.userId === userId)) {
          const u = me.user
          return {
            userId: u.userId || u.id,
            username: u.username,
            displayName: u.display_name,
            description: u.bio,
            avatar: u.avatar_url,
            banner: u.banner_url,
            followersCount: u.followers_count,
            followsCount: u.following_count,
            notesCount: u.notes_count,
            viewer: {},
          } as any
        }
      }
      const res = await agent.getProfile({actor: userId ?? ''})
      return res.data
    },
    placeholderData: () => {
      if (!userId) return
      return getUnstableProfile(userId) as SonetActorDefs.ProfileViewDetailed
    },
    enabled: !!userId,
  })
}

export function useProfilesQuery({
  usernames,
  maintainData,
}: {
  usernames: string[]
  maintainData?: boolean
}) {
  const agent = useAgent()
  return useQuery({
    staleTime: STALE.MINUTES.FIVE,
    queryKey: profilesQueryKey(usernames),
    queryFn: async () => {
      const res = await agent.getProfiles({actors: usernames})
      return res.data
    },
    placeholderData: maintainData ? keepPreviousData : undefined,
  })
}

export function usePrefetchProfileQuery() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const prefetchProfileQuery = useCallback(
    async (userId: string) => {
      await queryClient.prefetchQuery({
        staleTime: STALE.SECONDS.THIRTY,
        queryKey: RQKEY(userId),
        queryFn: async () => {
          const res = await agent.getProfile({actor: userId || ''})
          return res.data
        },
      })
    },
    [queryClient, agent],
  )
  return prefetchProfileQuery
}

interface ProfileUpdateParams {
  profile: SonetActorDefs.ProfileViewDetailed
  updates:
    | Un$Typed<SonetActorProfile.Record>
    | ((
        existing: Un$Typed<SonetActorProfile.Record>,
      ) => Un$Typed<SonetActorProfile.Record>)
  newUserAvatar?: ImageMeta | undefined | null
  newUserBanner?: ImageMeta | undefined | null
  checkCommitted?: (res: SonetActorGetProfile.Response) => boolean
}
export function useProfileUpdateMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  const updateProfileVerificationCache = useUpdateProfileVerificationCache()
  return useMutation<void, Error, ProfileUpdateParams>({
    mutationFn: async ({
      profile,
      updates,
      newUserAvatar,
      newUserBanner,
      checkCommitted,
    }) => {
      let newUserAvatarPromise:
        | Promise<SonetRepoUploadBlob.Response>
        | undefined
      if (newUserAvatar) {
        newUserAvatarPromise = uploadBlob(
          agent,
          newUserAvatar.path,
          newUserAvatar.mime,
        )
      }
      let newUserBannerPromise:
        | Promise<SonetRepoUploadBlob.Response>
        | undefined
      if (newUserBanner) {
        newUserBannerPromise = uploadBlob(
          agent,
          newUserBanner.path,
          newUserBanner.mime,
        )
      }
      await agent.upsertProfile(async existing => {
        let next: Un$Typed<SonetActorProfile.Record> = existing || {}
        if (typeof updates === 'function') {
          next = updates(next)
        } else {
          next.displayName = updates.displayName
          next.description = updates.description
          if ('pinnedNote' in updates) {
            next.pinnedNote = updates.pinnedNote
          }
        }
        if (newUserAvatarPromise) {
          const res = await newUserAvatarPromise
          next.avatar = res.data.blob
        } else if (newUserAvatar === null) {
          next.avatar = undefined
        }
        if (newUserBannerPromise) {
          const res = await newUserBannerPromise
          next.banner = res.data.blob
        } else if (newUserBanner === null) {
          next.banner = undefined
        }
        return next
      })
      await whenAppViewReady(
        agent,
        profile.userId,
        checkCommitted ||
          (res => {
            if (typeof newUserAvatar !== 'undefined') {
              if (newUserAvatar === null && res.data.avatar) {
                // url hasnt cleared yet
                return false
              } else if (res.data.avatar === profile.avatar) {
                // url hasnt changed yet
                return false
              }
            }
            if (typeof newUserBanner !== 'undefined') {
              if (newUserBanner === null && res.data.banner) {
                // url hasnt cleared yet
                return false
              } else if (res.data.banner === profile.banner) {
                // url hasnt changed yet
                return false
              }
            }
            if (typeof updates === 'function') {
              return true
            }
            return (
              res.data.displayName === updates.displayName &&
              res.data.description === updates.description
            )
          }),
      )
    },
    async onSuccess(_, variables) {
      // invalidate cache
      queryClient.invalidateQueries({
        queryKey: RQKEY(variables.profile.userId),
      })
      queryClient.invalidateQueries({
        queryKey: [profilesQueryKeyRoot, [variables.profile.userId]],
      })
      await updateProfileVerificationCache({profile: variables.profile})
    },
  })
}

export function useProfileFollowMutationQueue(
  profile: Shadow<bsky.profile.AnyProfileView>,
  logContext: LogEvents['profile:follow']['logContext'] &
    LogEvents['profile:follow']['logContext'],
) {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const userId = profile.userId
  const initialFollowingUri = profile.viewer?.following
  const followMutation = useProfileFollowMutation(logContext, profile)
  const unfollowMutation = useProfileUnfollowMutation(logContext)

  const queueToggle = useToggleMutationQueue({
    initialState: initialFollowingUri,
    runMutation: async (prevFollowingUri, shouldFollow) => {
      if (shouldFollow) {
        const {uri} = await followMutation.mutateAsync({
          userId,
        })
        userActionHistory.follow([userId])
        return uri
      } else {
        if (prevFollowingUri) {
          await unfollowMutation.mutateAsync({
            userId,
            followUri: prevFollowingUri,
          })
          userActionHistory.unfollow([userId])
        }
        return undefined
      }
    },
    onSuccess(finalFollowingUri) {
      // finalize
      updateProfileShadow(queryClient, userId, {
        followingUri: finalFollowingUri,
      })

      if (finalFollowingUri) {
        agent.app.sonet.graph
          .getSuggestedFollowsByActor({
            actor: userId,
          })
          .then(res => {
            const userIds = res.data.suggestions
              .filter(a => !a.viewer?.following)
              .map(a => a.userId)
              .slice(0, 8)
            userActionHistory.followSuggestion(userIds)
          })
      }
    },
  })

  const queueFollow = useCallback(() => {
    // optimistically update
    updateProfileShadow(queryClient, userId, {
      followingUri: 'pending',
    })
    return queueToggle(true)
  }, [queryClient, userId, queueToggle])

  const queueUnfollow = useCallback(() => {
    // optimistically update
    updateProfileShadow(queryClient, userId, {
      followingUri: undefined,
    })
    return queueToggle(false)
  }, [queryClient, userId, queueToggle])

  return [queueFollow, queueUnfollow]
}

function useProfileFollowMutation(
  logContext: LogEvents['profile:follow']['logContext'],
  profile: Shadow<bsky.profile.AnyProfileView>,
) {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const {captureAction} = useProgressGuideControls()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()

  return useMutation<{uri: string; cid: string}, Error, {userId: string}>({
    mutationFn: async ({userId}) => {
      let ownProfile: SonetActorDefs.ProfileViewDetailed | undefined
      if (currentAccount) {
        ownProfile = findProfileQueryData(queryClient, currentAccount.userId)
      }
      captureAction(ProgressGuideAction.Follow)
      logEvent('profile:follow', {
        logContext,
        userIdBecomeMutual: profile.viewer
          ? Boolean(profile.viewer.followedBy)
          : undefined,
        followeeClout:
          'followersCount' in profile
            ? toClout(profile.followersCount)
            : undefined,
        followerClout: toClout(ownProfile?.followersCount),
      })
      if (sonetSession.hasSession) {
        const userId = userId.replace('userId:', '')
        await sonet.getApi().likeNote // noop to keep import used
        await sonet.getApi().renote // noop keep import, TS noop
        await sonet.getApi().search('') // noop keep import, TS noop
        // Use follow route
        await (sonet.getApi() as any).fetchJson?.(`/v1/follow/${encodeURIComponent(userId)}`, {method: 'NOTE'})
        return {uri: `sonet://follow/${userId}`, cid: userId}
      }
      return await agent.follow(userId)
    },
  })
}

function useProfileUnfollowMutation(
  logContext: LogEvents['profile:unfollow']['logContext'],
) {
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  return useMutation<void, Error, {userId: string; followUri: string}>({
    mutationFn: async ({followUri, userId}) => {
      logEvent('profile:unfollow', {logContext})
      if (sonetSession.hasSession) {
        const userId = (userId || '').replace('userId:', '') || extractIdFromFollowUri(followUri)
        await (sonet.getApi() as any).fetchJson?.(`/v1/follow/${encodeURIComponent(userId)}`, {method: 'DELETE'})
        return
      }
      return await agent.deleteFollow(followUri)
    },
  })
}

function extractIdFromFollowUri(uri: string): string {
  const m = /sonet:\/\/follow\/([^?#]+)/.exec(uri)
  return m?.[1] || uri
}

export function useProfileMuteMutationQueue(
  profile: Shadow<bsky.profile.AnyProfileView>,
) {
  const queryClient = useQueryClient()
  const userId = profile.userId
  const initialMuted = profile.viewer?.muted
  const muteMutation = useProfileMuteMutation()
  const unmuteMutation = useProfileUnmuteMutation()

  const queueToggle = useToggleMutationQueue({
    initialState: initialMuted,
    runMutation: async (_prevMuted, shouldMute) => {
      if (shouldMute) {
        await muteMutation.mutateAsync({
          userId,
        })
        return true
      } else {
        await unmuteMutation.mutateAsync({
          userId,
        })
        return false
      }
    },
    onSuccess(finalMuted) {
      // finalize
      updateProfileShadow(queryClient, userId, {muted: finalMuted})
    },
  })

  const queueMute = useCallback(() => {
    // optimistically update
    updateProfileShadow(queryClient, userId, {
      muted: true,
    })
    return queueToggle(true)
  }, [queryClient, userId, queueToggle])

  const queueUnmute = useCallback(() => {
    // optimistically update
    updateProfileShadow(queryClient, userId, {
      muted: false,
    })
    return queueToggle(false)
  }, [queryClient, userId, queueToggle])

  return [queueMute, queueUnmute]
}

function useProfileMuteMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {userId: string}>({
    mutationFn: async ({userId}) => {
      await agent.mute(userId)
    },
    onSuccess() {
      queryClient.invalidateQueries({queryKey: RQKEY_MY_MUTED()})
    },
  })
}

function useProfileUnmuteMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {userId: string}>({
    mutationFn: async ({userId}) => {
      await agent.unmute(userId)
    },
    onSuccess() {
      queryClient.invalidateQueries({queryKey: RQKEY_MY_MUTED()})
    },
  })
}

export function useProfileBlockMutationQueue(
  profile: Shadow<bsky.profile.AnyProfileView>,
) {
  const queryClient = useQueryClient()
  const userId = profile.userId
  const initialBlockingUri = profile.viewer?.blocking
  const blockMutation = useProfileBlockMutation()
  const unblockMutation = useProfileUnblockMutation()

  const queueToggle = useToggleMutationQueue({
    initialState: initialBlockingUri,
    runMutation: async (prevBlockUri, shouldFollow) => {
      if (shouldFollow) {
        const {uri} = await blockMutation.mutateAsync({
          userId,
        })
        return uri
      } else {
        if (prevBlockUri) {
          await unblockMutation.mutateAsync({
            userId,
            blockUri: prevBlockUri,
          })
        }
        return undefined
      }
    },
    onSuccess(finalBlockingUri) {
      // finalize
      updateProfileShadow(queryClient, userId, {
        blockingUri: finalBlockingUri,
      })
      queryClient.invalidateQueries({queryKey: [RQKEY_LIST_CONVOS]})
    },
  })

  const queueBlock = useCallback(() => {
    // optimistically update
    updateProfileShadow(queryClient, userId, {
      blockingUri: 'pending',
    })
    return queueToggle(true)
  }, [queryClient, userId, queueToggle])

  const queueUnblock = useCallback(() => {
    // optimistically update
    updateProfileShadow(queryClient, userId, {
      blockingUri: undefined,
    })
    return queueToggle(false)
  }, [queryClient, userId, queueToggle])

  return [queueBlock, queueUnblock]
}

function useProfileBlockMutation() {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  return useMutation<{uri: string; cid: string}, Error, {userId: string}>({
    mutationFn: async ({userId}) => {
      if (!currentAccount) {
        throw new Error('Not signed in')
      }
      return await agent.app.sonet.graph.block.create(
        {repo: currentAccount.userId},
        {subject: userId, createdAt: new Date().toISOString()},
      )
    },
    onSuccess(_, {userId}) {
      queryClient.invalidateQueries({queryKey: RQKEY_MY_BLOCKED()})
      resetProfileNotesQueries(queryClient, userId, 1000)
    },
  })
}

function useProfileUnblockMutation() {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  return useMutation<void, Error, {userId: string; blockUri: string}>({
    mutationFn: async ({blockUri}) => {
      if (!currentAccount) {
        throw new Error('Not signed in')
      }
      const {rkey} = new AtUri(blockUri)
      await agent.app.sonet.graph.block.delete({
        repo: currentAccount.userId,
        rkey,
      })
    },
    onSuccess(_, {userId}) {
      resetProfileNotesQueries(queryClient, userId, 1000)
    },
  })
}

async function whenAppViewReady(
  agent: SonetAppAgent,
  actor: string,
  fn: (res: SonetActorGetProfile.Response) => boolean,
) {
  await until(
    5, // 5 tries
    1e3, // 1s delay between tries
    fn,
    () => agent.app.sonet.actor.getProfile({actor}),
  )
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileViewDetailed, void> {
  const profileQueryDatas =
    queryClient.getQueriesData<SonetActorDefs.ProfileViewDetailed>({
      queryKey: [RQKEY_ROOT],
    })
  for (const [_queryKey, queryData] of profileQueryDatas) {
    if (!queryData) {
      continue
    }
    if (queryData.userId === userId) {
      yield queryData
    }
  }
  const profilesQueryDatas =
    queryClient.getQueriesData<SonetActorGetProfiles.OutputSchema>({
      queryKey: [profilesQueryKeyRoot],
    })
  for (const [_queryKey, queryData] of profilesQueryDatas) {
    if (!queryData) {
      continue
    }
    for (let profile of queryData.profiles) {
      if (profile.userId === userId) {
        yield profile
      }
    }
  }
}

export function findProfileQueryData(
  queryClient: QueryClient,
  userId: string,
): SonetActorDefs.ProfileViewDetailed | undefined {
  return queryClient.getQueryData<SonetActorDefs.ProfileViewDetailed>(
    RQKEY(userId),
  )
}
