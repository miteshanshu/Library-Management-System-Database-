-- =====================================================================

--   These indexes power the global search feature and ensure PostgreSQL
--   can perform efficient fuzzy matching using pg_trgm.
--
-- Requirements:
--   - pg_trgm extension must be enabled (see 04_enable_pg_trgm.sql)
--
-- Safe to run multiple times (idempotent).
-- =====================================================================

SET search_path TO library_app;

-- ---------------------------------------------------------
-- CLEANUP: Remove incorrect index that caused catalog crash
-- ---------------------------------------------------------
DROP INDEX IF EXISTS library_app.idx_members_name_trgm;



-- ---------------------------------------------------------
-- BOOKS
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_books_title_trgm
  ON books USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_isbn_trgm
  ON books USING gin (isbn gin_trgm_ops);



-- ---------------------------------------------------------
-- AUTHORS
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_authors_first_trgm
  ON authors USING gin (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_authors_last_trgm
  ON authors USING gin (last_name gin_trgm_ops);



-- ---------------------------------------------------------
-- BOOK COPIES
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_copies_barcode_trgm
  ON book_copies USING gin (barcode gin_trgm_ops);



-- ---------------------------------------------------------
-- MEMBERS  (Fixed + Completed)
-- ---------------------------------------------------------
-- Correct trigram indexes for member searchable columns

CREATE INDEX IF NOT EXISTS idx_members_first_trgm
  ON members USING gin (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_members_last_trgm
  ON members USING gin (last_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_members_card_trgm
  ON members USING gin (card_number gin_trgm_ops);



-- ---------------------------------------------------------
-- USERS
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm
  ON users USING gin (full_name gin_trgm_ops);
