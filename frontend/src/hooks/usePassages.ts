import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Difficulty } from '../gen/akashic/v1/common_pb'
import { passageClient } from '../api/connect'
import { fromPassage } from '../api/adapters'
import type { PassageParagraph } from '../types'

export const PASSAGE_PAGE_SIZE = 10

export const passageKeys = {
  all:    (bankId: string) => ['passages', bankId] as const,
  detail: (bankId: string, id: string) => ['passages', bankId, id] as const,
}

function toDifficulty(s: string): Difficulty {
  switch (s) {
    case 'easy':   return Difficulty.EASY
    case 'medium': return Difficulty.MEDIUM
    case 'hard':   return Difficulty.HARD
    default:       return Difficulty.UNSPECIFIED
  }
}

export function usePassages(bankId: string) {
  return useQuery({
    queryKey: passageKeys.all(bankId),
    queryFn:  async () => {
      const res = await passageClient.listPassages({ bankId: Number(bankId) })
      return res.passages.map(fromPassage)
    },
    enabled: !!bankId,
  })
}

// Compatibility alias — passage listing is now unpaginated; returns page-shaped data.
export function usePassagesPaged(bankId: string, _page = 1) {
  const result = usePassages(bankId)
  return {
    ...result,
    data: result.data
      ? { data: result.data, total: result.data.length, page: 1, page_size: result.data.length }
      : undefined,
  }
}

export function usePassage(bankId: string, id: string) {
  return useQuery({
    queryKey: passageKeys.detail(bankId, id),
    queryFn:  async () => {
      const res = await passageClient.getPassage({ bankId: Number(bankId), id: Number(id) })
      return fromPassage(res.passage!)
    },
    enabled: !!bankId && !!id,
  })
}

export function useCreatePassage(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { category_id: number; title: string; difficulty: string; paragraphs?: PassageParagraph[] }) => {
      const res = await passageClient.createPassage({
        bankId:     Number(bankId),
        categoryId: data.category_id,
        title:      data.title,
        difficulty: toDifficulty(data.difficulty),
        paragraphs: (data.paragraphs ?? []).map(p => ({ label: p.label, text: p.text })),
      })
      return fromPassage(res.passage!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: passageKeys.all(bankId) }),
  })
}

export function useUpdatePassage(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ category_id: number; title: string; difficulty: string; paragraphs: PassageParagraph[] }> }) => {
      const res = await passageClient.updatePassage({
        bankId:     Number(bankId),
        id:         Number(id),
        categoryId: data.category_id ?? 0,
        title:      data.title       ?? '',
        difficulty: toDifficulty(data.difficulty ?? ''),
        paragraphs: (data.paragraphs ?? []).map(p => ({ label: p.label, text: p.text })),
      })
      return fromPassage(res.passage!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: passageKeys.all(bankId) }),
  })
}

export function useDeletePassage(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) =>
      passageClient.deletePassage({ bankId: Number(bankId), id: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: passageKeys.all(bankId) }),
  })
}
