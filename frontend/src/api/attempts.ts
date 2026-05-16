import client from './client'
import { TestAttempt } from '../types'

export const attemptsApi = {
  start: (bankId: string, testId: number | string) =>
    client.post<TestAttempt>(`/banks/${bankId}/tests/${testId}/attempts`).then(r => r.data),
  get: (id: string) =>
    client.get<TestAttempt>(`/attempts/${id}`).then(r => r.data),
  submit: (id: string, answers: Record<string, string>) =>
    client.put<TestAttempt>(`/attempts/${id}/submit`, { answers }).then(r => r.data),
  listByTest: (bankId: string, testId: number | string) =>
    client.get<TestAttempt[]>(`/banks/${bankId}/tests/${testId}/attempts`).then(r => r.data),
}
