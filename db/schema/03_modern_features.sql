-- Reviews & Ratings
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books(book_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, user_id)
);

-- Reservations (Holds)
CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books(book_id) ON DELETE CASCADE,
    member_id INT REFERENCES members(member_id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED')) DEFAULT 'PENDING',
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_at TIMESTAMP, -- When the hold expires if not picked up
    queue_position INT
);

-- Announcements / News
CREATE TABLE announcements (
    announcement_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('LOW', 'NORMAL', 'HIGH')) DEFAULT 'NORMAL',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist / Favorites
CREATE TABLE wishlist (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    book_id INT REFERENCES books(book_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

-- Function to calculate average rating
CREATE OR REPLACE FUNCTION fn_calculate_book_rating(p_book_id INT)
RETURNS TABLE (avg_rating NUMERIC, review_count INT) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CAST(COALESCE(AVG(rating), 0) AS NUMERIC(3,1)),
        CAST(COUNT(*) AS INT)
    FROM reviews
    WHERE book_id = p_book_id;
END;
$$;
