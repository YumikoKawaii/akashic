// Adapters from proto-generated types (camelCase, Timestamp) to app interface types (snake_case, string).
import type { Timestamp } from '@bufbuild/protobuf'
import { Difficulty, QuestionType, BankRole } from '../gen/akashic/v1/common_pb'
import type { Bank as PbBank, BankWithRole as PbBankWithRole, BankMember as PbBankMember } from '../gen/akashic/v1/bank_pb'
import type { Category as PbCategory } from '../gen/akashic/v1/category_pb'
import type { Passage as PbPassage } from '../gen/akashic/v1/passage_pb'
import type { QuestionGroup as PbQuestionGroup } from '../gen/akashic/v1/question_group_pb'
import type { Question as PbQuestion } from '../gen/akashic/v1/question_pb'
import type { Test as PbTest } from '../gen/akashic/v1/test_pb'
import type { Attempt as PbAttempt } from '../gen/akashic/v1/attempt_pb'
import type {
  Bank, BankMember, BankRole as AppBankRole, Category, Passage, PassageParagraph,
  QuestionGroup, GroupContext, Question, Test, TestQuestion, TestAttempt,
  QuestionType as AppQuestionType, QuestionDifficulty, MCQOption, QQuestionItem, QMultipleChoice
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
  created_at: ts(b.createdAt),
  updated_at: ts(b.updatedAt),
})

export const fromBankWithRole = (bwr: PbBankWithRole): Bank => ({
  ...(bwr.bank ? fromBank(bwr.bank) : {} as Bank),
  my_role: bwr.myRole as AppBankRole,
})

export const fromBankMember = (m: PbBankMember): BankMember => ({
  id:         m.id,
  bank_id:    m.bankId,
  user_id:    m.userId,
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
  created_at: ts(t.createdAt),
  updated_at: ts(t.updatedAt),
})

export const fromAttempt = (a: PbAttempt): TestAttempt => ({
  id:           a.id,
  test_id:      a.testId,
  answers:      a.answers,
  score:        a.score !== undefined ? a.score : undefined,
  total:        a.total !== undefined ? a.total : undefined,
  started_at:   ts(a.startedAt),
  completed_at: a.completedAt ? ts(a.completedAt) : undefined,
})
