-- Library Management System - Admin Functions
-- Author: Mitesh Kumar Anshu
-- Module: Admin functions for book and copy management with proper validation

SET search_path TO library_app;

-- =====================================================================
-- FUNCTION: fn_admin_add_book
-- Purpose: Add a new book to the catalog
-- Parameters: title, isbn, publisher_id, year, language, edition, description
-- Returns: book_id of newly created book
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_admin_add_book(
  p_title VARCHAR(255),
  p_isbn VARCHAR(20),
  p_publisher_id INT DEFAULT NULL,
  p_publication_year INT DEFAULT NULL,
  p_language VARCHAR(50) DEFAULT NULL,
  p_edition VARCHAR(50) DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  new_book_id INT,
  isbn VARCHAR(20),
  title VARCHAR(255),
  created_at TIMESTAMP
) AS $$
BEGIN
  INSERT INTO books (
    isbn, title, publisher_id, publication_year, language, edition, description
  )
  VALUES (
    p_isbn, p_title, p_publisher_id, p_publication_year, p_language, p_edition, p_description
  )
  RETURNING book_id, books.isbn, books.title, books.created_at
  INTO new_book_id, isbn, title, created_at;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: fn_admin_delete_book
-- Purpose: Delete a book and all related data (authors, genres, copies)
--          Block deletion if any copy is currently LOANED or OVERDUE
-- Parameters: book_id
-- Returns: success/error message
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_admin_delete_book(p_book_id INT)
RETURNS TABLE (
  success BOOLEAN,
  message VARCHAR(255)
) AS $$
DECLARE
  v_loaned_count INT;
  v_overdue_count INT;
BEGIN
  -- Check if any copy of this book is currently loaned
  SELECT COUNT(*) INTO v_loaned_count
  FROM loans l
  JOIN book_copies bc ON bc.copy_id = l.copy_id
  WHERE bc.book_id = p_book_id
    AND l.status = 'ACTIVE'
    AND l.returned_date IS NULL;
  
  IF v_loaned_count > 0 THEN
    success := FALSE;
    message := 'Cannot delete book: ' || v_loaned_count || ' copy(ies) currently loaned';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if any copy of this book is overdue
  SELECT COUNT(*) INTO v_overdue_count
  FROM loans l
  JOIN book_copies bc ON bc.copy_id = l.copy_id
  WHERE bc.book_id = p_book_id
    AND l.status = 'OVERDUE'
    AND l.returned_date IS NULL;
  
  IF v_overdue_count > 0 THEN
    success := FALSE;
    message := 'Cannot delete book: ' || v_overdue_count || ' copy(ies) currently overdue';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Delete the book (cascades to book_authors, book_genres, and book_copies due to FK constraints)
  DELETE FROM books WHERE book_id = p_book_id;
  
  IF FOUND THEN
    success := TRUE;
    message := 'Book and all related data deleted successfully';
  ELSE
    success := FALSE;
    message := 'Book not found';
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: fn_admin_add_copy
-- Purpose: Add a new book copy to inventory
-- Parameters: book_id, location_id, barcode, acquisition_date (optional)
-- Returns: copy_id and details of newly created copy
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_admin_add_copy(
  p_book_id INT,
  p_location_id INT,
  p_barcode VARCHAR(50),
  p_acquisition_date DATE DEFAULT NULL
)
RETURNS TABLE (
  new_copy_id INT,
  book_id INT,
  barcode VARCHAR(50),
  status VARCHAR(15),
  location_id INT,
  created_at TIMESTAMP
) AS $$
BEGIN
  INSERT INTO book_copies (
    book_id, location_id, barcode, acquisition_date, status
  )
  VALUES (
    p_book_id, p_location_id, p_barcode, COALESCE(p_acquisition_date, CURRENT_DATE), 'AVAILABLE'
  )
  RETURNING copy_id, book_copies.book_id, book_copies.barcode, book_copies.status, book_copies.location_id, book_copies.created_at
  INTO new_copy_id, book_id, barcode, status, location_id, created_at;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: fn_admin_delete_copy
-- Purpose: Delete a book copy from inventory
--          Allow only if copy is AVAILABLE
--          Block if copy is LOANED, OVERDUE, or other active states
-- Parameters: copy_id
-- Returns: success/error message
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_admin_delete_copy(p_copy_id INT)
RETURNS TABLE (
  success BOOLEAN,
  message VARCHAR(255)
) AS $$
DECLARE
  v_copy_status VARCHAR(15);
  v_loaned_count INT;
BEGIN
  -- Get the current status of the copy
  SELECT status INTO v_copy_status
  FROM book_copies
  WHERE copy_id = p_copy_id;
  
  IF v_copy_status IS NULL THEN
    success := FALSE;
    message := 'Copy not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if copy is currently loaned
  SELECT COUNT(*) INTO v_loaned_count
  FROM loans
  WHERE copy_id = p_copy_id
    AND status IN ('ACTIVE', 'OVERDUE')
    AND returned_date IS NULL;
  
  IF v_loaned_count > 0 THEN
    success := FALSE;
    message := 'Cannot delete copy: currently loaned or overdue';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if copy is in non-AVAILABLE status
  IF v_copy_status != 'AVAILABLE' THEN
    success := FALSE;
    message := 'Cannot delete copy: current status is ' || v_copy_status || '. Only AVAILABLE copies can be deleted.';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Delete the copy
  DELETE FROM book_copies WHERE copy_id = p_copy_id;
  
  success := TRUE;
  message := 'Copy deleted successfully';
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
