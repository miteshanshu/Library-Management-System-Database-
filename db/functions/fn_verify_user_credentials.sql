-- ===================================================================
-- Function: fn_verify_user_credentials
-- Purpose : Validate user login and return user information.
-- Schema  : library_app
-- ===================================================================

CREATE OR REPLACE FUNCTION library_app.fn_verify_user_credentials(
    p_email VARCHAR,
    p_password_plain VARCHAR
)
RETURNS TABLE (
    user_id INT,
    email VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    is_active BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.email,
        u.full_name,
        u.role,
        u.is_active
    FROM library_app.users u
    WHERE LOWER(u.email) = LOWER(p_email)
      AND u.password_hash = crypt(p_password_plain, u.password_hash)
      AND u.is_active = TRUE
    LIMIT 1;
END;
$$;
