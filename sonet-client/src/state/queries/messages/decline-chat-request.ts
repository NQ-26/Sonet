// Shim for missing decline-chat-request module
// This provides basic chat request decline functionality

import {useMutation, useQueryClient} from '@tanstack/react-query'

export function useDeclineChatRequest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      // Mock implementation - in real app this would decline the chat request
      return {success: true}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['chat-requests']})
    }
  })
}