interface Props {
  easy: number
  medium: number
  hard: number
  total?: number
}

// One continuous bar whose colored parts are proportional to the difficulty
// mix — a 250-question test renders just as cleanly as a 10-question one.
export default function DifficultyBar({ easy, medium, hard }: Props) {
  const segments = [
    { cls: 'easy',   count: easy },
    { cls: 'medium', count: medium },
    { cls: 'hard',   count: hard },
  ].filter(s => s.count > 0)
  if (segments.length === 0) return null
  return (
    <div className="difficulty-bar" title={`${easy} easy · ${medium} medium · ${hard} hard`}>
      {segments.map(s => <span key={s.cls} className={s.cls} style={{ flex: s.count }} />)}
    </div>
  )
}
