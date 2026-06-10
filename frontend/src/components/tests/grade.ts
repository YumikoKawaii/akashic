// Shared grading vocabulary for test attempts — used by the test-card result
// badge and the Tests-tab summary so they never drift apart.

export const GRADE_COLOR: Record<string, string> = {
  S: '#c89030', A: '#2a8a3a', B: '#3a60c0', C: '#b8942a', D: '#b03030',
}

export function gradeForPct(pct: number): string {
  return pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : 'D'
}

export interface BestResult { pct: number; score: number; total: number; grade: string }
