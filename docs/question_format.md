# Question Format

JSON array. Each object:

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | The question |
| `type` | string | yes | `mcq` / `true_false` / `open` |
| `difficulty` | string | yes | `easy` / `medium` / `hard` |
| `category_name` | string | yes | Created automatically if new |
| `options` | string[] | mcq/true_false | Choices to display |
| `correct_answer` | string | yes | Must match one option exactly (ignored for `open`) |
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
