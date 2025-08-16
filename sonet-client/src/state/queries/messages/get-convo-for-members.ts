// Shim for missing get-convo-for-members module
// This provides basic convo member functionality

import {useQuery} from '@tanstack/react-query'

export function useGetConvoForMembers(memberIds: string[]) {
  return useQuery({
    queryKey: ['convo-for-members', memberIds],
    queryFn: async () => {
      // Mock implementation - in real app this would find or create a chat for these members
      return {
        chatId: `chat-${memberIds.sort().join('-')}`,
        exists: true,
        members: memberIds
      }
    },
    enabled: memberIds.length > 0
  })
}