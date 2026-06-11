interface Props {
  glyph?: string
}

export default function OrnateDivider({ glyph = '⬡' }: Props) {
  return (
    <div className="ornate-divider">
      <span className="ornate-divider-tick">◆</span>
      <span className="ornate-divider-glyph">{glyph}</span>
      <span className="ornate-divider-tick">◆</span>
    </div>
  )
}
