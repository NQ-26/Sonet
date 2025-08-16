import React, {createContext, useContext, useReducer, useEffect, useCallback, useRef} from 'react'
import {sonetMessagingApi} from '#/services/sonetMessagingApi'
import {sonetWebSocket} from '#/services/sonetWebSocket'
import {sonetCrypto} from '#/services/sonetCrypto'
import {sonetConvoReducer, initialSonetConvoState} from './reducer'
import type {
  SonetConvoContextValue,
  SonetConvoProviderProps,
  SonetConvoState,
  SonetConvoActionTypes,
  SonetSendMessageParams,
  SonetLoadMessagesParams,
  SonetLoadMoreMessagesParams,
  TYPING_TIMEOUT,
  RETRY_DELAY,
  MAX_RETRIES
} from './types'

// =============================================================================
// CONTEXT
// =============================================================================

const SonetConvoContext = createContext<SonetConvoContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================

export function SonetConvoProvider({
  children,
  chatId,
  initialChat,
  pageSize = 50
}: SonetConvoProviderProps) {
  const [state, dispatch] = useReducer(sonetConvoReducer, {
    ...initialSonetConvoState,
    chatId,
    pageSize,
    chat: initialChat || null
  })

  // Refs for cleanup and state management
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const isInitializedRef = useRef(false)

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  useEffect(() => {
    if (!chatId || isInitializedRef.current) return

    const initializeChat = async () => {
      try {
        dispatch({type: 'SET_LOADING', payload: true})
        dispatch({type: 'SET_STATUS', payload: 'loading'})

        // Load chat information
        const chat = await sonetMessagingApi.getChat(chatId)
        dispatch({
          type: 'SET_CHAT',
          payload: {chat, chatId}
        })

        // Load initial messages
        await loadMessages({limit: pageSize, refresh: true})

        // Set up real-time listeners
        setupRealTimeListeners()

        isInitializedRef.current = true
        dispatch({type: 'SET_STATUS', payload: 'ready'})
      } catch (error) {
        console.error('Failed to initialize chat:', error)
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to initialize chat'
        })
      } finally {
        dispatch({type: 'SET_LOADING', payload: false})
      }
    }

    initializeChat()

    return () => {
      cleanup()
    }
  }, [chatId, pageSize])

  // ========================================================================
  // REAL-TIME EVENT HANDLERS
  // ========================================================================

  const setupRealTimeListeners = useCallback(() => {
    // Message events
    sonetMessagingApi.on('message_received', (message) => {
      if (message.chatId === chatId) {
        dispatch({type: 'ADD_MESSAGE', payload: message})
        
        // Mark as read if we're in the chat
        if (document.hasFocus()) {
          markAsRead(message.id)
        }
      }
    })

    sonetMessagingApi.on('message_sent', (message) => {
      if (message.chatId === chatId) {
        dispatch({type: 'ADD_MESSAGE', payload: message})
      }
    })

    // Typing events
    sonetMessagingApi.on('typing', (typingData) => {
      if (typingData.chat_id === chatId) {
        dispatch({
          type: 'SET_TYPING',
          payload: {
            userId: typingData.user_id,
            isTyping: typingData.is_typing
          }
        })

        // Clear typing indicator after timeout
        if (typingData.is_typing) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          
          typingTimeoutRef.current = setTimeout(() => {
            dispatch({
              type: 'SET_TYPING',
              payload: {
                userId: typingData.user_id,
                isTyping: false
              }
            })
          }, TYPING_TIMEOUT)
        }
      }
    })

    // Read receipt events
    sonetMessagingApi.on('read_receipt', (receiptData) => {
      if (receiptData.message_id) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            messageId: receiptData.message_id,
            updates: {
              readBy: [...(state.messages.find(m => m.id === receiptData.message_id)?.readBy || []), receiptData.user_id]
            }
          }
        })
      }
    })

    // Chat update events
    sonetMessagingApi.on('chat_update', (updateData) => {
      if (updateData.chatId === chatId) {
        dispatch({
          type: 'UPDATE_CHAT',
          payload: updateData
        })
      }
    })

    // Connection events
    sonetWebSocket.on('connected', () => {
      dispatch({type: 'SET_CONNECTION_STATUS', payload: 'connected'})
    })

    sonetWebSocket.on('disconnected', () => {
      dispatch({type: 'SET_CONNECTION_STATUS', payload: 'disconnected'})
    })

    sonetWebSocket.on('reconnecting', () => {
      dispatch({type: 'SET_CONNECTION_STATUS', payload: 'connecting'})
    })

    sonetWebSocket.on('error', () => {
      dispatch({type: 'SET_CONNECTION_STATUS', payload: 'error'})
    })
  }, [chatId, state.messages])

  // ========================================================================
  // MESSAGE OPERATIONS
  // ========================================================================

  const sendMessage = useCallback(async (params: SonetSendMessageParams): Promise<any> => {
    try {
      // Optimistically add message to state
      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        chatId,
        senderId: 'current_user',
        content: params.content,
        type: params.type || 'text',
        timestamp: new Date().toISOString(),
        isEncrypted: state.chat?.isEncrypted || false,
        attachments: params.attachments?.map(f => ({
          id: `temp_${Date.now()}`,
          filename: f.name,
          mimeType: f.type,
          size: f.size,
          url: '',
          isEncrypted: true
        })),
        replyTo: params.replyTo,
        reactions: [],
        readBy: ['current_user'],
        status: 'sending' as const
      }

      dispatch({type: 'ADD_MESSAGE', payload: optimisticMessage})

      // Send message via API
      const message = await sonetMessagingApi.sendMessage({
        chatId,
        ...params
      })

      // Replace optimistic message with real message
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          messageId: optimisticMessage.id,
          updates: {
            ...message,
            status: 'sent'
          }
        }
      })

      // Send typing indicator
      sonetMessagingApi.sendTyping(chatId, false)

      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Update message status to failed
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          messageId: `temp_${Date.now()}`,
          updates: {status: 'failed'}
        }
      })

      throw error
    }
  }, [chatId, state.chat?.isEncrypted])

  const loadMessages = useCallback(async (params: SonetLoadMessagesParams = {}) => {
    try {
      const {refresh = false} = params
      
      if (refresh) {
        dispatch({type: 'SET_LOADING', payload: true})
        dispatch({type: 'SET_CURSOR', payload: null})
      } else {
        dispatch({type: 'SET_LOADING_MORE', payload: true})
      }

      const messages = await sonetMessagingApi.getMessages(
        chatId,
        params.limit || state.pageSize,
        params.before
      )

      dispatch({
        type: 'SET_MESSAGES',
        payload: {
          messages,
          replace: refresh
        }
      })

      // Update pagination state
      dispatch({type: 'SET_HAS_MORE', payload: messages.length >= (params.limit || state.pageSize)})
      
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        dispatch({type: 'SET_CURSOR', payload: lastMessage.id})
      }

      // Mark messages as read
      messages.forEach(message => {
        if (!message.readBy?.includes('current_user')) {
          markAsRead(message.id)
        }
      })

    } catch (error) {
      console.error('Failed to load messages:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load messages'
      })
    } finally {
      dispatch({type: 'SET_LOADING', payload: false})
      dispatch({type: 'SET_LOADING_MORE', payload: false})
    }
  }, [chatId, state.pageSize])

  const loadMoreMessages = useCallback(async (params: SonetLoadMoreMessagesParams = {}) => {
    if (!state.hasMore || state.isLoadingMore) return

    try {
      dispatch({type: 'SET_LOADING_MORE', payload: true})

      const messages = await sonetMessagingApi.getMessages(
        chatId,
        params.limit || state.pageSize,
        params.before || state.cursor
      )

      if (messages.length > 0) {
        dispatch({
          type: 'SET_MESSAGES',
          payload: {messages, replace: false}
        })

        const lastMessage = messages[messages.length - 1]
        dispatch({type: 'SET_CURSOR', payload: lastMessage.id})
        dispatch({type: 'SET_HAS_MORE', payload: messages.length >= (params.limit || state.pageSize)})
      } else {
        dispatch({type: 'SET_HAS_MORE', payload: false})
      }

    } catch (error) {
      console.error('Failed to load more messages:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load more messages'
      })
    } finally {
      dispatch({type: 'SET_LOADING_MORE', payload: false})
    }
  }, [chatId, state.hasMore, state.isLoadingMore, state.pageSize, state.cursor])

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      dispatch({type: 'MARK_MESSAGE_AS_READ', payload: messageId})
      
      // Send read receipt via WebSocket
      sonetMessagingApi.sendReadReceipt(messageId)
    } catch (error) {
      console.error('Failed to mark message as read:', error)
    }
  }, [])

  const setTyping = useCallback(async (isTyping: boolean) => {
    try {
      sonetMessagingApi.sendTyping(chatId, isTyping)
      
      // Update local typing state
      dispatch({
        type: 'SET_TYPING',
        payload: {
          userId: 'current_user',
          isTyping
        }
      })

      // Clear typing indicator after timeout
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          dispatch({
            type: 'SET_TYPING',
            payload: {
              userId: 'current_user',
              isTyping: false
            }
          })
        }, TYPING_TIMEOUT)
      }
    } catch (error) {
      console.error('Failed to set typing indicator:', error)
    }
  }, [chatId])

  // ========================================================================
  // ENCRYPTION OPERATIONS
  // ========================================================================

  const enableEncryption = useCallback(async () => {
    try {
      dispatch({type: 'ENABLE_ENCRYPTION'})

      // Perform key exchange with chat participants
      if (state.chat) {
        const participantIds = state.chat.participants.map(p => p.id)
        
        // This would typically involve:
        // 1. Generating new key pair
        // 2. Exchanging keys with participants
        // 3. Updating chat encryption status
        
        dispatch({
          type: 'SET_ENCRYPTION_STATUS',
          payload: {status: 'enabled'}
        })
      }
    } catch (error) {
      console.error('Failed to enable encryption:', error)
      dispatch({
        type: 'SET_ENCRYPTION_STATUS',
        payload: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to enable encryption'
        }
      })
    }
  }, [state.chat])

  const disableEncryption = useCallback(async () => {
    try {
      dispatch({type: 'DISABLE_ENCRYPTION'})
      
      // This would typically involve:
      // 1. Notifying participants
      // 2. Updating chat settings
      // 3. Clearing encryption keys
      
      dispatch({
        type: 'SET_ENCRYPTION_STATUS',
        payload: {status: 'disabled'}
      })
    } catch (error) {
      console.error('Failed to disable encryption:', error)
      dispatch({
        type: 'SET_ENCRYPTION_STATUS',
        payload: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to disable encryption'
        }
      })
    }
  }, [])

  // ========================================================================
  // UTILITY OPERATIONS
  // ========================================================================

  const refresh = useCallback(async () => {
    await loadMessages({refresh: true})
  }, [loadMessages])

  const clearCache = useCallback(() => {
    dispatch({type: 'RESET'})
  }, [])

  // ========================================================================
  // CLEANUP
  // ========================================================================

  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Remove event listeners
    sonetMessagingApi.removeAllListeners()
    sonetWebSocket.removeAllListeners()
  }, [])

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const contextValue: SonetConvoContextValue = {
    state,
    dispatch,
    actions: {
      sendMessage,
      loadMessages,
      loadMoreMessages,
      markAsRead,
      setTyping,
      enableEncryption,
      disableEncryption,
      refresh,
      clearCache
    }
  }

  return (
    <SonetConvoContext.Provider value={contextValue}>
      {children}
    </SonetConvoContext.Provider>
  )
}

// =============================================================================
// HOOKS
// =============================================================================

export function useSonetConvo(): SonetConvoContextValue {
  const context = useContext(SonetConvoContext)
  if (!context) {
    throw new Error('useSonetConvo must be used within a SonetConvoProvider')
  }
  return context
}

export function useSonetConvoState(): SonetConvoState {
  return useSonetConvo().state
}

export function useSonetConvoDispatch(): React.Dispatch<SonetConvoActionTypes> {
  return useSonetConvo().dispatch
}

export function useSonetConvoActions() {
  return useSonetConvo().actions
}

// Add missing useConvoActive hook for compatibility
export function useConvoActive() {
  const {state} = useSonetConvo()
  return {
    isActive: state.status === 'ready',
    isLoading: state.loading,
    hasError: !!state.error
  }
}