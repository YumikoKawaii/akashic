import client from './client'
import { Test, TestConfig } from '../types'

export const testsApi = {
  list: (bankId: string) =>
    client.get<Test[]>(`/banks/${bankId}/tests`).then(r => r.data),
  get: (bankId: string, id: string) =>
    client.get<Test>(`/banks/${bankId}/tests/${id}`).then(r => r.data),
  generate: (bankId: string, data: { name: string; description?: string; config?: Partial<TestConfig> }) =>
    client.post<Test>(`/banks/${bankId}/tests/generate`, data).then(r => r.data),
  delete: (bankId: string, id: string) =>
    client.delete(`/banks/${bankId}/tests/${id}`),
}
