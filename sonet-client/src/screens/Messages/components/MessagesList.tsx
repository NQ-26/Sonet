import {useCallback, useEffect, useRef, useState} from 'react'
import {type LayoutChangeEvent, View} from 'react-native'
import {useKeyboardHandler} from 'react-native-keyboard-controller'
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import {type ReanimatedScrollEvent} from '#/shims/react-native-reanimated-types'
// AT Protocol removed - using Sonet messaging

import {useHideBottomBarBorderForScreen} from '#/lib/hooks/useHideBottomBarBorder'
import {ScrollProvider} from '#/lib/ScrollContext'
import {shortenLinks, stripInvalidMentions} from '#/lib/strings/rich-text-manip'
import {
  convertBskyAppUrlIfNeeded,
  isBskyNoteUrl,
} from '#/lib/strings/url-helpers'
import {logger} from '#/logger'
import {isNative} from '#/platform/detection'
import {isWeb} from '#/platform/detection'
// AT Protocol removed - using Sonet messaging
import {useUnifiedConvoState} from '#/state/messages/hybrid-provider'
import {useGetNote} from '#/state/queries/note'
import {useAgent} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {
  EmojiPicker,
  type EmojiPickerState,
} from '#/view/com/composer/text-input/web/EmojiPicker'
import {List, type ListMethods} from '#/view/com/util/List'
import {SonetChatDisabled} from '#/screens/Messages/components/SonetChatDisabled'
import {SonetMessageInput} from '#/screens/Messages/components/SonetMessageInput'
import {MessageListError} from '#/screens/Messages/components/MessageListError'
import {SonetChatEmptyPill} from '#/components/dms/SonetChatEmptyPill'
import {MessageItem} from '#/components/dms/MessageItem'
import {NewMessagesPill} from '#/components/dms/NewMessagesPill'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {SonetChatStatusInfo} from '#/components/dms/SonetChatStatusInfo'
import {MessageInputEmbed, useMessageEmbed} from './MessageInputEmbed'
import {SonetMessageItem} from '#/components/dms/SonetMessageItem'
import {SonetTypingIndicator} from '#/components/dms/SonetTypingIndicator'
import {SonetSystemMessage} from '#/components/dms/SonetSystemMessage'
// AT Protocol removed - using Sonet messaging

