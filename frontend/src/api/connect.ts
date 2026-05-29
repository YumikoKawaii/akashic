import { createConnectTransport } from '@connectrpc/connect-web'
import { createClient } from '@connectrpc/connect'
import { AuthService }          from '../gen/akashic/v1/auth_connect'
import { BankService }          from '../gen/akashic/v1/bank_connect'
import { CategoryService }      from '../gen/akashic/v1/category_connect'
import { PassageService }       from '../gen/akashic/v1/passage_connect'
import { QuestionGroupService } from '../gen/akashic/v1/question_group_connect'
import { QuestionService }      from '../gen/akashic/v1/question_connect'
import { TestService }          from '../gen/akashic/v1/test_connect'
import { AttemptService }       from '../gen/akashic/v1/attempt_connect'

const TOKEN_KEY = 'akashic_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

const transport = createConnectTransport({
  baseUrl: window.location.origin,
  interceptors: [
    (next) => async (req) => {
      const token = getToken()
      if (token) req.header.set('Authorization', `Bearer ${token}`)
      return next(req)
    },
  ],
})

export const authClient          = createClient(AuthService,          transport)
export const bankClient          = createClient(BankService,          transport)
export const categoryClient      = createClient(CategoryService,      transport)
export const passageClient       = createClient(PassageService,       transport)
export const questionGroupClient = createClient(QuestionGroupService, transport)
export const questionClient      = createClient(QuestionService,      transport)
export const testClient          = createClient(TestService,          transport)
export const attemptClient       = createClient(AttemptService,       transport)
