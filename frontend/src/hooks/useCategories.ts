import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../api/categories'

export const categoryKeys = {
  all:  (bankId: string) => ['categories', bankId] as const,
}

export function useCategories(bankId: string) {
  return useQuery({
    queryKey: categoryKeys.all(bankId),
    queryFn:  () => categoriesApi.list(bankId),
    enabled:  !!bankId,
  })
}

export function useCreateCategory(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      categoriesApi.create(bankId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all(bankId) }),
  })
}

export function useDeleteCategory(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(bankId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all(bankId) }),
  })
}