function MaybeLoader({isLoading}: {isLoading: boolean}) {
  return (
    <View
      style={{
        height: 50,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {isLoading && <Loader size="xl" />}
    </View>
  )
}

function renderItem({item}: {item: any}) {
  // Username Sonet message types
  if (item.type === 'message') {
    return <SonetMessageItem message={item} isOwnMessage={item.senderId === 'current_user'} />
  } else if (item.type === 'typing') {
    return <SonetTypingIndicator isTyping={true} />
  } else if (item.type === 'system') {
    return <SonetSystemMessage content={item.content || ''} />
  }

  return null
}

function keyExtractor(item: any) {
  return item.id || item.key || `item_${Math.random()}`
}

function onScrollToIndexFailed() {
  // Placeholder function. You have to give FlatList something or else it will error.
}

export function MessagesList({
  hasScrolled,
  setHasScrolled,
  blocked,
  footer,
  hasAcceptOverride,
}: {
  hasScrolled: boolean
  setHasScrolled: React.Dispatch<React.SetStateAction<boolean>>
  blocked?: boolean
  footer?: React.ReactNode
  hasAcceptOverride?: boolean
}) {
  const state = useUnifiedConvoState()
  const agent = useAgent()
  const getNote = useGetNote()
  const {embedUri, setEmbed} = useMessageEmbed()

  useHideBottomBarBorderForScreen()

  const flatListRef = useAnimatedRef<ListMethods>()

  const [newMessagesPill, setNewMessagesPill] = useState({
    show: false,
    startContentOffset: 0,
  })

  const [emojiPickerState, setEmojiPickerState] = useState<EmojiPickerState>({
    isOpen: false,
    pos: {top: 0, left: 0, right: 0, bottom: 0, nextFocusRef: null},
  })

  // We need to keep track of when the scroll offset is at the bottom of the list to know when to scroll as new items
  // are added to the list. For example, if the user is scrolled up to 1iew older messages, we don't want to scroll to
  // the bottom.
  const isAtBottom = useSharedValue(true)

  // This will be used on web to assist in determining if we need to maintain the content offset
  const isAtTop = useSharedValue(true)

  // Used to keep track of the current content height. We'll need this in `onScroll` so we know when to start allowing
  // onStartReached to fire.
  const prevContentHeight = useRef(0)
  const prevItemCount = useRef(0)

  // -- Keep track of background state and positioning for new pill
  const layoutHeight = useSharedValue(0)
  const userIdBackground = useRef(false)
  useEffect(() => {
    if (state.status === 'ready' && !state.isConnected) {
      userIdBackground.current = true
    }
  }, [state.status, state.isConnected])

  // -- Scroll handling

  // Every time the content size changes, that means one of two things is happening:
  // 1. New messages are being added from the log or from a message you have sent
  // 2. Old messages are being prepended to the top
  //
  // The first time that the content size changes is when the initial items are rendered. Because we cannot rely on
  // `initialScrollIndex`, we need to immediately scroll to the bottom of the list. That scroll will not be animated.
  //
  // Subsequent resizes will only scroll to the bottom if the user is at the bottom of the list (within 100 pixels of
  // the bottom). Therefore, any new messages that come in or are sent will result in an animated scroll to end. However
  // we will not scroll whenever new items get prepended to the top.
  const onContentSizeChange = useCallback(
    (_: number, height: number) => {
      // Because web does not have `maintainVisibleContentPosition` support, we will need to manually scroll to the
      // previous off whenever we add new content to the previous offset whenever we add new content to the list.
      if (isWeb && isAtTop.get() && hasScrolled) {
        flatListRef.current?.scrollToOffset({
          offset: height - prevContentHeight.current,
          animated: false,
        })
      }

      // This number _must_ be the height of the MaybeLoader component
      if (height > 50 && isAtBottom.get()) {
        // If the size of the content is changing by more than the height of the screen, then we don't
        // want to scroll further than the start of all the new content. Since we are storing the previous offset,
        // we can just scroll the user to that offset and add a little bit of padding. We'll also show the pill
        // that can be pressed to immediately scroll to the end.
        if (
          userIdBackground.current &&
          hasScrolled &&
          height - prevContentHeight.current > layoutHeight.get() - 50 &&
          state.messages.length - prevItemCount.current > 1
        ) {
          flatListRef.current?.scrollToOffset({
            offset: prevContentHeight.current - 65,
            animated: true,
          })
          setNewMessagesPill({
            show: true,
            startContentOffset: prevContentHeight.current - 65,
          })
        } else {
          flatListRef.current?.scrollToOffset({
            offset: height,
            animated: hasScrolled && height > prevContentHeight.current,
          })

          // HACK Unfortunately, we need to call `setHasScrolled` after a brief delay,
          // because otherwise there is too much of a delay between the time the content
          // scrolls and the time the screen appears, causing a flicker.
          // We cannot actually use a synchronous scroll here, because `onContentSizeChange`
          // is actually async itself - all the info has to come across the bridge first.
          if (!hasScrolled && !state.isLoading) {
            setTimeout(() => {
              setHasScrolled(true)
            }, 100)
          }
        }
      }

      prevContentHeight.current = height
      prevItemCount.current = state.messages.length
      userIdBackground.current = false
    },
    [
      hasScrolled,
      setHasScrolled,
              state.isLoading,
              state.messages.length,
      // these are stable
      flatListRef,
      isAtTop,
      isAtBottom,
      layoutHeight,
    ],
  )

  const onStartReached = useCallback(() => {
    if (hasScrolled && prevContentHeight.current > layoutHeight.get()) {
      // Load more messages using Sonet API
      // This would typically call state.actions.loadMoreMessages()
    }
  }, [hasScrolled, layoutHeight])

  const onScroll = useCallback(
    (e: ReanimatedScrollEvent) => {
      'worklet'
      layoutHeight.set(e.layoutMeasurement.height)
      const bottomOffset = e.contentOffset.y + e.layoutMeasurement.height

      // Most apps have a little bit of space the user can scroll past while still automatically scrolling ot the bottom
      // when a new message is added, hence the 100 pixel offset
      isAtBottom.set(e.contentSize.height - 100 < bottomOffset)
      isAtTop.set(e.contentOffset.y <= 1)

      if (
        newMessagesPill.show &&
        (e.contentOffset.y > newMessagesPill.startContentOffset + 200 ||
          isAtBottom.get())
      ) {
        runOnJS(setNewMessagesPill)({
          show: false,
          startContentOffset: 0,
        })
      }
    },
    [layoutHeight, newMessagesPill, isAtBottom, isAtTop],
  )

  // -- Keyboard animation handling
  const {footerHeight} = useShellLayout()

  const keyboardHeight = useSharedValue(0)
  const keyboardIsOpening = useSharedValue(false)

  // In some cases - like when the emoji piker opens - we don't want to animate the scroll in the list onLayout event.
  // We use this value to keep track of when we want to disable the animation.
  const layoutScrollWithoutAnimation = useSharedValue(false)

  useKeyboardHandler(
    {
      onStart: e => {
        'worklet'
        // Immediate updates - like opening the emoji picker - will have a duration of zero. In those cases, we should
        // just update the height here instead of having the `onMove` event do it (that event will not fire!)
        if (e.duration === 0) {
          layoutScrollWithoutAnimation.set(true)
          keyboardHeight.set(e.height)
        } else {
          keyboardIsOpening.set(true)
        }
      },
      onMove: e => {
        'worklet'
        keyboardHeight.set(e.height)
        if (e.height > footerHeight.get()) {
          scrollTo(flatListRef, 0, 1e7, false)
        }
      },
      onEnd: e => {
        'worklet'
        keyboardHeight.set(e.height)
        if (e.height > footerHeight.get()) {
          scrollTo(flatListRef, 0, 1e7, false)
        }
        keyboardIsOpening.set(false)
      },
    },
    [footerHeight],
  )

  const animatedListStyle = useAnimatedStyle(() => ({
    marginBottom: Math.max(keyboardHeight.get(), footerHeight.get()),
  }))

  const animatedStickyViewStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: -Math.max(keyboardHeight.get(), footerHeight.get())},
    ],
  }))

  // -- Message sending
  const onSendMessage = useCallback(
    async (text: string) => {
      // Send message using Sonet API
      try {
        // This would typically call state.actions.sendMessage()
        console.log('Sending message:', text)
        
        // Username embeds and rich text processing for Sonet
        // This would be implemented based on Sonet's rich text capabilities

        if (!hasScrolled) {
          setHasScrolled(true)
        }
      } catch (error) {
        console.error('Failed to send message:', error)
      }
    },
    [hasScrolled, setHasScrolled],
  )

  // -- List layout changes (opening emoji keyboard, etc.)
  const onListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      layoutHeight.set(e.nativeEvent.layout.height)

      if (isWeb || !keyboardIsOpening.get()) {
        flatListRef.current?.scrollToEnd({
          animated: !layoutScrollWithoutAnimation.get(),
        })
        layoutScrollWithoutAnimation.set(false)
      }
    },
    [
      flatListRef,
      keyboardIsOpening,
      layoutScrollWithoutAnimation,
      layoutHeight,
    ],
  )

  const scrollToEndOnPress = useCallback(() => {
    flatListRef.current?.scrollToOffset({
      offset: prevContentHeight.current,
      animated: true,
    })
  }, [flatListRef])

  const onOpenEmojiPicker = useCallback((pos: any) => {
    setEmojiPickerState({isOpen: true, pos})
  }, [])

  return (
    <>
      {/* Custom scroll provider so that we can use the `onScroll` event in our custom List implementation */}
      <ScrollProvider onScroll={onScroll}>
        <List
          ref={flatListRef}
          data={state.messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          disableFullWindowScroll={true}
          disableVirtualization={true}
          style={animatedListStyle}
          // The extra two items account for the header and the footer components
          initialNumToRender={isNative ? 32 : 62}
          maxToRenderPerBatch={isWeb ? 32 : 62}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          removeClippedSubviews={false}
          sideBorders={false}
          onContentSizeChange={onContentSizeChange}
          onLayout={onListLayout}
          onStartReached={onStartReached}
          onScrollToIndexFailed={onScrollToIndexFailed}
          scrollEventThrottle={100}
          ListHeaderComponent={
            <MaybeLoader isLoading={state.isLoading} />
          }
        />
      </ScrollProvider>
      <Animated.View style={animatedStickyViewStyle}>
        {state.status === 'error' ? (
          <SonetChatDisabled />
        ) : blocked ? (
          footer
        ) : (
          <ConversationFooter
            state={state}
            hasAcceptOverride={hasAcceptOverride}>
            <SonetMessageInput
              onSendMessage={onSendMessage}
              disabled={false}
              isEncrypted={state.chat?.isEncrypted}
              encryptionStatus={state.encryptionStatus}
            />
          </ConversationFooter>
        )}
      </Animated.View>

      {isWeb && (
        <EmojiPicker
          pinToTop
          state={emojiPickerState}
          close={() => setEmojiPickerState(prev => ({...prev, isOpen: false}))}
        />
      )}

      {newMessagesPill.show && <NewMessagesPill onPress={scrollToEndOnPress} />}
    </>
  )
}

type FooterState = 'loading' | 'new-chat' | 'request' | 'standard'

function getFooterState(
  state: any,
  hasAcceptOverride?: boolean,
): FooterState {
  if (state.messages.length === 0) {
    if (state.isLoading) {
      return 'loading'
    } else {
      return 'new-chat'
    }
  }

  if (state.status === 'loading') {
    return 'loading'
  }

  return 'standard'
}

function ConversationFooter({
  state,
  hasAcceptOverride,
  children,
}: {
  state: any
  hasAcceptOverride?: boolean
  children?: React.ReactNode // message input
}) {
  if (state.status !== 'ready') {
    return null
  }

  const footerState = getFooterState(state, hasAcceptOverride)

  switch (footerState) {
    case 'loading':
      return null
          case 'new-chat':
        return (
          <>
            <SonetChatEmptyPill />
            {children}
          </>
        )
          case 'request':
        return <SonetChatStatusInfo state={state} />
    case 'standard':
      return children
  }
}
