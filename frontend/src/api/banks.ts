import client from './client'
import { Bank, BankMember, TestConfig } from '../types'

export const banksApi = {
  list: ()                             => client.get<Bank[]>('/banks').then(r => r.data),
  get:  (id: string)                   => client.get<Bank>(`/banks/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string; default_config?: TestConfig }) =>
    client.post<Bank>('/banks', data).then(r => r.data),
  update: (id: string, data: { name?: string; description?: string }) =>
    client.put<Bank>(`/banks/${id}`, data).then(r => r.data),
  updateDefaultConfig: (id: string, config: TestConfig) =>
    client.put<Bank>(`/banks/${id}/default-config`, config).then(r => r.data),
  delete: (id: string) => client.delete(`/banks/${id}`),

  listMembers: (id: string) =>
    client.get<BankMember[]>(`/banks/${id}/members`).then(r => r.data),
  addMember: (id: string, data: { email: string; role: string }) =>
    client.post<BankMember>(`/banks/${id}/members`, data).then(r => r.data),
  removeMember: (id: string, userId: number | string) =>
    client.delete(`/banks/${id}/members/${userId}`),
}
