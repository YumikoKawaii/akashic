import axios from 'axios'
import { User } from '../types'

const api = axios.create({ baseURL: '/api/v1', withCredentials: true })

export const authApi = {
  me: (): Promise<User> =>
    api.get('/auth/me').then(r => r.data),

  localLogin: (email: string, password: string): Promise<void> =>
    api.post('/auth/login', { email, password }).then(() => undefined),

  logout: (): Promise<void> =>
    api.post('/auth/logout').then(() => undefined),
}
