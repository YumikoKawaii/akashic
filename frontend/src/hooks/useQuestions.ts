import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Difficulty, QuestionType } from '../gen/akashic/v1/common_pb'
import { questionClient } from '../api/connect'
import { fromQuestion } from '../api/adapters'
import type { QuestionFilter, MCQOption } from '../types'

export const PAGE_SIZE = 20

export const questionKeys = {
  all:    (bankId: string, filter?: QuestionFilter, page?: number) => ['questions', bankId, filter, page] as const,
  detail: (bankId: string, id: string)                             => ['questions', bankId, id] as const,
}

export interface CreateQuestionPayload {
  category_id: number
  type: string
  difficulty: string
  tags: string[]
  content: string
  answer?: string
  options?: MCQOption[]
  answers?: string[]
}

export interface UpdateQuestionPayload {
  category_id?: number
  difficulty?: string
  tags?: string[]
  content?: string
  answer?: string
  options?: MCQOption[]
  answers?: string[]
}

function toDifficulty(s: string): Difficulty {
  switch (s) {
    case 'easy':   return Difficulty.EASY
    case 'medium': return Difficulty.MEDIUM
    case 'hard':   return Difficulty.HARD
    default:       return Difficulty.UNSPECIFIED
  }
}

function toQuestionType(s: string): QuestionType {
  const map: Record<string, QuestionType> = {
    mcq:                  QuestionType.MCQ,
    tf_ng:                QuestionType.TF_NG,
    yn_ng:                QuestionType.YN_NG,
    short_answer:         QuestionType.SHORT_ANSWER,
    sentence_completion:  QuestionType.SENTENCE_COMPLETION,
    form_completion:      QuestionType.FORM_COMPLETION,
    matching_headings:    QuestionType.MATCHING_HEADINGS,
    matching_information: QuestionType.MATCHING_INFORMATION,
    matching_features:    QuestionType.MATCHING_FEATURES,
  }
  return map[s] ?? QuestionType.UNSPECIFIED
}

export function useTags(bankId: string) {
  return useQuery({
    queryKey: ['tags', bankId] as const,
    queryFn:  async () => {
      const res = await questionClient.listTags({ bankId: Number(bankId) })
      return res.tags
    },
    enabled: !!bankId,
  })
}

export function useQuestions(bankId: string, filter: QuestionFilter = {}, page = 1) {
  return useQuery({
    queryKey: questionKeys.all(bankId, filter, page),
    queryFn:  async () => {
      const res = await questionClient.listQuestions({
        bankId: Number(bankId),
        page,
        pageSize: PAGE_SIZE,
        filter: {
          categoryIds:   (filter.category_ids ?? []).map(Number),
          difficulty:    toDifficulty(filter.difficulty ?? ''),
          type:          toQuestionType(filter.type ?? ''),
          tags:          filter.tags ?? [],
          standaloneOnly: false,
        },
      })
      return {
        data:      res.questions.map(fromQuestion),
        total:     res.pageInfo?.total     ?? 0,
        page:      res.pageInfo?.page      ?? page,
        page_size: res.pageInfo?.pageSize  ?? PAGE_SIZE,
      }
    },
    enabled: !!bankId,
    placeholderData: (prev) => prev,
  })
}

export function useQuestion(bankId: string, id: string) {
  return useQuery({
    queryKey: questionKeys.detail(bankId, id),
    queryFn:  async () => {
      const res = await questionClient.getQuestion({ bankId: Number(bankId), id: Number(id) })
      return fromQuestion(res.question!)
    },
    enabled: !!bankId && !!id,
  })
}

export function useCreateQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateQuestionPayload) => {
      const isMcq = data.type === 'mcq'
      const res = await questionClient.createQuestion({
        bankId:     Number(bankId),
        categoryId: data.category_id,
        type:       toQuestionType(data.type),
        difficulty: toDifficulty(data.difficulty),
        tags:       data.tags,
        content: isMcq
          ? { case: 'choice', value: { content: data.content, options: data.options ?? [], answers: data.answers ?? [] } }
          : { case: 'item',   value: { content: data.content, answer:  data.answer  ?? '' } },
      })
      return fromQuestion(res.question!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}

export function useUpdateQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateQuestionPayload }) => {
      const isMcq = !!data.options
      const res = await questionClient.updateQuestion({
        bankId:     Number(bankId),
        id:         Number(id),
        categoryId: data.category_id ?? 0,
        difficulty: toDifficulty(data.difficulty ?? ''),
        tags:       data.tags ?? [],
        content: isMcq
          ? { case: 'choice', value: { content: data.content ?? '', options: data.options ?? [], answers: data.answers ?? [] } }
          : { case: 'item',   value: { content: data.content ?? '', answer:  data.answer  ?? '' } },
      })
      return fromQuestion(res.question!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}

export function useDeleteQuestion(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) =>
      questionClient.deleteQuestion({ bankId: Number(bankId), id: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}

export function useIngestQuestions(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const data = new Uint8Array(await file.arrayBuffer())
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const fmtMap: Record<string, number> = { json: 1, csv: 2, yaml: 3, yml: 3 }
      const res = await questionClient.ingestQuestions({
        bankId:   Number(bankId),
        format:   fmtMap[ext] ?? 0,
        fileData: data,
      })
      return res
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', bankId] }),
  })
}
