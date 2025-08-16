import React from 'react'
import {View} from 'react-native'
import {findNodeUsername} from '#/shims/findNodeUsername'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {isIOS, isNative} from '#/platform/detection'
import {type FeedDescriptor} from '#/state/queries/note-feed'
import {RQKEY as FEED_RQKEY} from '#/state/queries/note-feed'
import {truncateAndInvalidate} from '#/state/queries/util'
import {NoteFeed} from '#/view/com/notes/NoteFeed'
import {EmptyState} from '#/view/com/util/EmptyState'
import {type ListRef} from '#/view/com/util/List'
import {LoadLatestBtn} from '#/view/com/util/load-latest/LoadLatestBtn'
import {atoms as a, ios, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {type SectionRef} from './types'

interface FeedSectionProps {
  feed: FeedDescriptor
  headerHeight: number
  isFocused: boolean
  scrollElRef: ListRef
  ignoreFilterFor?: string
  setScrollViewTag: (tag: number | null) => void
}
export const ProfileFeedSection = React.forwardRef<
  SectionRef,
  FeedSectionProps
>(function FeedSectionImpl(
  {
    feed,
    headerHeight,
    isFocused,
    scrollElRef,
    ignoreFilterFor,
    setScrollViewTag,
  },
  ref,
) {
  const {_} = useLingui()
  const queryClient = useQueryClient()
  const [hasNew, setHasNew] = React.useState(false)
  const [isScrolledDown, setIsScrolledDown] = React.useState(false)
  const shouldUseAdjustedNumToRender = feed.endsWith('notes_and_author_threads')
  const isVideoFeed = isNative && feed.endsWith('notes_with_video')
  const adjustedInitialNumToRender = useInitialNumToRender({
    screenHeightOffset: headerHeight,
  })

  const onScrollToTop = React.useCallback(() => {
    scrollElRef.current?.scrollToOffset({
      animated: isNative,
      offset: -headerHeight,
    })
    truncateAndInvalidate(queryClient, FEED_RQKEY(feed))
    setHasNew(false)
  }, [scrollElRef, headerHeight, queryClient, feed, setHasNew])

  React.useImperativeUsername(ref, () => ({
    scrollToTop: onScrollToTop,
  }))

  const renderNotesEmpty = React.useCallback(() => {
    return <EmptyState icon="growth" message={_(msg`No notes yet.`)} />
  }, [_])

  React.useEffect(() => {
    if (isIOS && isFocused && scrollElRef.current) {
      const nativeTag = findNodeUsername(scrollElRef.current)
      setScrollViewTag(nativeTag)
    }
  }, [isFocused, scrollElRef, setScrollViewTag])

  return (
    <View>
      <NoteFeed
        testID="notesFeed"
        enabled={isFocused}
        feed={feed}
        scrollElRef={scrollElRef}
        onHasNew={setHasNew}
        onScrolledDownChange={setIsScrolledDown}
        renderEmptyState={renderNotesEmpty}
        headerOffset={headerHeight}
        progressViewOffset={ios(0)}
        renderEndOfFeed={isVideoFeed ? undefined : ProfileEndOfFeed}
        ignoreFilterFor={ignoreFilterFor}
        initialNumToRender={
          shouldUseAdjustedNumToRender ? adjustedInitialNumToRender : undefined
        }
        isVideoFeed={isVideoFeed}
      />
      {(isScrolledDown || hasNew) && (
        <LoadLatestBtn
          onPress={onScrollToTop}
          label={_(msg`Load new notes`)}
          showIndicator={hasNew}
        />
      )}
    </View>
  )
})

function ProfileEndOfFeed() {
  const t = useTheme()

  return (
    <View
      style={[a.w_full, a.py_5xl, a.border_t, t.atoms.border_contrast_medium]}>
      <Text style={[t.atoms.text_contrast_medium, a.text_center]}>
        <Trans>End of feed</Trans>
      </Text>
    </View>
  )
}
