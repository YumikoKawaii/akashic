import client from './client'
import { Question, QuestionFilter } from '../types'

export const questionsApi = {
  list: (bankId: string, filter: QuestionFilter = {}) => {
    const params = new URLSearchParams()
    if (filter.category_id) params.set('category_id', filter.category_id)
    if (filter.difficulty)   params.set('difficulty',  filter.difficulty)
    if (filter.type)         params.set('type',        filter.type)
    filter.tags?.forEach(t => params.append('tags', t))
    return client.get<Question[]>(`/banks/${bankId}/questions`, { params }).then(r => r.data)
  },
  get: (bankId: string, id: string) =>
    client.get<Question>(`/banks/${bankId}/questions/${id}`).then(r => r.data),
  create: (bankId: string, data: Omit<Question, 'id' | 'bank_id' | 'category' | 'created_at' | 'updated_at'>) =>
    client.post<Question>(`/banks/${bankId}/questions`, data).then(r => r.data),
  update: (bankId: string, id: string, data: Partial<Question>) =>
    client.put<Question>(`/banks/${bankId}/questions/${id}`, data).then(r => r.data),
  delete: (bankId: string, id: string) =>
    client.delete(`/banks/${bankId}/questions/${id}`),
}
