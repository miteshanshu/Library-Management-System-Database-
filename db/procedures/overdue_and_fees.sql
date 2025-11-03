-- Library Management System Procedures
-- Author: Mitesh Kumar Anshu
-- Module: Overdue processing, alerts, and fee handling

SET search_path TO library_app;

CREATE OR REPLACE PROCEDURE sp_refresh_overdue_status(
    p_run_date DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_effective_date DATE := COALESCE(p_run_date, CURRENT_DATE);
BEGIN
    -- Mark past due loans as overdue so alerts work
    UPDATE loans
    SET status = 'OVERDUE',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'ACTIVE'
      AND returned_date IS NULL
      AND due_date < v_effective_date;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_generate_overdue_alerts(
    p_run_date DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_effective_date DATE := COALESCE(p_run_date, CURRENT_DATE);
BEGIN
    CALL sp_refresh_overdue_status(v_effective_date);

    -- Add one alert per overdue loan so students get one reminder
    INSERT INTO member_alerts (member_id, loan_id, alert_type, alert_message)
    SELECT l.member_id,
           l.loan_id,
           'OVERDUE',
           'Loan ' || l.loan_id || ' for barcode ' || bc.barcode || ' is overdue by ' || (v_effective_date - l.due_date) || ' day(s)'
    FROM loans l
    JOIN book_copies bc ON bc.copy_id = l.copy_id
    WHERE l.status = 'OVERDUE'
      AND l.due_date < v_effective_date
      AND NOT EXISTS (
          SELECT 1
          FROM member_alerts a
          WHERE a.loan_id = l.loan_id
            AND a.alert_type = 'OVERDUE'
            AND a.resolved_at IS NULL
      );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_apply_fee_payment(
    p_fee_id INT,
    p_amount NUMERIC(10,2),
    p_payment_method VARCHAR DEFAULT 'CASH',
    p_reference_code VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_remaining NUMERIC(10,2);
BEGIN
    -- Record the payment first so reconciliation tables stay correct
    INSERT INTO fee_payments (fee_id, payment_amount, payment_method, reference_code)
    VALUES (p_fee_id, p_amount, p_payment_method, p_reference_code);

    -- Compute how much is still pending on the fee after this payment
    SELECT f.amount - COALESCE(SUM(p.payment_amount), 0)
    INTO v_remaining
    FROM loan_fees f
    LEFT JOIN fee_payments p ON p.fee_id = f.fee_id
    WHERE f.fee_id = p_fee_id
    GROUP BY f.amount;

    IF v_remaining <= 0 THEN
        UPDATE loan_fees
        SET status = 'PAID',
            paid_in_full_date = CURRENT_DATE
        WHERE fee_id = p_fee_id;
    ELSE
        -- Mark fee as partially settled so finance can follow up later
        UPDATE loan_fees
        SET status = 'PARTIAL',
            paid_in_full_date = NULL
        WHERE fee_id = p_fee_id;
    END IF;
END;
$$;
