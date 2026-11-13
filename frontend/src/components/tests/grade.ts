// Shared grading vocabulary for test attempts — used by the test-card result
// badge and the Tests-tab summary so they never drift apart.

export const GRADE_COLOR: Record<string, string> = {
  S: '#8A1C26', A: '#1F7A72', B: '#3E6390', C: '#6E5E58', D: '#A3222D',
}

export function gradeForPct(pct: number): string {
  return pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : 'D'
}

export interface BestResult { pct: number; score: number; total: number; grade: string }
