import client from './client'
import { User } from '../types'

export const authApi = {
  me: (): Promise<User> =>
    client.get<User>('/auth/me').then(r => r.data),
  logout: (): Promise<void> =>
    client.post('/auth/logout').then(() => undefined),
  register: (email: string, password: string, name: string): Promise<User> =>
    client.post<User>('/auth/register', { email, password, name }).then(r => r.data),
  login: (email: string, password: string): Promise<User> =>
    client.post<User>('/auth/login', { email, password }).then(r => r.data),
}
