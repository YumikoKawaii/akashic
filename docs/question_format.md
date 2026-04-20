# Question Format

JSON array. Each object:

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | The question |
| `type` | string | yes | `mcq` / `true_false` / `open` / `tf_ng` / `sentence_completion` |
| `difficulty` | string | yes | `easy` / `medium` / `hard` |
| `category_name` | string | yes | Created automatically if new |
| `options` | string[] | mcq/true_false | Choices to display |
| `correct_answer` | string | yes | Must match one option exactly for `mcq`/`true_false`/`tf_ng`; the word/phrase that fills the blank for `sentence_completion`; ignored for `open` |
| `tags` | string[] | no | Free labels |

## mcq
```json
{
  "text": "Which particle marks the subject in Japanese?",
  "type": "mcq",
  "difficulty": "medium",
  "category_name": "Grammar",
  "options": ["は", "が", "を", "に"],
  "correct_answer": "が",
  "tags": ["particles"]
}
```

## true_false
```json
{
  "text": "The sun rises in the west.",
  "type": "true_false",
  "difficulty": "easy",
  "category_name": "General",
  "options": ["True", "False"],
  "correct_answer": "False",
  "tags": []
}
```

## open
```json
{
  "text": "Explain the difference between 'affect' and 'effect'.",
  "type": "open",
  "difficulty": "hard",
  "category_name": "Vocabulary",
  "options": [],
  "correct_answer": "",
  "tags": ["writing"]
}
```

## tf_ng
```json
{
  "text": "The author implies that technology always improves quality of life.",
  "type": "tf_ng",
  "difficulty": "medium",
  "category_name": "Reading",
  "options": [],
  "correct_answer": "Not Given",
  "tags": ["inference"]
}
```

## sentence_completion
Use `___` in `text` to mark the single blank. `correct_answer` is the expected word or phrase; matching is case-insensitive and whitespace-trimmed. Leave `options` empty.

```json
{
  "text": "The ___ was a period of rapid industrial growth in 18th-century Britain.",
  "type": "sentence_completion",
  "difficulty": "medium",
  "category_name": "History",
  "options": [],
  "correct_answer": "Industrial Revolution",
  "tags": ["history", "britain"]
}
```
