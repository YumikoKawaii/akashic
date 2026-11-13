import type { Timestamp } from '@bufbuild/protobuf'
import { Difficulty, QuestionType, BankRole, BankVisibility, GroupMode, TestConfig as PbTestConfig } from '../gen/akashic/v1/common_pb'
import type { Bank as PbBank, BankWithRole as PbBankWithRole, BankMember as PbBankMember, PublicBankCard as PbPublicBankCard } from '../gen/akashic/v1/bank_pb'
import type { Question as PbQuestion, QuestionGroup as PbQuestionGroup } from '../gen/akashic/v1/question_pb'
import type { Test as PbTest } from '../gen/akashic/v1/test_pb'
import type { Attempt as PbAttempt } from '../gen/akashic/v1/attempt_pb'
import type {
  Bank, BankMember, BankRole as AppBankRole, BankVisibility as AppBankVisibility,
  GroupMode as AppGroupMode, QuestionGroup, Question, Test, TestConfig, TestQuestion, TestAttempt,
  QuestionType as AppQuestionType, QuestionDifficulty, MCQOption, QQuestionItem, QMultipleChoice,
  User, PublicBank,
} from '../types'

const ts = (t?: Timestamp | null): string =>
  t ? t.toDate().toISOString() : ''

const difficulty = (d: Difficulty): QuestionDifficulty => {
  switch (d) {
    case Difficulty.EASY:   return 'easy'
    case Difficulty.MEDIUM: return 'medium'
    case Difficulty.HARD:   return 'hard'
    default:                return 'easy'
  }
}

const questionType = (t: QuestionType): AppQuestionType => {
  switch (t) {
    case QuestionType.MCQ:                  return 'mcq'
    case QuestionType.TF_NG:                return 'tf_ng'
    case QuestionType.YN_NG:                return 'yn_ng'
    case QuestionType.SHORT_ANSWER:         return 'short_answer'
    case QuestionType.SENTENCE_COMPLETION:  return 'sentence_completion'
    case QuestionType.FORM_COMPLETION:      return 'form_completion'
    case QuestionType.MATCHING_HEADINGS:    return 'matching_headings'
    case QuestionType.MATCHING_INFORMATION: return 'matching_information'
    case QuestionType.MATCHING_FEATURES:    return 'matching_features'
    default:                                return 'mcq'
  }
}

const bankRole = (r: BankRole): AppBankRole => {
  switch (r) {
    case BankRole.OWNER:  return 'owner'
    case BankRole.EDITOR: return 'editor'
    default:              return 'viewer'
  }
}

const bankVisibility = (v: BankVisibility): AppBankVisibility =>
  v === BankVisibility.PUBLIC ? 'public' : 'private'

export const toBankVisibility = (v: AppBankVisibility): BankVisibility =>
  v === 'public' ? BankVisibility.PUBLIC : BankVisibility.PRIVATE

const QUESTION_TYPE_TO_PROTO: Record<string, QuestionType> = {
  mcq:                  QuestionType.MCQ,
  tf_ng:                QuestionType.TF_NG,
  yn_ng:                QuestionType.YN_NG,
  short_answer:         QuestionType.SHORT_ANSWER,
  sentence_completion:  QuestionType.SENTENCE_COMPLETION,
  form_completion:      QuestionType.FORM_COMPLETION,
  matching_headings:    QuestionType.MATCHING_HEADINGS,
  matching_information: QuestionType.MATCHING_INFORMATION,
  matching_features:    QuestionType.MATCHING_FEATURES,
}

export const toQuestionType = (s: string): QuestionType =>
  QUESTION_TYPE_TO_PROTO[s] ?? QuestionType.UNSPECIFIED

const groupMode = (m?: GroupMode): AppGroupMode => {
  switch (m) {
    case GroupMode.STANDALONE: return 'standalone'
    case GroupMode.GROUPS:     return 'groups'
    default:                   return 'mixed'
  }
}

const toGroupMode = (m?: AppGroupMode): GroupMode => {
  switch (m) {
    case 'standalone': return GroupMode.STANDALONE
    case 'groups':     return GroupMode.GROUPS
    default:           return GroupMode.UNSPECIFIED
  }
}

const fromConfig = (c?: PbTestConfig): TestConfig => ({
  easy_count:   c?.easyCount   ?? 0,
  medium_count: c?.mediumCount ?? 0,
  hard_count:   c?.hardCount   ?? 0,
  types:        c?.types.map(questionType) ?? [],
  tags:         c?.tags ?? [],
  group_mode:   groupMode(c?.groupMode),
})

