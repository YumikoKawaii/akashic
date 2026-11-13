import { describe, it, expect } from 'vitest'
import { Bank as PbBank } from '../gen/akashic/v1/bank_pb'
import { Test as PbTest } from '../gen/akashic/v1/test_pb'
import { Difficulty, GroupMode, QuestionType, TestConfig as PbTestConfig, BankVisibility } from '../gen/akashic/v1/common_pb'
import { fromBank, fromTest, toProtoConfig } from './adapters'

describe('test config', () => {
  it('round-trips group mode, counts, types and tags', () => {
    const pb = toProtoConfig({ easy_count: 1, medium_count: 2, hard_count: 3, types: ['mcq', 'tf_ng'], tags: ['x'], group_mode: 'groups' })
    expect(pb.groupMode).toBe(GroupMode.GROUPS)
    expect(pb.types).toEqual([QuestionType.MCQ, QuestionType.TF_NG])

    const bank = fromBank(new PbBank({ id: 9, name: 'English', defaultConfig: pb, visibility: BankVisibility.PUBLIC }))
    expect(bank.default_config).toEqual({ easy_count: 1, medium_count: 2, hard_count: 3, types: ['mcq', 'tf_ng'], tags: ['x'], group_mode: 'groups' })
    expect(bank.visibility).toBe('public')
  })

  it('treats an unset group mode as mixed', () => {
    expect(toProtoConfig({}).groupMode).toBe(GroupMode.UNSPECIFIED)
    expect(fromBank(new PbBank({ defaultConfig: new PbTestConfig() })).default_config.group_mode).toBe('mixed')
  })
})

describe('fromTest', () => {
  it('keeps embedded groups and links questions to them by id', () => {
    const test = fromTest(new PbTest({
      id: 4, bankId: 9, name: 'Reading',
      config: new PbTestConfig({ mediumCount: 1 }),
      questions: [{
        testId: 4, questionId: 11, position: 1,
        question: { id: 11, bankId: 9, type: QuestionType.MATCHING_HEADINGS, difficulty: Difficulty.MEDIUM, groupId: 3, position: 1,
          content: { case: 'item', value: { content: 'Paragraph A', answer: 'i' } } },
      }],
      groups: [{ id: 3, bankId: 9, title: 'Urban', instructions: 'Match', passage: 'A. Trees.', options: [{ key: 'i', text: 'Cooling' }], difficulty: Difficulty.MEDIUM, tags: ['env'] }],
    }))
    expect(test.groups).toHaveLength(1)
    expect(test.groups[0]).toMatchObject({ id: 3, title: 'Urban', passage: 'A. Trees.', difficulty: 'medium', options: [{ key: 'i', text: 'Cooling' }] })
    expect(test.questions?.[0].question).toMatchObject({ group_id: 3, type: 'matching_headings', item: { answer: 'i' } })
  })
})
