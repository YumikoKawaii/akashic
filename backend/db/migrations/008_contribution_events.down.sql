ALTER TABLE contribution_events ADD COLUMN note TEXT NOT NULL DEFAULT '';
ALTER INDEX idx_contribution_events_contribution RENAME TO idx_contribution_reviews_contribution;
ALTER TABLE contribution_events RENAME COLUMN event TO decision;
ALTER TABLE contribution_events RENAME COLUMN actor_id TO reviewer_id;
ALTER TABLE contribution_events RENAME TO contribution_reviews;
