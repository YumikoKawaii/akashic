-- Reviews become a general state-change log: it now records every transition
-- (reviewer approve/reject/request_changes AND contributor revise/merge), and is
-- prose-free — explanations live in contribution_comments.
ALTER TABLE contribution_reviews RENAME TO contribution_events;
ALTER TABLE contribution_events RENAME COLUMN reviewer_id TO actor_id;
ALTER TABLE contribution_events RENAME COLUMN decision TO event;
ALTER INDEX idx_contribution_reviews_contribution RENAME TO idx_contribution_events_contribution;

-- Preserve existing review notes as comments so the decision/prose split loses
-- no prose.
INSERT INTO contribution_comments (contribution_id, author_id, body, created_at)
SELECT contribution_id, actor_id, note, created_at
FROM contribution_events
WHERE note IS NOT NULL AND note <> '' AND deleted_at IS NULL;

ALTER TABLE contribution_events DROP COLUMN note;
