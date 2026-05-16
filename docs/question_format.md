# Question Format

Questions are imported as standalone rows — one question per row. No passage wrappers.

---

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `content` | string | yes | The question stem |
| `type` | string | yes | See type reference below |
| `difficulty` | string | yes | `easy` / `medium` / `hard` |
| `category_name` | string | yes | Created automatically if it doesn't exist |
| `answer` | string | non-MCQ only | The correct answer string |
| `options` | `{key, text}[]` | MCQ only | At least 2 options required |
| `answers` | string[] | MCQ only | Correct option keys, e.g. `["B"]` or `["A","C"]` |
| `tags` | string[] | no | Free labels |

---

## Type reference

| Type | `answer` | `options` + `answers` | Grading |
|---|---|---|---|
| `mcq` | — | Required | Keys sorted, set match |
| `tf_ng` | `"true"` / `"false"` / `"not given"` | — | Case-insensitive |
| `yn_ng` | `"yes"` / `"no"` / `"not given"` | — | Case-insensitive |
| `sentence_completion` | Word/phrase that fills `___` | — | Case-insensitive |
| `form_completion` | Word/phrase that fills `___` | — | Case-insensitive |
| `short_answer` | Model answer | — | Case-insensitive (not auto-scored in UI) |
| `matching_headings` | Correct heading text | — | Exact match |
| `matching_information` | Correct paragraph/item text | — | Exact match |
| `matching_features` | Correct feature/person text | — | Exact match |

---

## IELTS Reading type map

| IELTS format | System type |
|---|---|
| True / False / Not Given | `tf_ng` |
| Yes / No / Not Given | `yn_ng` |
| Multiple choice (single answer) | `mcq` |
| Multiple choice (choose N) | `mcq` with N keys in `answers` |
| Matching headings to paragraphs | `matching_headings` |
| Matching information to paragraphs | `matching_information` |
| Matching features / people / statements | `matching_features` |
| Sentence / summary / notes completion (no word box) | `sentence_completion` |
| Form / table / flow-chart completion | `form_completion` |
| Short answer questions | `short_answer` |

---

## Common mistakes (will return a specific error)

| Wrong | Correct |
|---|---|
| `"text"` | `"content"` |
| `"correct_answer"` | `"answer"` (non-MCQ) or `"answers": ["A"]` (MCQ) |
| `"true_false"` | `"tf_ng"` |
| `"open"` | `"short_answer"` |
| `"word_bank_completion"` | `"sentence_completion"` |
| `"matching"` | `"matching_headings"`, `"matching_information"`, or `"matching_features"` |
| `"multi_select"` | `"mcq"` with multiple keys in `"answers"` |
| Top-level `"type": "passage"` wrapper | Flatten — each question is its own row |

---

## Examples

### tf_ng
```json
{
  "type": "tf_ng",
  "difficulty": "medium",
  "category_name": "IELTS Reading",
  "content": "The author implies that technology always improves quality of life.",
  "answer": "not given",
  "tags": ["inference"]
}
```

### mcq (single answer)
```json
{
  "type": "mcq",
  "difficulty": "easy",
  "category_name": "Geography",
  "content": "What is the capital of France?",
  "options": [
    { "key": "A", "text": "Berlin" },
    { "key": "B", "text": "Paris" },
    { "key": "C", "text": "Rome" },
    { "key": "D", "text": "Madrid" }
  ],
  "answers": ["B"],
  "tags": ["europe"]
}
```

### mcq (multiple answers — "choose TWO")
```json
{
  "type": "mcq",
  "difficulty": "medium",
  "category_name": "Reading",
  "content": "Which TWO of the following are features of academic writing?",
  "options": [
    { "key": "A", "text": "Formal vocabulary" },
    { "key": "B", "text": "Frequent contractions" },
    { "key": "C", "text": "Objective tone" },
    { "key": "D", "text": "Personal anecdotes" }
  ],
  "answers": ["A", "C"]
}
```

### sentence_completion
```json
{
  "type": "sentence_completion",
  "difficulty": "medium",
  "category_name": "Reading",
  "content": "Forests act as carbon ___, absorbing CO₂ from the atmosphere.",
  "answer": "sinks"
}
```

### matching_features
```json
{
  "type": "matching_features",
  "difficulty": "hard",
  "category_name": "Reading",
  "content": "Argued that economic growth inevitably leads to greater inequality.",
  "answer": "Piketty",
  "tags": ["economics"]
}
```

### matching_headings
```json
{
  "type": "matching_headings",
  "difficulty": "medium",
  "category_name": "IELTS Reading",
  "content": "Paragraph C",
  "answer": "How the reaction principle works"
}
```

### short_answer
```json
{
  "type": "short_answer",
  "difficulty": "hard",
  "category_name": "Vocabulary",
  "content": "Write a sentence using the word 'ephemeral' correctly.",
  "answer": ""
}
```

---

## CSV format

Headers: `type, difficulty, category_name, content, answer, options, answers, tags`

- `options` — pipe-separated option texts; keys are auto-assigned A, B, C, D…
- `answers` — pipe-separated correct keys (e.g. `A` or `A|C`)
- `tags` — pipe-separated

```csv
type,difficulty,category_name,content,answer,options,answers,tags
tf_ng,medium,Reading,"The author implies technology always helps.",not given,,,inference
mcq,easy,Geography,"What is the capital of France?",,Berlin|Paris|Rome|Madrid,B,europe
mcq,medium,Reading,"Which TWO are features of academic writing?",,Formal vocab|Contractions|Objective tone|Anecdotes,A|C,writing
matching_features,hard,Reading,"Argued that growth leads to inequality.",Piketty,,,economics
sentence_completion,medium,Reading,"Forests act as carbon ___, absorbing CO₂.",sinks,,,environment
```
