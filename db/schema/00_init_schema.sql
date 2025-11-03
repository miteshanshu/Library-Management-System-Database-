-- Library Management System Schema Initialization
-- Author: Mitesh Kumar Anshu
-- Purpose: Define core catalog, membership, and circulation tables

CREATE SCHEMA IF NOT EXISTS library_app;
SET search_path TO library_app;

-- Membership types table: borrowing rules by group
CREATE TABLE membership_types (
    membership_type_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    loan_limit INT NOT NULL DEFAULT 5 CHECK (loan_limit > 0),
    loan_period_days INT NOT NULL DEFAULT 14 CHECK (loan_period_days > 0),
    daily_late_fee NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (daily_late_fee >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Members table: contact and status for each card
CREATE TABLE members (
    member_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    membership_type_id INT NOT NULL REFERENCES membership_types(membership_type_id),
    card_number VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','INACTIVE')),
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Publishers table: basic contact info
CREATE TABLE publishers (
    publisher_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    publisher_name VARCHAR(200) NOT NULL UNIQUE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Authors table: stores author names
CREATE TABLE authors (
    author_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    CONSTRAINT uq_authors_name UNIQUE (first_name, last_name)
);

-- Genres table: list of genres
CREATE TABLE genres (
    genre_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    genre_name VARCHAR(100) NOT NULL UNIQUE
);

-- Books table: main details for every title
CREATE TABLE books (
    book_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    publisher_id INT REFERENCES publishers(publisher_id) ON UPDATE CASCADE ON DELETE SET NULL,
    publication_year INT,
    language VARCHAR(50),
    edition VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Book authors link: matches books with writers
CREATE TABLE book_authors (
    book_id INT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    author_id INT NOT NULL REFERENCES authors(author_id) ON DELETE RESTRICT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (book_id, author_id)
);

-- Book genres link: matches books with genres
CREATE TABLE book_genres (
    book_id INT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    genre_id INT NOT NULL REFERENCES genres(genre_id) ON DELETE RESTRICT,
    PRIMARY KEY (book_id, genre_id)
);

-- Library locations: campus spots where books sit
CREATE TABLE library_locations (
    location_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    location_name VARCHAR(150) NOT NULL,
    location_code VARCHAR(50) NOT NULL UNIQUE,
    parent_location_id INT REFERENCES library_locations(location_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Book copies: each barcode with current status
CREATE TABLE book_copies (
    copy_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    book_id INT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    location_id INT REFERENCES library_locations(location_id) ON DELETE SET NULL,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(15) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','RESERVED','LOANED','MAINTENANCE','LOST')),
    condition_notes VARCHAR(255),
    last_loaned_at TIMESTAMP,
    last_returned_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Loans table: tracks each checkout and return
CREATE TABLE loans (
    loan_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    copy_id INT NOT NULL REFERENCES book_copies(copy_id) ON UPDATE CASCADE,
    member_id INT NOT NULL REFERENCES members(member_id) ON UPDATE CASCADE,
    checkout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    returned_date DATE,
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','OVERDUE','RETURNED','LOST')),
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Loan fees: all charges raised on a loan
CREATE TABLE loan_fees (
    fee_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_id INT NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('LATE_FEE','DAMAGE','REPLACEMENT','OTHER')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    assessed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(15) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID','PARTIAL','PAID')),
    paid_in_full_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fee payments: each payment entry with method
CREATE TABLE fee_payments (
    payment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fee_id INT NOT NULL REFERENCES loan_fees(fee_id) ON DELETE CASCADE,
    payment_amount NUMERIC(10,2) NOT NULL CHECK (payment_amount > 0),
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(30) NOT NULL,
    reference_code VARCHAR(100)
);

-- Member alerts: overdue and fee reminders
CREATE TABLE member_alerts (
    alert_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    loan_id INT NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('OVERDUE','FEE')),
    alert_message VARCHAR(500) NOT NULL,
    alert_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
