import client from './client'
import { Category } from '../types'

export const categoriesApi = {
  list: (bankId: string) =>
    client.get<Category[]>(`/banks/${bankId}/categories`).then(r => r.data),
  create: (bankId: string, data: { name: string; description?: string }) =>
    client.post<Category>(`/banks/${bankId}/categories`, data).then(r => r.data),
  update: (bankId: string, id: string, data: { name?: string; description?: string }) =>
    client.put<Category>(`/banks/${bankId}/categories/${id}`, data).then(r => r.data),
  delete: (bankId: string, id: string) =>
    client.delete(`/banks/${bankId}/categories/${id}`),
}
