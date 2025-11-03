-- Library Management System Seed Data
-- Author: Mitesh Kumar Anshu
-- Goal: Quick bootstrap for demos and QA cycles

SET search_path TO library_app;

-- Membership types used on Indian campuses
INSERT INTO membership_types (type_name, loan_limit, loan_period_days, daily_late_fee)
VALUES
    ('Student', 6, 14, 1.00),
    ('Research Scholar', 8, 28, 0.75),
    ('Faculty', 10, 21, 0.50),
    ('Alumni', 4, 14, 1.50)
ON CONFLICT (type_name) DO NOTHING;

-- Local publishers that students often read
INSERT INTO publishers (publisher_name, contact_email)
VALUES
    ('Pragati Prakashan', 'contact@pragatiprakashan.in'),
    ('Lotus Leaf Media', 'hello@lotusleafmedia.in'),
    ('Kaveri Books', 'support@kaveribooks.in'),
    ('Narmada House', 'info@narmadahouse.in')
ON CONFLICT (publisher_name) DO NOTHING;

-- Authors who are popular with our students
INSERT INTO authors (first_name, last_name, display_name)
VALUES
    ('Amitabh', 'Rao', 'Amitabh Rao'),
    ('Kavya', 'Pillai', 'Kavya Pillai'),
    ('Rohan', 'Desai', 'Rohan Desai'),
    ('Meera', 'Iyer', 'Meera Iyer'),
    ('Ananya', 'Banerjee', 'Ananya Banerjee'),
    ('Siddharth', 'Kulkarni', 'Siddharth Kulkarni')
ON CONFLICT (first_name, last_name) DO NOTHING;

-- Genre list used in student reading clubs
INSERT INTO genres (genre_name)
VALUES
    ('Indian Fiction'),
    ('Science & Technology'),
    ('History & Heritage'),
    ('Social Studies'),
    ('Competitive Prep')
ON CONFLICT (genre_name) DO NOTHING;

-- Book list that fits our Indian student base
INSERT INTO books (isbn, title, publisher_id, publication_year, language, edition)
VALUES
    ('9788195000001', 'Stories from the Konkan Coast', (SELECT publisher_id FROM publishers WHERE publisher_name = 'Pragati Prakashan'), 2021, 'English', 'First'),
    ('9788195000002', 'Practical Robotics for Campus Clubs', (SELECT publisher_id FROM publishers WHERE publisher_name = 'Lotus Leaf Media'), 2023, 'English', 'First'),
    ('9788195000003', 'Echoes of the Maurya Trail', (SELECT publisher_id FROM publishers WHERE publisher_name = 'Kaveri Books'), 2020, 'English', 'Second'),
    ('9788195000004', 'Campus Leadership Playbook', (SELECT publisher_id FROM publishers WHERE publisher_name = 'Narmada House'), 2022, 'English', 'First'),
    ('9788195000005', 'Yuva Minds: Essays by Indian Students', (SELECT publisher_id FROM publishers WHERE publisher_name = 'Pragati Prakashan'), 2024, 'English', 'First'),
    ('9788195000006', 'Smart Cities and You', (SELECT publisher_id FROM publishers WHERE publisher_name = 'Lotus Leaf Media'), 2021, 'English', 'Revised')
ON CONFLICT (isbn) DO NOTHING;

-- Match each book with the right author
INSERT INTO book_authors (book_id, author_id, is_primary)
SELECT b.book_id, a.author_id, TRUE
FROM books b
JOIN authors a ON (
    (b.title = 'Stories from the Konkan Coast' AND a.display_name = 'Meera Iyer') OR
    (b.title = 'Practical Robotics for Campus Clubs' AND a.display_name = 'Siddharth Kulkarni') OR
    (b.title = 'Echoes of the Maurya Trail' AND a.display_name = 'Rohan Desai') OR
    (b.title = 'Campus Leadership Playbook' AND a.display_name = 'Amitabh Rao') OR
    (b.title = 'Yuva Minds: Essays by Indian Students' AND a.display_name = 'Ananya Banerjee') OR
    (b.title = 'Smart Cities and You' AND a.display_name = 'Kavya Pillai')
)
ON CONFLICT (book_id, author_id) DO NOTHING;

-- Tag each book with its genre
INSERT INTO book_genres (book_id, genre_id)
SELECT b.book_id, g.genre_id
FROM books b
JOIN genres g ON (
    (b.title = 'Stories from the Konkan Coast' AND g.genre_name = 'Indian Fiction') OR
    (b.title = 'Practical Robotics for Campus Clubs' AND g.genre_name = 'Science & Technology') OR
    (b.title = 'Echoes of the Maurya Trail' AND g.genre_name = 'History & Heritage') OR
    (b.title = 'Campus Leadership Playbook' AND g.genre_name = 'Social Studies') OR
    (b.title = 'Yuva Minds: Essays by Indian Students' AND g.genre_name = 'Indian Fiction') OR
    (b.title = 'Smart Cities and You' AND g.genre_name = 'Science & Technology')
)
ON CONFLICT (book_id, genre_id) DO NOTHING;

