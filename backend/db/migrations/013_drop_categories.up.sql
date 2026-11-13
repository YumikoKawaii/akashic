UPDATE questions q
    SET tags = array_append(q.tags, c.name)
    FROM categories c
    WHERE c.id = q.category_id AND NOT (c.name = ANY(q.tags));

ALTER TABLE questions DROP COLUMN category_id;
DROP TABLE categories;

UPDATE banks SET default_config = default_config - 'category_ids';
UPDATE tests SET config = config - 'category_ids';
