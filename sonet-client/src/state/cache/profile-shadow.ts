import {useEffect, useMemo, useState} from 'react'
import {type SonetActorDefs, type SonetNotificationDefs} from '@sonet/api'
import {type QueryClient} from '@tanstack/react-query'
import EventEmitter from 'eventemitter3'

import {batchedUpdates} from '#/lib/batchedUpdates'
import {findAllProfilesInQueryData as findAllProfilesInActivitySubscriptionsQueryData} from '#/state/queries/activity-subscriptions'
import {findAllProfilesInQueryData as findAllProfilesInActorSearchQueryData} from '#/state/queries/actor-search'
import {findAllProfilesInQueryData as findAllProfilesInExploreFeedPreviewsQueryData} from '#/state/queries/explore-feed-previews'
import {findAllProfilesInQueryData as findAllProfilesInKnownFollowersQueryData} from '#/state/queries/known-followers'
import {findAllProfilesInQueryData as findAllProfilesInListMembersQueryData} from '#/state/queries/list-members'
import {findAllProfilesInListConvosQueryData} from '#/state/queries/messages/list-conversations'
import {findAllProfilesInQueryData as findAllProfilesInMyBlockedAccountsQueryData} from '#/state/queries/my-blocked-accounts'
import {findAllProfilesInQueryData as findAllProfilesInMyMutedAccountsQueryData} from '#/state/queries/my-muted-accounts'
import {findAllProfilesInQueryData as findAllProfilesInFeedsQueryData} from '#/state/queries/note-feed'
import {findAllProfilesInQueryData as findAllProfilesInNoteLikedByQueryData} from '#/state/queries/note-liked-by'
import {findAllProfilesInQueryData as findAllProfilesInNoteQuotesQueryData} from '#/state/queries/note-quotes'
import {findAllProfilesInQueryData as findAllProfilesInNoteRenoteedByQueryData} from '#/state/queries/note-renoteed-by'
import {findAllProfilesInQueryData as findAllProfilesInNoteThreadQueryData} from '#/state/queries/note-thread'
import {findAllProfilesInQueryData as findAllProfilesInProfileQueryData} from '#/state/queries/profile'
import {findAllProfilesInQueryData as findAllProfilesInProfileFollowersQueryData} from '#/state/queries/profile-followers'
import {findAllProfilesInQueryData as findAllProfilesInProfileFollowsQueryData} from '#/state/queries/profile-follows'
import {findAllProfilesInQueryData as findAllProfilesInSuggestedFollowsQueryData} from '#/state/queries/suggested-follows'
import {findAllProfilesInQueryData as findAllProfilesInSuggestedUsersQueryData} from '#/state/queries/trending/useGetSuggestedUsersQuery'
import {findAllProfilesInQueryData as findAllProfilesInNoteThreadV2QueryData} from '#/state/queries/useNoteThread/queryCache'
import type * as bsky from '#/types/bsky'
import {castAsShadow, type Shadow} from './types'

export type {Shadow} from './types'

export interface ProfileShadow {
  followingUri: string | undefined
  muted: boolean | undefined
  blockingUri: string | undefined
  verification: SonetActorDefs.VerificationState
  status: SonetActorDefs.StatusView | undefined
  activitySubscription: SonetNotificationDefs.ActivitySubscription | undefined
}

const shadows: WeakMap<
  bsky.profile.AnyProfileView,
  Partial<ProfileShadow>
> = new WeakMap()
const emitter = new EventEmitter()

export function useProfileShadow<
  TProfileView extends bsky.profile.AnyProfileView,
>(profile: TProfileView): Shadow<TProfileView> {
  const [shadow, setShadow] = useState(() => shadows.get(profile))
  const [prevNote, setPrevNote] = useState(profile)
  if (profile !== prevNote) {
    setPrevNote(profile)
    setShadow(shadows.get(profile))
  }

  useEffect(() => {
    function onUpdate() {
      setShadow(shadows.get(profile))
    }
    emitter.addListener(profile.userId, onUpdate)
    return () => {
      emitter.removeListener(profile.userId, onUpdate)
    }
  }, [profile])

  return useMemo(() => {
    if (shadow) {
      return mergeShadow(profile, shadow)
    } else {
      return castAsShadow(profile)
    }
  }, [profile, shadow])
}

