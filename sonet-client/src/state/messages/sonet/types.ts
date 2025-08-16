import type {SonetChat, SonetMessage, SonetUser} from '#/services/sonetMessagingApi'

// =============================================================================
// STATE TYPES
// =============================================================================

export interface SonetConvoState {
  // Chat information
  chat: SonetChat | null
  chatId: string | null
  
  // Message state
  messages: SonetMessage[]
  hasMore: boolean
  isLoadingMore: boolean
  isLoading: boolean
  
  // UI state
  typingUsers: Set<string>
  unreadCount: number
  
  // Connection state
  isConnected: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  
  // Encryption state
  encryptionStatus: 'enabled' | 'disabled' | 'pending' | 'error'
  encryptionError?: string
  
  // Error handling
  error: string | null
  status: 'uninitialized' | 'loading' | 'ready' | 'error'
  
  // Pagination
  cursor: string | null
  pageSize: number
  
  // Cache management
  lastUpdated: string | null
  isStale: boolean
}

// =============================================================================
// ACTION TYPES
// =============================================================================

export interface SonetConvoAction {
  type: string
  payload?: any
}

// Chat actions
export interface SetChatAction extends SonetConvoAction {
  type: 'SET_CHAT'
  payload: {
    chat: SonetChat
    chatId: string
  }
}

export interface UpdateChatAction extends SonetConvoAction {
  type: 'UPDATE_CHAT'
  payload: Partial<SonetChat>
}

export interface ClearChatAction extends SonetConvoAction {
  type: 'CLEAR_CHAT'
}

// Message actions
export interface SetMessagesAction extends SonetConvoAction {
  type: 'SET_MESSAGES'
  payload: {
    messages: SonetMessage[]
    replace?: boolean
  }
}

export interface AddMessageAction extends SonetConvoAction {
  type: 'ADD_MESSAGE'
  payload: SonetMessage
}

export interface UpdateMessageAction extends SonetConvoAction {
  type: 'UPDATE_MESSAGE'
  payload: {
    messageId: string
    updates: Partial<SonetMessage>
  }
}

export interface RemoveMessageAction extends SonetConvoAction {
  type: 'REMOVE_MESSAGE'
  payload: string // messageId
}

export interface MarkMessageAsReadAction extends SonetConvoAction {
  type: 'MARK_MESSAGE_AS_READ'
  payload: string // messageId
}

// Add missing ConvoItem type for compatibility
export interface ConvoItem {
  id: string
  type: 'message' | 'system'
  content: string
  timestamp: string
  sender: {
    id: string
    username: string
    displayName?: string
    avatar?: string
  }
  status: 'sent' | 'delivered' | 'read' | 'failed'
}

// Pagination actions
export interface SetHasMoreAction extends SonetConvoAction {
  type: 'SET_HAS_MORE'
  payload: boolean
}

export interface SetCursorAction extends SonetConvoAction {
  type: 'SET_CURSOR'
  payload: string | null
}

export interface SetPageSizeAction extends SonetConvoAction {
  type: 'SET_PAGE_SIZE'
  payload: number
}

// Loading state actions
export interface SetLoadingAction extends SonetConvoAction {
  type: 'SET_LOADING'
  payload: boolean
}

export interface SetLoadingMoreAction extends SonetConvoAction {
  type: 'SET_LOADING_MORE'
  payload: boolean
}

export interface SetStatusAction extends SonetConvoAction {
  type: 'SET_STATUS'
  payload: SonetConvoState['status']
}

// Typing and presence actions
export interface SetTypingAction extends SonetConvoAction {
  type: 'SET_TYPING'
  payload: {
    userId: string
    isTyping: boolean
  }
}

export interface ClearTypingAction extends SonetConvoAction {
  type: 'CLEAR_TYPING'
  payload: string // userId
}

export interface SetUnreadCountAction extends SonetConvoAction {
  type: 'SET_UNREAD_COUNT'
  payload: number
}

