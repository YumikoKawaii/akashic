// Adapters from proto-generated types (camelCase, Timestamp) to app interface types (snake_case, string).
import type { Timestamp } from '@bufbuild/protobuf'
import { Difficulty, QuestionType, BankRole, BankVisibility } from '../gen/akashic/v1/common_pb'
import { ContributionStatus, ContributionEventType } from '../gen/akashic/v1/contribution_pb'
import type {
  Contribution as PbContribution,
  ContributionEvent as PbContributionEvent,
  ContributionComment as PbContributionComment,
  ProposedQuestion as PbProposedQuestion,
} from '../gen/akashic/v1/contribution_pb'
import type { Bank as PbBank, BankWithRole as PbBankWithRole, BankMember as PbBankMember, PublicBankCard as PbPublicBankCard } from '../gen/akashic/v1/bank_pb'
import type { Category as PbCategory } from '../gen/akashic/v1/category_pb'
import type { Passage as PbPassage } from '../gen/akashic/v1/passage_pb'
import type { QuestionGroup as PbQuestionGroup } from '../gen/akashic/v1/question_group_pb'
import type { Question as PbQuestion } from '../gen/akashic/v1/question_pb'
import type { Test as PbTest } from '../gen/akashic/v1/test_pb'
import type { Attempt as PbAttempt } from '../gen/akashic/v1/attempt_pb'
import type {
  Bank, BankMember, BankRole as AppBankRole, BankVisibility as AppBankVisibility,
  Category, Passage, PassageParagraph,
  QuestionGroup, GroupContext, Question, Test, TestQuestion, TestAttempt,
  QuestionType as AppQuestionType, QuestionDifficulty, MCQOption, QQuestionItem, QMultipleChoice,
  Contribution, ContributionEvent, ContributionComment, ProposedQuestion, User,
  ContributionStatus as AppContributionStatus, ContributionEventType as AppEventType,
  PublicBank,
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

export const fromBank = (b: PbBank): Bank => ({
  id:             b.id,
  name:           b.name,
  description:    b.description,
  owner_id:       b.ownerId ?? undefined,
  default_config: {
    easy_count:      b.defaultConfig?.easyCount   ?? 0,
    medium_count:    b.defaultConfig?.mediumCount ?? 0,
    hard_count:      b.defaultConfig?.hardCount   ?? 0,
    category_ids:    b.defaultConfig?.categoryIds ?? [],
    passage_ids:     b.defaultConfig?.passageIds  ?? [],
    types:           b.defaultConfig?.types.map(questionType) ?? [],
    tags:            b.defaultConfig?.tags ?? [],
    standalone_only: b.defaultConfig?.standaloneOnly ?? false,
  },
  my_role:    'viewer',
  visibility: bankVisibility(b.visibility),
  created_at: ts(b.createdAt),
  updated_at: ts(b.updatedAt),
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
  category_count: c.categoryCount,
})

export const fromBankMember = (m: PbBankMember): BankMember => ({
  id:         m.id,
  bank_id:    m.bankId,
  user_id:    m.userId,
  user:       m.user ? { id: m.user.id, email: m.user.email, name: m.user.name, avatar_url: m.user.avatarUrl } : undefined,
  role:       bankRole(m.role),
  created_at: ts(m.createdAt),
  updated_at: ts(m.updatedAt),
})

export const fromCategory = (c: PbCategory): Category => ({
  id:          c.id,
  bank_id:     c.bankId,
  name:        c.name,
  description: c.description,
  created_at:  ts(c.createdAt),
  updated_at:  ts(c.updatedAt),
})

export const fromPassage = (p: PbPassage): Passage => ({
  id:          p.id,
  bank_id:     p.bankId,
  category_id: p.categoryId,
  title:       p.title,
  difficulty:  difficulty(p.difficulty),
  paragraphs:  p.paragraphs.map(pp => ({ label: pp.label, text: pp.text } as PassageParagraph)),
  created_at:  ts(p.createdAt),
  updated_at:  ts(p.updatedAt),
})

export const fromQuestionGroup = (g: PbQuestionGroup): QuestionGroup => {
  const ctx = g.context
  const c: GroupContext = {}
  if (ctx?.context.case === 'matchingHeadings') {
    c.sections = ctx.context.value.sections.map(s => ({ key: s.key, label: s.label }))
    c.headings  = ctx.context.value.headings.map(h  => ({ key: h.key,  text: h.text  }))
  } else if (ctx?.context.case === 'matchingInformation') {
    c.paragraphs = ctx.context.value.paragraphs.map(p => ({ key: p.key, text: p.text }))
  } else if (ctx?.context.case === 'matchingFeatures') {
    c.options = ctx.context.value.options.map(o => ({ key: o.key, text: o.text }))
  } else if (ctx?.context.case === 'wordGroup') {
    c.word_limit = ctx.context.value.wordLimit
    c.word_bank  = ctx.context.value.wordBank
  } else if (ctx?.context.case === 'formCompletion') {
    c.word_limit = ctx.context.value.wordLimit
    c.word_bank  = ctx.context.value.wordBank
    c.form_type  = ctx.context.value.formType
    c.title      = ctx.context.value.title
    c.template   = ctx.context.value.template
  }
  return {
    id:          g.id,
    bank_id:     g.bankId,
    category_id: g.categoryId,
    passage_id:  g.passageId ?? undefined,
    passage:     g.passage ? fromPassage(g.passage) : undefined,
    type:        questionType(g.type),
    difficulty:  difficulty(g.difficulty),
    context:     c,
    created_at:  ts(g.createdAt),
    updated_at:  ts(g.updatedAt),
  }
}

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
    id:          q.id,
    bank_id:     q.bankId,
    category_id: q.categoryId,
    group_id:    q.groupId ?? undefined,
    type:        questionType(q.type),
    difficulty:  difficulty(q.difficulty),
    tags:        q.tags,
    position:    q.position ?? undefined,
    item,
    choice,
    group:       q.group ? fromQuestionGroup(q.group) : undefined,
    created_at:  ts(q.createdAt),
    updated_at:  ts(q.updatedAt),
  }
}