export const toProtoConfig = (cfg?: Partial<TestConfig>): PbTestConfig =>
  new PbTestConfig({
    easyCount:   cfg?.easy_count   ?? 0,
    mediumCount: cfg?.medium_count ?? 0,
    hardCount:   cfg?.hard_count   ?? 0,
    types:       (cfg?.types ?? []).map(toQuestionType),
    tags:        cfg?.tags ?? [],
    groupMode:   toGroupMode(cfg?.group_mode),
  })

const fromUser = (u?: { id: number; email: string; name: string; avatarUrl: string }): User | undefined =>
  u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatarUrl } : undefined

export const fromBank = (b: PbBank): Bank => ({
  id:             b.id,
  name:           b.name,
  description:    b.description,
  owner_id:       b.ownerId ?? undefined,
  default_config: fromConfig(b.defaultConfig),
  my_role:        'viewer',
  visibility:     bankVisibility(b.visibility),
  created_at:     ts(b.createdAt),
  updated_at:     ts(b.updatedAt),
})

export const fromBankWithRole = (bwr: PbBankWithRole): Bank => ({
  ...(bwr.bank ? fromBank(bwr.bank) : {} as Bank),
  my_role: bwr.myRole as AppBankRole,
})

export const fromPublicBankCard = (c: PbPublicBankCard): PublicBank => ({
  id:             c.id,
  name:           c.name,
  description:    c.description,
  owner:          fromUser(c.owner),
  question_count: c.questionCount,
})

export const fromBankMember = (m: PbBankMember): BankMember => ({
  id:         m.id,
  bank_id:    m.bankId,
  user_id:    m.userId,
  user:       fromUser(m.user),
  role:       bankRole(m.role),
  created_at: ts(m.createdAt),
  updated_at: ts(m.updatedAt),
})

export const fromQuestionGroup = (g: PbQuestionGroup): QuestionGroup => ({
  id:           g.id,
  bank_id:      g.bankId,
  title:        g.title,
  instructions: g.instructions,
  passage:      g.passage,
  options:      g.options.map(o => ({ key: o.key, text: o.text })),
  difficulty:   difficulty(g.difficulty),
  tags:         g.tags,
  created_at:   ts(g.createdAt),
  updated_at:   ts(g.updatedAt),
})

export const fromQuestion = (q: PbQuestion): Question => {
  let item: QQuestionItem | undefined
  let choice: QMultipleChoice | undefined

  if (q.content.case === 'item') {
    item = { question_id: q.id, content: q.content.value.content, answer: q.content.value.answer }
  } else if (q.content.case === 'choice') {
    const opts: MCQOption[] = q.content.value.options.map(o => ({ key: o.key, text: o.text }))
    choice = {
      question_id: q.id,
      content:     q.content.value.content,
      options:     opts,
      answers:     q.content.value.answers,
    }
  }

  return {
    id:         q.id,
    bank_id:    q.bankId,
    group_id:   q.groupId ?? undefined,
    type:       questionType(q.type),
    difficulty: difficulty(q.difficulty),
    tags:       q.tags,
    position:   q.position ?? undefined,
    item,
    choice,
    created_at: ts(q.createdAt),
    updated_at: ts(q.updatedAt),
  }
}

export const fromTest = (t: PbTest): Test => ({
  id:          t.id,
  bank_id:     t.bankId,
  name:        t.name,
  description: t.description,
  config:      fromConfig(t.config),
  questions: t.questions.map(tq => ({
    test_id:     tq.testId,
    question_id: tq.questionId,
    position:    tq.position,
    question:    tq.question ? fromQuestion(tq.question) : undefined,
  } as TestQuestion)),
  groups:     t.groups.map(fromQuestionGroup),
  created_by: t.createdBy ?? undefined,
  creator:    fromUser(t.creator),
  created_at: ts(t.createdAt),
  updated_at: ts(t.updatedAt),
  best_result: t.bestResult
    ? { score: t.bestResult.score, total: t.bestResult.total, pct: t.bestResult.pct }
    : undefined,
  attempt_count: t.attemptCount,
})

export const fromAttempt = (a: PbAttempt): TestAttempt => ({
  id:           a.id,
  test_id:      a.testId,
  user_id:      a.userId ?? undefined,
  taker:        fromUser(a.taker),
  answers:      a.answers,
  score:        a.score !== undefined ? a.score : undefined,
  total:        a.total !== undefined ? a.total : undefined,
  started_at:   ts(a.startedAt),
  completed_at: a.completedAt ? ts(a.completedAt) : undefined,
  test:         a.test ? fromTest(a.test) : undefined,
})
