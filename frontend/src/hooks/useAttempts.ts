import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attemptClient } from '../api/connect'
import { fromAttempt } from '../api/adapters'
import { testKeys } from './useTests'

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

// The full attempt history for one test (all takers). Loaded lazily — the test
// card only enables it once its History panel is expanded, so the listing no
// longer fans out one request per card.
export function useTestAttempts(bankId: string, testId: number | string, enabled = true) {
  return useQuery({
    queryKey: attemptKeys.byTest(bankId, testId),
    queryFn:  async () => {
      const res = await attemptClient.listAttemptsByTest({ bankId: Number(bankId), testId: Number(testId) })
      return res.attempts.map(fromAttempt)
    },
    enabled: enabled && !!bankId && !!testId,
  })
}

export function useStartAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bankId, testId }: { bankId: string; testId: number | string }) => {
      const res = await attemptClient.startAttempt({ bankId: Number(bankId), testId: Number(testId) })
      return fromAttempt(res.attempt!)
    },
    // The response already carries the full attempt (test + questions). Seed the
    // detail cache so the attempt page renders instantly instead of spinning
    // through a redundant refetch of what we were just handed.
    onSuccess: (attempt) => qc.setQueryData(attemptKeys.detail(String(attempt.id)), attempt),
  })
}

// Persists in-progress answers without grading/completing, so a reload resumes.
// Does not invalidate the attempt query — the page already holds the live answers
// in local state; re-fetching mid-attempt would only risk clobbering them.
export function useSaveAttemptProgress() {
  return useMutation({
    mutationFn: async ({ bankId, id, answers }: { bankId: string; id: string; answers: Record<string, string> }) => {
      const res = await attemptClient.saveAttemptProgress({ id: Number(id), answers, bankId: Number(bankId) })
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
    onSuccess: (graded, { bankId, id }) => {
      // The mutation already returns the graded attempt — seed the cache with it
      // so the results page renders the real score immediately (no 0/0 flash).
      qc.setQueryData(attemptKeys.detail(id), graded)
      // Best-result badges, taken counts, and the history list are all stale now.
      qc.invalidateQueries({ queryKey: attemptKeys.byTest(bankId, graded.test_id) })
      qc.invalidateQueries({ queryKey: testKeys.lists(bankId) })
    },
  })
}
