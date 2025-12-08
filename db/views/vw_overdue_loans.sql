SET search_path TO library_app;

CREATE OR REPLACE VIEW vw_overdue_loans AS
SELECT
    l.loan_id,
    l.member_id,
    m.first_name,
    m.last_name,
    l.copy_id,
    bc.barcode,
    l.checkout_date,
    l.due_date,
    CURRENT_DATE - l.due_date AS days_overdue,
    CASE 
        WHEN (CURRENT_DATE - l.due_date) BETWEEN 1 AND 7 THEN '0-7'
        WHEN (CURRENT_DATE - l.due_date) BETWEEN 8 AND 14 THEN '8-14'
        WHEN (CURRENT_DATE - l.due_date) > 14 THEN '15+'
        ELSE '0'
    END AS overdue_category
FROM loans l
JOIN members m ON m.member_id = l.member_id
JOIN book_copies bc ON bc.copy_id = l.copy_id
WHERE l.returned_date IS NULL
  AND l.due_date < CURRENT_DATE;