export const fromTest = (t: PbTest): Test => ({
  id:          t.id,
  bank_id:     t.bankId,
  name:        t.name,
  description: t.description,
  config: {
    easy_count:      t.config?.easyCount   ?? 0,
    medium_count:    t.config?.mediumCount ?? 0,
    hard_count:      t.config?.hardCount   ?? 0,
    category_ids:    t.config?.categoryIds ?? [],
    passage_ids:     t.config?.passageIds  ?? [],
    types:           t.config?.types.map(questionType) ?? [],
    tags:            t.config?.tags ?? [],
    standalone_only: t.config?.standaloneOnly ?? false,
  },
  questions: t.questions.map(tq => ({
    test_id:     tq.testId,
    question_id: tq.questionId,
    position:    tq.position,
    question:    tq.question ? fromQuestion(tq.question) : undefined,
  } as TestQuestion)),
  created_by: t.createdBy ?? undefined,
  creator:    fromUser(t.creator),
  created_at: ts(t.createdAt),
  updated_at: ts(t.updatedAt),
  best_result: t.bestResult
    ? { score: t.bestResult.score, total: t.bestResult.total, pct: t.bestResult.pct }
    : undefined,
  attempt_count: t.attemptCount,
})

const contributionStatus = (s: ContributionStatus): AppContributionStatus => {
  switch (s) {
    case ContributionStatus.PENDING:           return 'pending'
    case ContributionStatus.CHANGES_REQUESTED: return 'changes_requested'
    case ContributionStatus.APPROVED:          return 'approved'
    case ContributionStatus.REJECTED:          return 'rejected'
    case ContributionStatus.MERGED:            return 'merged'
    case ContributionStatus.WITHDRAWN:         return 'withdrawn'
    case ContributionStatus.CLOSED:            return 'closed'
    default:                                   return 'pending'
  }
}

const eventType = (e: ContributionEventType): AppEventType => {
  switch (e) {
    case ContributionEventType.APPROVE:         return 'approve'
    case ContributionEventType.REJECT:          return 'reject'
    case ContributionEventType.REQUEST_CHANGES: return 'request_changes'
    case ContributionEventType.REVISE:          return 'revise'
    case ContributionEventType.MERGE:           return 'merge'
    case ContributionEventType.RESUBMIT:        return 'resubmit'
    case ContributionEventType.WITHDRAW:        return 'withdraw'
    case ContributionEventType.REOPEN:          return 'reopen'
    case ContributionEventType.CLOSE:           return 'close'
    default:                                    return 'revise'
  }
}

const fromUser = (u?: { id: number; email: string; name: string; avatarUrl: string }): User | undefined =>
  u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatarUrl } : undefined

const fromProposedQuestion = (p: PbProposedQuestion): ProposedQuestion => {
  const base = {
    category_id: p.categoryId,
    type:        questionType(p.type),
    difficulty:  difficulty(p.difficulty),
    tags:        p.tags,
  }
  if (p.content.case === 'choice') {
    return {
      ...base,
      content: p.content.value.content,
      options: p.content.value.options.map(o => ({ key: o.key, text: o.text } as MCQOption)),
      answers: p.content.value.answers,
    }
  }
  if (p.content.case === 'item') {
    return { ...base, content: p.content.value.content, answer: p.content.value.answer }
  }
  return { ...base, content: '' }
}

export const fromContributionEvent = (e: PbContributionEvent): ContributionEvent => ({
  id:         e.id,
  actor_id:   e.actorId,
  event:      eventType(e.event),
  created_at: ts(e.createdAt),
  actor:      fromUser(e.actor),
})

export const fromContributionComment = (c: PbContributionComment): ContributionComment => ({
  id:         c.id,
  author_id:  c.authorId,
  body:       c.body,
  created_at: ts(c.createdAt),
  author:     fromUser(c.author),
})

export const fromContribution = (c: PbContribution): Contribution => ({
  id:                 c.id,
  bank_id:            c.bankId,
  contributor_id:     c.contributorId,
  proposed:           c.proposed ? fromProposedQuestion(c.proposed) : { category_id: 0, type: 'mcq', difficulty: 'medium', tags: [], content: '' },
  status:             contributionStatus(c.status),
  question_id:        c.questionId ?? undefined,
  events:             c.events.map(fromContributionEvent),
  comments:           c.comments.map(fromContributionComment),
  created_at:         ts(c.createdAt),
  updated_at:         ts(c.updatedAt),
  contributor:        fromUser(c.contributor),
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
