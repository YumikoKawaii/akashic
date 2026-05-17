import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { questionsApi, CreateQuestionPayload, UpdateQuestionPayload } from '../api/questions'
import { QuestionFilter } from '../types'

export const PAGE_SIZE = 20

export const questionKeys = {
  all:    (bankId: string, filter?: QuestionFilter, page?: number) => ['questions', bankId, filter, page] as const,
  detail: (bankId: string, id: string)                             => ['questions', bankId, id] as const,
}

export function useQuestions(bankId: string, filter: QuestionFilter = {}, page = 1) {
  return useQuery({
    queryKey: questionKeys.all(bankId, filter, page),
    queryFn:  () => questionsApi.list(bankId, filter, page, PAGE_SIZE),
    enabled:  !!bankId,
    placeholderData: (prev) => prev,  // keep previous page visible while fetching next
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
    mutationFn: (data: CreateQuestionPayload) => questionsApi.create(bankId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}

export function useUpdateQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuestionPayload }) =>
      questionsApi.update(bankId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}

export function useDeleteQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => questionsApi.delete(bankId, String(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}
