import type { ContributionStatus, ContributionEventType } from '../../types'

export const STATUS_META: Record<ContributionStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:           { label: 'Pending Review', color: '#9a7018', bg: 'rgba(154,112,24,0.08)', border: 'rgba(154,112,24,0.45)' },
  changes_requested: { label: 'Changes Requested', color: '#b06a18', bg: 'rgba(176,106,24,0.08)', border: 'rgba(176,106,24,0.45)' },
  approved:          { label: 'Approved', color: '#2a8a3a', bg: 'rgba(42,138,58,0.08)', border: 'rgba(42,138,58,0.45)' },
  rejected:          { label: 'Rejected', color: '#b03030', bg: 'rgba(176,48,48,0.08)', border: 'rgba(176,48,48,0.45)' },
  merged:            { label: 'Merged', color: '#6b4c8a', bg: 'rgba(107,76,138,0.08)', border: 'rgba(107,76,138,0.45)' },
  withdrawn:         { label: 'Withdrawn', color: '#7a6a55', bg: 'rgba(122,106,85,0.08)', border: 'rgba(122,106,85,0.45)' },
  closed:            { label: 'Closed', color: '#6b6b6b', bg: 'rgba(107,107,107,0.08)', border: 'rgba(107,107,107,0.40)' },
}

// Labels for the prose-free state-change log (reviewer + contributor events).
export const EVENT_META: Record<ContributionEventType, { label: string; color: string }> = {
  approve:         { label: 'Approved', color: '#2a8a3a' },
  reject:          { label: 'Rejected', color: '#b03030' },
  request_changes: { label: 'Requested changes', color: '#b06a18' },
  revise:          { label: 'Revised', color: '#9a7018' },
  merge:           { label: 'Merged', color: '#6b4c8a' },
  resubmit:        { label: 'Re-requested review', color: '#9a7018' },
  withdraw:        { label: 'Withdrawn', color: '#7a6a55' },
  reopen:          { label: 'Reopened', color: '#9a7018' },
  close:           { label: 'Closed', color: '#6b6b6b' },
}

// "Active" = still in the review cycle (revise/withdraw/merge apply).
export const isActive = (s: ContributionStatus) =>
  s === 'pending' || s === 'changes_requested' || s === 'approved'