/**
 * Same as useProfileShadow, but allows for the profile to be undefined.
 * This is useful for when the profile is not guaranteed to be loaded yet.
 */
export function useMaybeProfileShadow<
  TProfileView extends bsky.profile.AnyProfileView,
>(profile?: TProfileView): Shadow<TProfileView> | undefined {
  const [shadow, setShadow] = useState(() =>
    profile ? shadows.get(profile) : undefined,
  )
  const [prevNote, setPrevNote] = useState(profile)
  if (profile !== prevNote) {
    setPrevNote(profile)
    setShadow(profile ? shadows.get(profile) : undefined)
  }

  useEffect(() => {
    if (!profile) return
    function onUpdate() {
      if (!profile) return
      setShadow(shadows.get(profile))
    }
    emitter.addListener(profile.userId, onUpdate)
    return () => {
      emitter.removeListener(profile.userId, onUpdate)
    }
  }, [profile])

  return useMemo(() => {
    if (!profile) return undefined
    if (shadow) {
      return mergeShadow(profile, shadow)
    } else {
      return castAsShadow(profile)
    }
  }, [profile, shadow])
}

export function updateProfileShadow(
  queryClient: QueryClient,
  userId: string,
  value: Partial<ProfileShadow>,
) {
  const cachedProfiles = findProfilesInCache(queryClient, userId)
  for (let profile of cachedProfiles) {
    shadows.set(profile, {...shadows.get(profile), ...value})
  }
  batchedUpdates(() => {
    emitter.emit(userId, value)
  })
}

function mergeShadow<TProfileView extends bsky.profile.AnyProfileView>(
  profile: TProfileView,
  shadow: Partial<ProfileShadow>,
): Shadow<TProfileView> {
  return castAsShadow({
    ...profile,
    viewer: {
      ...(profile.viewer || {}),
      following:
        'followingUri' in shadow
          ? shadow.followingUri
          : profile.viewer?.following,
      muted: 'muted' in shadow ? shadow.muted : profile.viewer?.muted,
      blocking:
        'blockingUri' in shadow ? shadow.blockingUri : profile.viewer?.blocking,
      activitySubscription:
        'activitySubscription' in shadow
          ? shadow.activitySubscription
          : profile.viewer?.activitySubscription,
    },
    verification:
      'verification' in shadow ? shadow.verification : profile.verification,
    status:
      'status' in shadow
        ? shadow.status
        : 'status' in profile
          ? profile.status
          : undefined,
  })
}

function* findProfilesInCache(
  queryClient: QueryClient,
  userId: string,
): Generator<bsky.profile.AnyProfileView, void> {
  yield* findAllProfilesInListMembersQueryData(queryClient, userId)
  yield* findAllProfilesInMyBlockedAccountsQueryData(queryClient, userId)
  yield* findAllProfilesInMyMutedAccountsQueryData(queryClient, userId)
  yield* findAllProfilesInNoteLikedByQueryData(queryClient, userId)
  yield* findAllProfilesInNoteRenoteedByQueryData(queryClient, userId)
  yield* findAllProfilesInNoteQuotesQueryData(queryClient, userId)
  yield* findAllProfilesInProfileQueryData(queryClient, userId)
  yield* findAllProfilesInProfileFollowersQueryData(queryClient, userId)
  yield* findAllProfilesInProfileFollowsQueryData(queryClient, userId)
  yield* findAllProfilesInSuggestedUsersQueryData(queryClient, userId)
  yield* findAllProfilesInSuggestedFollowsQueryData(queryClient, userId)
  yield* findAllProfilesInActorSearchQueryData(queryClient, userId)
  yield* findAllProfilesInListConvosQueryData(queryClient, userId)
  yield* findAllProfilesInFeedsQueryData(queryClient, userId)
  yield* findAllProfilesInNoteThreadQueryData(queryClient, userId)
  yield* findAllProfilesInNoteThreadV2QueryData(queryClient, userId)
  yield* findAllProfilesInKnownFollowersQueryData(queryClient, userId)
  yield* findAllProfilesInExploreFeedPreviewsQueryData(queryClient, userId)
  yield* findAllProfilesInActivitySubscriptionsQueryData(queryClient, userId)
}
