ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
    CHECK (type IN ('mcq', 'true_false', 'open', 'tf_ng', 'sentence_completion',
                    'word_bank_completion', 'matching', 'multi_select'));
