// Shim for missing actor-declaration module
// This provides basic actor declaration functionality

import {useMutation, useQueryClient} from '@tanstack/react-query'

export function useUpdateActorDeclaration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {actorId: string; declaration: any}) => {
      // Mock implementation - in real app this would update the actor declaration
      return {success: true}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['actor-declarations']})
    }
  })
}

export function useDeleteActorDeclaration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (actorId: string) => {
      // Mock implementation - in real app this would delete the actor declaration
      return {success: true}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['actor-declarations']})
    }
  })
}