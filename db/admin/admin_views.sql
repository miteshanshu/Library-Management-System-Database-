-- Library Management System - Admin Stock Status View
-- Author: Mitesh Kumar Anshu
-- Module: Stock status view for librarians to track availability

SET search_path TO library_app;

-- =====================================================================
-- VIEW: vw_book_stock_status
-- Purpose: Display stock status for all books with out-of-stock indicator
-- Columns: book_id, isbn, title, total_copies, available_copies, is_out_of_stock
-- Usage: Used by librarians to see which books are out of stock
-- =====================================================================
CREATE OR REPLACE VIEW vw_book_stock_status AS
SELECT 
  b.book_id,
  b.isbn,
  b.title,
  b.language,
  b.edition,
  COUNT(bc.copy_id) AS total_copies,
  COUNT(bc.copy_id) FILTER (WHERE bc.status = 'AVAILABLE') AS available_copies,
  (COUNT(bc.copy_id) FILTER (WHERE bc.status = 'AVAILABLE') = 0) AS is_out_of_stock,
  COUNT(bc.copy_id) FILTER (WHERE bc.status = 'LOANED') AS loaned_copies,
  COUNT(bc.copy_id) FILTER (WHERE bc.status = 'RESERVED') AS reserved_copies,
  COUNT(bc.copy_id) FILTER (WHERE bc.status = 'MAINTENANCE') AS maintenance_copies,
  COUNT(bc.copy_id) FILTER (WHERE bc.status = 'LOST') AS lost_copies
FROM books b
LEFT JOIN book_copies bc ON bc.book_id = b.book_id
GROUP BY b.book_id, b.isbn, b.title, b.language, b.edition;
