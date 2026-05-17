import client from './client'
import { Test, TestConfig, TestPage } from '../types'

export const testsApi = {
  list: (bankId: string) =>
    client.get<TestPage>(`/banks/${bankId}/tests`, { params: { page: 1, page_size: 1000 } }).then(r => r.data.data),
  listPaged: (bankId: string, page = 1, pageSize = 10) =>
    client.get<TestPage>(`/banks/${bankId}/tests`, { params: { page, page_size: pageSize } }).then(r => r.data),
  get: (bankId: string, id: string) =>
    client.get<Test>(`/banks/${bankId}/tests/${id}`).then(r => r.data),
  generate: (bankId: string, data: { name: string; description?: string; config?: Partial<TestConfig> }) =>
    client.post<Test>(`/banks/${bankId}/tests/generate`, data).then(r => r.data),
  delete: (bankId: string, id: string) =>
    client.delete(`/banks/${bankId}/tests/${id}`),
}
