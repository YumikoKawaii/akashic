import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { questionsApi } from '../api/questions'
import { Question, QuestionFilter } from '../types'

export const questionKeys = {
  all:    (bankId: string, filter?: QuestionFilter) => ['questions', bankId, filter] as const,
  detail: (bankId: string, id: string)              => ['questions', bankId, id] as const,
}

export function useQuestions(bankId: string, filter: QuestionFilter = {}, page = 1) {
  return useQuery({
    queryKey:        [...questionKeys.all(bankId, filter), page],
    queryFn:         () => questionsApi.list(bankId, filter, page),
    enabled:         !!bankId,
    placeholderData: keepPreviousData,
  })
}

export function useQuestion(bankId: string, id: string) {
  return useQuery({
    queryKey: questionKeys.detail(bankId, id),
    queryFn:  () => questionsApi.get(bankId, id),
    enabled:  !!bankId && !!id,
  })
}

export function useCreateQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Question, 'id' | 'bank_id' | 'category' | 'created_at' | 'updated_at'>) =>
      questionsApi.create(bankId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}

export function useUpdateQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Question> }) =>
      questionsApi.update(bankId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}

export function useDeleteQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => questionsApi.delete(bankId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}
