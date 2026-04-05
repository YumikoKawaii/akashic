import client from './client'
import { Passage } from '../types'

export const passagesApi = {
  list: (bankId: string) =>
    client.get<Passage[]>(`/banks/${bankId}/passages`).then(r => r.data),
  get: (bankId: string, id: string) =>
    client.get<Passage>(`/banks/${bankId}/passages/${id}`).then(r => r.data),
  create: (bankId: string, data: { category_id: string; title: string; body: string; difficulty: string }) =>
    client.post<Passage>(`/banks/${bankId}/passages`, data).then(r => r.data),
  update: (bankId: string, id: string, data: Partial<{ category_id: string; title: string; body: string; difficulty: string }>) =>
    client.put<Passage>(`/banks/${bankId}/passages/${id}`, data).then(r => r.data),
  delete: (bankId: string, id: string) =>
    client.delete(`/banks/${bankId}/passages/${id}`),
}
