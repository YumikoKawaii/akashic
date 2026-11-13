export interface User {
  id: number
  email: string
  name: string
  avatar_url: string
}

export type BankRole = 'owner' | 'editor' | 'viewer'

export interface BankMember {
  id: number
  bank_id: number
  user_id: number
  user?: User
  role: BankRole
  created_at: string
  updated_at: string
}

export type GroupMode = 'mixed' | 'standalone' | 'groups'

export interface TestConfig {
  easy_count: number
  medium_count: number
  hard_count: number
  types?: string[]
  tags?: string[]
  group_mode?: GroupMode
}

export type BankVisibility = 'private' | 'public'

export interface Bank {
  id: number
  name: string
  description: string
  owner_id?: number
  default_config: TestConfig
  my_role: BankRole
  visibility: BankVisibility
  created_at: string
  updated_at: string
}

export type QuestionType =
  | 'mcq'
  | 'tf_ng'
  | 'yn_ng'
  | 'matching_headings'
  | 'matching_information'
  | 'matching_features'
  | 'sentence_completion'
  | 'form_completion'
  | 'short_answer'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface MCQOption {
  key: string
  text: string
}

export interface QQuestionItem {
  question_id: number
  content: string
  answer: string
}

export interface QMultipleChoice {
  question_id: number
  content: string
  options: MCQOption[]
  answers: string[]
}

export interface QuestionGroup {
  id: number
  bank_id: number
  title: string
  instructions: string
  passage: string
  options: MCQOption[]
  difficulty: QuestionDifficulty
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Question {
  id: number
  bank_id: number
  group_id?: number
  type: QuestionType
  difficulty: QuestionDifficulty
  tags: string[]
  position?: number
  item?: QQuestionItem
  choice?: QMultipleChoice
  created_at: string
  updated_at: string
}

export interface TestQuestion {
  test_id: number
  question_id: number
  question?: Question
  position: number
}

export interface BestResult {
  score: number
  total: number
  pct: number
}

export interface Test {
  id: number
  bank_id: number
  name: string
  description: string
  config: TestConfig
  questions?: TestQuestion[]
  groups: QuestionGroup[]
  created_by?: number
  creator?: User
  created_at: string
  updated_at: string
  best_result?: BestResult
  attempt_count?: number
}

export interface TestAttempt {
  id: number
  test_id: number
  test?: Test
  user_id?: number
  taker?: User
  answers: Record<string, string>
  score?: number
  total?: number
  started_at: string
  completed_at?: string
}

export interface QuestionFilter {
  difficulty?: string
  type?: string
  tags?: string[]
}

export interface QuestionPage {
  data:      Question[]
  total:     number
  page:      number
  page_size: number
}

export type TestSort  = 'newest' | 'oldest' | 'name' | 'size'
export type TestTaken = 'all' | 'taken' | 'untaken'

export interface TestsSummary {
  total:       number
  taken_count: number
  best_pct:    number
}

export interface TestPage {
  data:      Test[]
  total:     number
  page:      number
  page_size: number
  summary:   TestsSummary
}

export interface PublicBank {
  id: number
  name: string
  description: string
  owner?: User
  question_count: number
}