-- Library locations across our campuses
INSERT INTO library_locations (location_name, location_code)
VALUES
    ('Knowledge Hub - Bengaluru Campus', 'BLR-KH'),
    ('Innovation Lab - Pune Campus', 'PUN-IL'),
    ('Reading Lounge - Ahmedabad Campus', 'AMD-RL'),
    ('Student Commons - Delhi Campus', 'DEL-SC')
ON CONFLICT (location_code) DO NOTHING;

-- Load four copies per title across campuses
INSERT INTO book_copies (book_id, location_id, barcode)
SELECT b.book_id,
       l.location_id,
       CONCAT('BC', b.book_id, '-', LPAD(gs.copy_no::TEXT, 2, '0'))
FROM books b
JOIN library_locations l ON l.location_code = CASE b.title
    WHEN 'Stories from the Konkan Coast' THEN 'BLR-KH'
    WHEN 'Practical Robotics for Campus Clubs' THEN 'PUN-IL'
    WHEN 'Echoes of the Maurya Trail' THEN 'AMD-RL'
    WHEN 'Campus Leadership Playbook' THEN 'DEL-SC'
    WHEN 'Yuva Minds: Essays by Indian Students' THEN 'BLR-KH'
    ELSE 'DEL-SC'
END
CROSS JOIN LATERAL generate_series(1, 4) AS gs(copy_no)
ON CONFLICT (barcode) DO NOTHING;

-- Student members with Indian names for test runs
INSERT INTO members (membership_type_id, card_number, first_name, last_name, email, phone, status)
VALUES
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024001', 'Aarav', 'Mehta', 'aarav.mehta@campus.in', '+91-9000000001', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024002', 'Isha', 'Kapoor', 'isha.kapoor@campus.in', '+91-9000000002', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024003', 'Neel', 'Joshi', 'neel.joshi@campus.in', '+91-9000000003', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024004', 'Anaya', 'Reddy', 'anaya.reddy@campus.in', '+91-9000000004', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024005', 'Vihaan', 'Gupta', 'vihaan.gupta@campus.in', '+91-9000000005', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024006', 'Sara', 'Patel', 'sara.patel@campus.in', '+91-9000000006', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024007', 'Devika', 'Nair', 'devika.nair@campus.in', '+91-9000000007', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024008', 'Arnav', 'Malhotra', 'arnav.malhotra@campus.in', '+91-9000000008', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024009', 'Riya', 'Chatterjee', 'riya.chatterjee@campus.in', '+91-9000000009', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024010', 'Kabir', 'Singh', 'kabir.singh@campus.in', '+91-9000000010', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024011', 'Mihir', 'Kulkarni', 'mihir.kulkarni@campus.in', '+91-9000000011', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024012', 'Naina', 'Bansal', 'naina.bansal@campus.in', '+91-9000000012', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024013', 'Pranav', 'Verma', 'pranav.verma@campus.in', '+91-9000000013', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024014', 'Tara', 'Srinivasan', 'tara.srinivasan@campus.in', '+91-9000000014', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024015', 'Yash', 'Dubey', 'yash.dubey@campus.in', '+91-9000000015', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024016', 'Sneha', 'Kaur', 'sneha.kaur@campus.in', '+91-9000000016', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024017', 'Kian', 'Bhattacharya', 'kian.bhattacharya@campus.in', '+91-9000000017', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024018', 'Lavanya', 'Menon', 'lavanya.menon@campus.in', '+91-9000000018', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024019', 'Reyansh', 'Patil', 'reyansh.patil@campus.in', '+91-9000000019', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024020', 'Zoya', 'Hussain', 'zoya.hussain@campus.in', '+91-9000000020', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024021', 'Ira', 'Saxena', 'ira.saxena@campus.in', '+91-9000000021', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024022', 'Aria', 'Jain', 'aria.jain@campus.in', '+91-9000000022', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024023', 'Rudra', 'Pillai', 'rudra.pillai@campus.in', '+91-9000000023', 'ACTIVE'),
    ((SELECT membership_type_id FROM membership_types WHERE type_name = 'Student'), 'STU-2024024', 'Charvi', 'Deshmukh', 'charvi.deshmukh@campus.in', '+91-9000000024', 'ACTIVE')
ON CONFLICT (card_number) DO NOTHING;
