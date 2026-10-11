-- An unlink invalidates every earlier initialization, including requests that
-- have not persisted their challenge yet. This generation is private state.
ALTER TABLE solar_company_partners ADD COLUMN line_link_generation INTEGER NOT NULL DEFAULT 0
  CHECK(typeof(line_link_generation)='integer' AND line_link_generation>=0);
