// Shim for missing accept-chat-request module
// This provides basic chat request acceptance functionality

import {useMutation, useQueryClient} from '@tanstack/react-query'

export function useAcceptChatRequest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      // Mock implementation - in real app this would accept the chat request
      return {success: true, chatId: `chat-${requestId}`}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['chat-requests']})
      queryClient.invalidateQueries({queryKey: ['conversations']})
    }
  })
}