// Connection actions
export interface SetConnectionStatusAction extends SonetConvoAction {
  type: 'SET_CONNECTION_STATUS'
  payload: SonetConvoState['connectionStatus']
}

export interface SetConnectedAction extends SonetConvoAction {
  type: 'SET_CONNECTED'
  payload: boolean
}

// Encryption actions
export interface SetEncryptionStatusAction extends SonetConvoAction {
  type: 'SET_ENCRYPTION_STATUS'
  payload: {
    status: SonetConvoState['encryptionStatus']
    error?: string
  }
}

export interface EnableEncryptionAction extends SonetConvoAction {
  type: 'ENABLE_ENCRYPTION'
}

export interface DisableEncryptionAction extends SonetConvoAction {
  type: 'DISABLE_ENCRYPTION'
}

// Error handling actions
export interface SetErrorAction extends SonetConvoAction {
  type: 'SET_ERROR'
  payload: string | null
}

export interface ClearErrorAction extends SonetConvoAction {
  type: 'CLEAR_ERROR'
}

// Cache management actions
export interface SetLastUpdatedAction extends SonetConvoAction {
  type: 'SET_LAST_UPDATED'
  payload: string
}

export interface SetStaleAction extends SonetConvoAction {
  type: 'SET_STALE'
  payload: boolean
}

// Reset action
export interface ResetAction extends SonetConvoAction {
  type: 'RESET'
}

// Union type for all actions
export type SonetConvoActionTypes =
  | SetChatAction
  | UpdateChatAction
  | ClearChatAction
  | SetMessagesAction
  | AddMessageAction
  | UpdateMessageAction
  | RemoveMessageAction
  | MarkMessageAsReadAction
  | SetHasMoreAction
  | SetCursorAction
  | SetPageSizeAction
  | SetLoadingAction
  | SetLoadingMoreAction
  | SetStatusAction
  | SetTypingAction
  | ClearTypingAction
  | SetUnreadCountAction
  | SetConnectionStatusAction
  | SetConnectedAction
  | SetEncryptionStatusAction
  | EnableEncryptionAction
  | DisableEncryptionAction
  | SetErrorAction
  | ClearErrorAction
  | SetLastUpdatedAction
  | SetStaleAction
  | ResetAction

// =============================================================================
// API TYPES
// =============================================================================

export interface SonetSendMessageParams {
  content: string
  type?: 'text' | 'image' | 'file'
  replyTo?: string
  attachments?: File[]
  encrypt?: boolean
}

export interface SonetGetMessagesParams {
  limit?: number
  before?: string
  after?: string
  cursor?: string
}

export interface SonetLoadMessagesParams {
  limit?: number
  before?: string
  after?: string
  cursor?: string
  refresh?: boolean
}

export interface SonetLoadMoreMessagesParams {
  limit?: number
  before?: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface SonetConvoContextValue {
  state: SonetConvoState
  dispatch: React.Dispatch<SonetConvoActionTypes>
  actions: {
    sendMessage: (params: SonetSendMessageParams) => Promise<SonetMessage>
    loadMessages: (params?: SonetLoadMessagesParams) => Promise<void>
    loadMoreMessages: (params?: SonetLoadMoreMessagesParams) => Promise<void>
    markAsRead: (messageId: string) => Promise<void>
    setTyping: (isTyping: boolean) => Promise<void>
    enableEncryption: () => Promise<void>
    disableEncryption: () => Promise<void>
    refresh: () => Promise<void>
    clearCache: () => void
  }
}

export interface SonetConvoProviderProps {
  children: React.ReactNode
  chatId: string
  initialChat?: SonetChat
  pageSize?: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const MIN_PAGE_SIZE = 10

export const TYPING_TIMEOUT = 3000 // 3 seconds
export const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutes
export const RETRY_DELAY = 1000 // 1 second
export const MAX_RETRIES = 3