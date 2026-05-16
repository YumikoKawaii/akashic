import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attemptsApi } from '../api/attempts'

export const attemptKeys = {
  detail:  (id: string)                            => ['attempts', id] as const,
  byTest:  (bankId: string, testId: number | string) => ['attempts', 'test', bankId, String(testId)] as const,
}

export function useAttempt(id: string) {
  return useQuery({
    queryKey: attemptKeys.detail(id),
    queryFn:  () => attemptsApi.get(id),
    enabled:  !!id,
  })
}

export function useTestAttempts(bankId: string, testId: number | string) {
  return useQuery({
    queryKey: attemptKeys.byTest(bankId, testId),
    queryFn:  () => attemptsApi.listByTest(bankId, testId),
    enabled:  !!bankId && !!testId,
  })
}

export function useStartAttempt() {
  return useMutation({
    mutationFn: ({ bankId, testId }: { bankId: string; testId: number | string }) =>
      attemptsApi.start(bankId, testId),
  })
}

export function useSubmitAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, string> }) =>
      attemptsApi.submit(id, answers),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: attemptKeys.detail(id) }),
  })
}
