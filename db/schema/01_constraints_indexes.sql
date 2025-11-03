-- Library Management System - Supporting Indexes & Constraints
-- Author: Mitesh Kumar Anshu
-- Purpose: Tighten data integrity and performance beyond the base tables

SET search_path TO library_app;

-- Make sure each book has only one main author marked
CREATE UNIQUE INDEX ux_book_authors_primary ON book_authors(book_id)
WHERE is_primary;

-- Finds copies for a book quickly
CREATE INDEX idx_book_copies_book ON book_copies(book_id);
-- Filters copies by status without delay
CREATE INDEX idx_book_copies_status ON book_copies(status);
-- Speeds up member loan lookups
CREATE INDEX idx_loans_member_status ON loans(member_id, status);
-- Helps overdue checks run fast
CREATE INDEX idx_loans_due_date ON loans(due_date);
-- Blocks the same copy from being loaned twice
CREATE UNIQUE INDEX ux_loans_copy_active ON loans(copy_id)
WHERE status IN ('ACTIVE','OVERDUE');

-- Helps track fees per member fast
CREATE INDEX idx_loan_fees_member_status ON loan_fees(member_id, status);
-- Stops more than one open alert per loan
CREATE UNIQUE INDEX ux_member_alerts_active ON member_alerts(loan_id, alert_type)
WHERE resolved_at IS NULL;

-- Shared helper to update the timestamp field
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Update member rows with the latest timestamp
CREATE TRIGGER trg_members_updated
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Update book rows with the latest timestamp
CREATE TRIGGER trg_books_updated
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Update copy rows with the latest timestamp
CREATE TRIGGER trg_book_copies_updated
BEFORE UPDATE ON book_copies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Update loan rows with the latest timestamp
CREATE TRIGGER trg_loans_updated
BEFORE UPDATE ON loans
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
