// Shim for missing get-convo-availability module
// This provides basic convo availability functionality

import {useQuery} from '@tanstack/react-query'

export function useGetConvoAvailabilityQuery(chatId: string) {
  return useQuery({
    queryKey: ['convo-availability', chatId],
    queryFn: async () => {
      // Mock implementation - in real app this would check if user can access the chat
      return {
        canAccess: true,
        isBlocked: false,
        isMuted: false
      }
    },
    enabled: !!chatId
  })
}