import { Question } from '../../types'

export function questionContent(q: Question): string {
  return q.item?.content ?? q.choice?.content ?? ''
}

export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr]
  let s = seed >>> 0
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function checkAnswer(q: Question, answer: string): boolean {
  const got = answer.trim()
  if (q.choice) {
    const want = [...q.choice.answers].sort()
    const got2 = got.split('|').map(s => s.trim()).filter(Boolean).sort()
    return got2.length === want.length && got2.every((v, i) => v === want[i])
  }
  if (!q.item) return false
  return got.toLowerCase() === q.item.answer.trim().toLowerCase()
}
