import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testsApi } from '../api/tests'
import { TestConfig } from '../types'

export const testKeys = {
  all:    (bankId: string) => ['tests', bankId] as const,
  detail: (bankId: string, id: string) => ['tests', bankId, id] as const,
}

export function useTests(bankId: string) {
  return useQuery({
    queryKey: testKeys.all(bankId),
    queryFn:  () => testsApi.list(bankId),
    enabled:  !!bankId,
  })
}

export function useTest(bankId: string, id: string) {
  return useQuery({
    queryKey: testKeys.detail(bankId, id),
    queryFn:  () => testsApi.get(bankId, id),
    enabled:  !!bankId && !!id,
  })
}

export function useGenerateTest(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; config?: Partial<TestConfig> }) =>
      testsApi.generate(bankId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: testKeys.all(bankId) }),
  })
}

export function useDeleteTest(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => testsApi.delete(bankId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: testKeys.all(bankId) }),
  })
}
