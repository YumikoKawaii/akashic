import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Difficulty, QuestionType } from '../gen/akashic/v1/common_pb'
import { ContributionStatus, ContributionEventType } from '../gen/akashic/v1/contribution_pb'
import { contributionClient } from '../api/connect'
import { fromContribution } from '../api/adapters'
import type {
  ProposedQuestion, ReviewDecision as AppReviewDecision,
  ContributorAction, ContributionEventType as AppEventType,
} from '../types'

export const contributionKeys = {
  mine:  (bankId: string) => ['contributions', 'mine', bankId] as const,
  queue: (bankId: string) => ['contributions', 'queue', bankId] as const,
}

function toDifficulty(s: string): Difficulty {
  switch (s) {
    case 'easy':   return Difficulty.EASY
    case 'medium': return Difficulty.MEDIUM
    case 'hard':   return Difficulty.HARD
    default:       return Difficulty.UNSPECIFIED
  }
}

function toQuestionType(s: string): QuestionType {
  const map: Record<string, QuestionType> = {
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
  return map[s] ?? QuestionType.UNSPECIFIED
}

function toEventType(e: AppEventType): ContributionEventType {
  switch (e) {
    case 'approve':         return ContributionEventType.APPROVE
    case 'reject':          return ContributionEventType.REJECT
    case 'request_changes': return ContributionEventType.REQUEST_CHANGES
    case 'revise':          return ContributionEventType.REVISE
    case 'merge':           return ContributionEventType.MERGE
    case 'resubmit':        return ContributionEventType.RESUBMIT
    case 'withdraw':        return ContributionEventType.WITHDRAW
    case 'reopen':          return ContributionEventType.REOPEN
    case 'close':           return ContributionEventType.CLOSE
    default:                return ContributionEventType.UNSPECIFIED
  }
}

// toProposed builds the proto ProposedQuestion (content oneof) from the app payload.
function toProposed(p: ProposedQuestion) {
  const isMcq = p.type === 'mcq'
  return {
    categoryId: p.category_id,
    type:       toQuestionType(p.type),
    difficulty: toDifficulty(p.difficulty),
    tags:       p.tags,
    content: isMcq
      ? { case: 'choice' as const, value: { content: p.content, options: p.options ?? [], answers: p.answers ?? [] } }
      : { case: 'item'   as const, value: { content: p.content, answer:  p.answer  ?? '' } },
  }
}

export function useMyContributions(bankId: string, enabled = true) {
  return useQuery({
    queryKey: contributionKeys.mine(bankId),
    queryFn:  async () => {
      const res = await contributionClient.listMyContributions({ bankId: Number(bankId) })
      return res.contributions.map(fromContribution)
    },
    enabled: !!bankId && enabled,
  })
}

export function useContributionQueue(bankId: string, enabled = true) {
  return useQuery({
    queryKey: contributionKeys.queue(bankId),
    queryFn:  async () => {
      const res = await contributionClient.listContributions({ bankId: Number(bankId), status: ContributionStatus.UNSPECIFIED })
      return res.contributions.map(fromContribution)
    },
    enabled: !!bankId && enabled,
  })
}

export function useSubmitContribution(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (proposed: ProposedQuestion) => {
      const res = await contributionClient.submitContribution({ bankId: Number(bankId), proposed: toProposed(proposed) })
      return fromContribution(res.contribution!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contributionKeys.mine(bankId) }),
  })
}

export function useUpdateContribution(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, proposed }: { id: number; proposed: ProposedQuestion }) => {
      const res = await contributionClient.updateContribution({ bankId: Number(bankId), id, proposed: toProposed(proposed) })
      return fromContribution(res.contribution!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contributionKeys.mine(bankId) }),
  })
}

// Contributor-driven status transition: resubmit / withdraw / reopen / close.
export function useTransitionContribution(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: ContributorAction }) => {
      const res = await contributionClient.transitionContribution({ bankId: Number(bankId), id, action: toEventType(action) })
      return fromContribution(res.contribution!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contributionKeys.mine(bankId) }),
  })
}

export function useMergeContribution(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await contributionClient.mergeContribution({ bankId: Number(bankId), id })
      return fromContribution(res.contribution!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contributionKeys.mine(bankId) })
      qc.invalidateQueries({ queryKey: ['questions', bankId] })
    },
  })
}

export function useReviewContribution(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: AppReviewDecision }) => {
      const res = await contributionClient.reviewContribution({ bankId: Number(bankId), id, decision: toEventType(decision) })
      return fromContribution(res.contribution!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contributionKeys.queue(bankId) }),
  })
}

// A comment can come from either side (contributor or reviewer), so refresh both views.
export function useAddContributionComment(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: string }) => {
      const res = await contributionClient.addContributionComment({ bankId: Number(bankId), id, body })
      return fromContribution(res.contribution!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contributionKeys.mine(bankId) })
      qc.invalidateQueries({ queryKey: contributionKeys.queue(bankId) })
    },
  })
}
