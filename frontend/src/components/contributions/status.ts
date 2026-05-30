import type { ContributionStatus, ReviewDecision } from '../../types'

export const STATUS_META: Record<ContributionStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:           { label: 'Pending Review', color: '#9a7018', bg: 'rgba(154,112,24,0.08)', border: 'rgba(154,112,24,0.45)' },
  changes_requested: { label: 'Changes Requested', color: '#b06a18', bg: 'rgba(176,106,24,0.08)', border: 'rgba(176,106,24,0.45)' },
  approved:          { label: 'Approved', color: '#2a8a3a', bg: 'rgba(42,138,58,0.08)', border: 'rgba(42,138,58,0.45)' },
  rejected:          { label: 'Rejected', color: '#b03030', bg: 'rgba(176,48,48,0.08)', border: 'rgba(176,48,48,0.45)' },
  merged:            { label: 'Merged', color: '#6b4c8a', bg: 'rgba(107,76,138,0.08)', border: 'rgba(107,76,138,0.45)' },
}

export const DECISION_META: Record<ReviewDecision, { label: string; color: string }> = {
  approve:         { label: 'Approved', color: '#2a8a3a' },
  reject:          { label: 'Rejected', color: '#b03030' },
  request_changes: { label: 'Requested changes', color: '#b06a18' },
}

// A non-terminal contribution can still be revised/withdrawn by its contributor.
export const isNonTerminal = (s: ContributionStatus) =>
  s === 'pending' || s === 'changes_requested' || s === 'approved'
