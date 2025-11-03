-- Library Management System Procedures
-- Author: Mitesh Kumar Anshu
-- Module: Circulation workflows for checkout and return

SET search_path TO library_app;

CREATE OR REPLACE PROCEDURE sp_checkout_book(
    p_member_id INT,
    p_copy_barcode VARCHAR,
    p_checkout_date DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_copy_id INT;
    v_copy_status VARCHAR(15);
    v_membership_type_id INT;
    v_member_status VARCHAR(15);
    v_active_loans INT;
    v_loan_limit INT;
    v_loan_period INT;
    v_due_date DATE;
BEGIN
    -- Lock the copy row so two users do not grab the same book
    SELECT copy_id, status
    INTO v_copy_id, v_copy_status
    FROM book_copies
    WHERE barcode = p_copy_barcode
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Copy % not found', p_copy_barcode;
    END IF;

    IF v_copy_status <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'Copy % is currently %', p_copy_barcode, v_copy_status;
    END IF;

    -- Load the member row to check status and limits
    SELECT membership_type_id, status
    INTO v_membership_type_id, v_member_status
    FROM members
    WHERE member_id = p_member_id
    FOR UPDATE;

    IF NOT FOUND OR v_member_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Member % is not active', p_member_id;
    END IF;

    -- Count how many active loans the student already has
    SELECT COUNT(*)
    INTO v_active_loans
    FROM loans
    WHERE member_id = p_member_id
      AND status IN ('ACTIVE','OVERDUE');

    -- Membership type decides limits and due date span
    SELECT loan_limit, loan_period_days
    INTO v_loan_limit, v_loan_period
    FROM membership_types
    WHERE membership_type_id = v_membership_type_id;

    IF v_active_loans >= v_loan_limit THEN
        RAISE EXCEPTION 'Member % is already at the loan limit', p_member_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM loan_fees
        WHERE member_id = p_member_id
          AND status IN ('UNPAID','PARTIAL')
    ) THEN
        RAISE EXCEPTION 'Member % has outstanding fees', p_member_id;
    END IF;

    v_due_date := COALESCE(p_checkout_date, CURRENT_DATE) + v_loan_period;

    -- Create the loan row for tracking and alerts
    INSERT INTO loans (copy_id, member_id, checkout_date, due_date, status)
    VALUES (v_copy_id, p_member_id, COALESCE(p_checkout_date, CURRENT_DATE), v_due_date, 'ACTIVE');

    -- Mark the copy as loaned so shelves stay correct
    UPDATE book_copies
    SET status = 'LOANED',
        last_loaned_at = CURRENT_TIMESTAMP
    WHERE copy_id = v_copy_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_return_book(
    p_loan_id INT,
    p_return_date DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_copy_id INT;
    v_member_id INT;
    v_membership_type_id INT;
    v_daily_late_fee NUMERIC(6,2);
    v_due_date DATE;
    v_status VARCHAR(15);
    v_return_date DATE;
    v_overdue_days INT;
    v_fee_amount NUMERIC(10,2);
BEGIN
    -- Lock the loan row so two returns do not collide
    SELECT copy_id, member_id, due_date, status
    INTO v_copy_id, v_member_id, v_due_date, v_status
    FROM loans
    WHERE loan_id = p_loan_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loan % not found', p_loan_id;
    END IF;

    IF v_status = 'RETURNED' THEN
        RAISE EXCEPTION 'Loan % is already closed', p_loan_id;
    END IF;

    v_return_date := COALESCE(p_return_date, CURRENT_DATE);

    UPDATE loans
    SET returned_date = v_return_date,
        status = 'RETURNED'
    WHERE loan_id = p_loan_id;

    -- Mark the copy back to available for the next student
    UPDATE book_copies
    SET status = 'AVAILABLE',
        last_returned_at = CURRENT_TIMESTAMP
    WHERE copy_id = v_copy_id;

    -- Close any open alerts linked to this loan
    UPDATE member_alerts
    SET resolved_at = CURRENT_TIMESTAMP
    WHERE loan_id = p_loan_id
      AND resolved_at IS NULL;

    SELECT membership_type_id
    INTO v_membership_type_id
    FROM members
    WHERE member_id = v_member_id;

    SELECT daily_late_fee
    INTO v_daily_late_fee
    FROM membership_types
    WHERE membership_type_id = v_membership_type_id;

    v_overdue_days := GREATEST(v_return_date - v_due_date, 0);

    IF v_overdue_days > 0 AND v_daily_late_fee > 0 THEN
        v_fee_amount := v_overdue_days * v_daily_late_fee;

        -- Add a late fee entry so accounts team can follow up
        INSERT INTO loan_fees (loan_id, member_id, fee_type, amount, assessed_date, due_date, status)
        VALUES (p_loan_id, v_member_id, 'LATE_FEE', v_fee_amount, CURRENT_DATE, CURRENT_DATE, 'UNPAID');
    END IF;
END;
$$;
