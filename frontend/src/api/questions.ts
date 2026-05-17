import client from './client'
import { Question, QuestionFilter, QuestionPage, MCQOption } from '../types'

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

export interface IngestResult {
  created: number
  failed: number
  errors?: Array<{ row: number; label?: string; message: string }>
}

export const questionsApi = {
  list: (bankId: string, filter: QuestionFilter = {}, page = 1, pageSize = 20) => {
    const params = new URLSearchParams()
    filter.category_ids?.forEach(id => params.append('category_id', String(id)))
    if (filter.difficulty) params.set('difficulty', filter.difficulty)
    if (filter.type)       params.set('type', filter.type)
    filter.tags?.forEach(t => params.append('tag', t))
    params.set('page', String(page))
    params.set('page_size', String(pageSize))
    return client.get<QuestionPage>(`/banks/${bankId}/questions`, { params }).then(r => r.data)
  },
  get: (bankId: string, id: string) =>
    client.get<Question>(`/banks/${bankId}/questions/${id}`).then(r => r.data),
  create: (bankId: string, data: CreateQuestionPayload) =>
    client.post<Question>(`/banks/${bankId}/questions`, data).then(r => r.data),
  update: (bankId: string, id: string, data: UpdateQuestionPayload) =>
    client.put<Question>(`/banks/${bankId}/questions/${id}`, data).then(r => r.data),
  delete: (bankId: string, id: string) =>
    client.delete(`/banks/${bankId}/questions/${id}`),
  ingest: (bankId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.post<IngestResult>(`/banks/${bankId}/questions/ingest`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
