import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attemptClient } from '../api/connect'
import { fromAttempt } from '../api/adapters'

export const attemptKeys = {
  detail:  (id: string)                              => ['attempts', id] as const,
  byTest:  (bankId: string, testId: number | string) => ['attempts', 'test', bankId, String(testId)] as const,
}

export function useAttempt(bankId: string, id: string) {
  return useQuery({
    queryKey: attemptKeys.detail(id),
    queryFn:  async () => {
      const res = await attemptClient.getAttempt({ id: Number(id), bankId: Number(bankId) })
      return fromAttempt(res.attempt!)
    },
    enabled: !!bankId && !!id,
  })
}

export function useTestAttempts(bankId: string, testId: number | string) {
  return useQuery({
    queryKey: attemptKeys.byTest(bankId, testId),
    queryFn:  async () => {
      const res = await attemptClient.listAttemptsByTest({ bankId: Number(bankId), testId: Number(testId) })
      return res.attempts.map(fromAttempt)
    },
    enabled: !!bankId && !!testId,
  })
}

export function useStartAttempt() {
  return useMutation({
    mutationFn: async ({ bankId, testId }: { bankId: string; testId: number | string }) => {
      const res = await attemptClient.startAttempt({ bankId: Number(bankId), testId: Number(testId) })
      return fromAttempt(res.attempt!)
    },
  })
}

export function useSubmitAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bankId, id, answers }: { bankId: string; id: string; answers: Record<string, string> }) => {
      const res = await attemptClient.submitAttempt({ id: Number(id), answers, bankId: Number(bankId) })
      return fromAttempt(res.attempt!)
    },
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: attemptKeys.detail(id) }),
  })
}
