import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { passagesApi } from '../api/passages'

export const passageKeys = {
  all:    (bankId: string) => ['passages', bankId] as const,
  detail: (bankId: string, id: string) => ['passages', bankId, id] as const,
}

export function usePassages(bankId: string) {
  return useQuery({
    queryKey: passageKeys.all(bankId),
    queryFn:  () => passagesApi.list(bankId),
    enabled:  !!bankId,
  })
}

export function usePassage(bankId: string, id: string) {
  return useQuery({
    queryKey: passageKeys.detail(bankId, id),
    queryFn:  () => passagesApi.get(bankId, id),
    enabled:  !!bankId && !!id,
  })
}

export function useCreatePassage(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { category_id: number; title: string; difficulty: string }) =>
      passagesApi.create(bankId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: passageKeys.all(bankId) }),
  })
}

export function useUpdatePassage(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ category_id: number; title: string; difficulty: string }> }) =>
      passagesApi.update(bankId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: passageKeys.all(bankId) }),
  })
}

export function useDeletePassage(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => passagesApi.delete(bankId, String(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: passageKeys.all(bankId) }),
  })
}
