# Library Management Database

## Overview
- **Purpose**: End-to-end PostgreSQL schema, seeds, views, and procedures for campus-scale library circulation.
- **Engine**: PostgreSQL 14+ with objects scoped to `library_app`.
- **Author**: Mitesh Kumar Anshu.

## Directory Map
- **db/schema**: Base tables, constraints, triggers.
- **db/views**: Analytics-facing materialized logic.
- **db/procedures**: Circulation, overdue, and fee workflows.
- **db/seeds**: Demo catalog, members, and inventory.
- **db/reports**: Ready-made operational SQL extracts.

## Prerequisites
1. Install PostgreSQL 14 or newer.
2. Ensure a superuser (or equivalent) role for schema creation.
3. Create a target database, e.g. `library_db`.
4. Export environment variables for non-interactive commands: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`.

## Database Provisioning

### 1. Initialize Core Schema
```bash
psql -d library_db -f db/schema/00_init_schema.sql
```
**Expected output**
```
SET
SET
CREATE SCHEMA
SET
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
```

### 2. Apply Constraints, Indexes, and Triggers
```bash
psql -d library_db -f db/schema/01_constraints_indexes.sql
```
**Expected output**
```
SET
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
CREATE TRIGGER
CREATE TRIGGER
CREATE TRIGGER
```

### 3. Create Analytics Views
```bash
psql -d library_db -f db/views/analytics_views.sql
```
**Expected output**
```
SET
CREATE VIEW
CREATE VIEW
CREATE VIEW
```

### 4. Install Circulation Procedures
```bash
psql -d library_db -f db/procedures/checkout_and_return.sql
```
**Expected output**
```
SET
CREATE PROCEDURE
CREATE PROCEDURE
```

### 5. Install Overdue and Fee Procedures
```bash
psql -d library_db -f db/procedures/overdue_and_fees.sql
```
**Expected output**
```
SET
CREATE PROCEDURE
CREATE PROCEDURE
CREATE PROCEDURE
```

### 6. Load Sample Data
```bash
psql -d library_db -f db/seeds/sample_data.sql
```
**Expected output**
```
SET
INSERT 0 4
INSERT 0 4
INSERT 0 6
INSERT 0 5
INSERT 0 6
INSERT 0 6
INSERT 0 24
```

### 7. Run Operational Reports (Optional)
```bash
psql -d library_db -f db/reports/inventory_and_member_reports.sql
```
**Expected output**
```
SET
        title         | overdue_count |      member_list      
----------------------+---------------+-----------------------
 Smart Cities and You |             0 | {}
(1 row)

 member_id | first_name | last_name | due_0_7 | due_8_14 | due_15_plus | partial_balance 
-----------+------------+-----------+---------+----------+-------------+-----------------
         1 | Aarav      | Mehta     |    0.00 |     0.00 |        0.00 |            0.00
(1 row)

                title                | avg_turnaround_days | loans_tracked 
-------------------------------------+---------------------+---------------
 Stories from the Konkan Coast       |                   0 |             0
(1 row)
```

## Data Model Highlights
- **Memberships** (`db/schema/00_init_schema.sql:9`): Borrowing tiers with limits, loan durations, and late-fee policies.
- **Catalog** (`db/schema/00_init_schema.sql:62`): `books`, `authors`, `genres`, and join tables supporting multi-author, multi-genre tagging.
- **Inventory** (`db/schema/00_init_schema.sql:100`): `book_copies` tracks status, location, and lifecycle timestamps.
- **Circulation** (`db/schema/00_init_schema.sql:115`): `loans`, `loan_fees`, `fee_payments`, and `member_alerts` enforce tracking and accountability.
- **Integrity** (`db/schema/01_constraints_indexes.sql:8`): Partial unique indexes prevent duplicate primaries and parallel loans; triggers refresh `updated_at` automatically.

## Views
- **`vw_overdue_loans`** (`db/views/analytics_views.sql:8`): Lists active overdue items with borrower contact info.
- **`vw_inventory_summary`** (`db/views/analytics_views.sql:28`): Aggregates copy statuses per title for shelf audits.
- **`vw_member_activity`** (`db/views/analytics_views.sql:42`): Summarizes active and lifetime loans alongside outstanding fees.

## Stored Procedures
- **`sp_checkout_book`** (`db/procedures/checkout_and_return.sql:7`): Locks the copy, validates member eligibility, and inserts a loan.
- **`sp_return_book`** (`db/procedures/checkout_and_return.sql:90`): Marks returns, restores copy availability, closes alerts, and raises late fees.
- **`sp_refresh_overdue_status`** (`db/procedures/overdue_and_fees.sql:7`): Flags loans past due as overdue.
- **`sp_generate_overdue_alerts`** (`db/procedures/overdue_and_fees.sql:25`): Creates member alerts after refreshing statuses.
- **`sp_apply_fee_payment`** (`db/procedures/overdue_and_fees.sql:55`): Records payments and updates fee status.

## Common Operations

### Checkout Flow
```bash
psql -d library_db -c "CALL library_app.sp_checkout_book(1, 'BC1-01', DATE '2024-08-01');"
```
**Expected output**
```
CALL
```

### Verify Active Loan
```bash
psql -d library_db -c "SELECT loan_id, status, due_date FROM library_app.loans WHERE member_id = 1 ORDER BY loan_id DESC LIMIT 1;"
```
**Expected output**
```
 loan_id | status |  due_date  
---------+--------+------------
       1 | ACTIVE | 2024-08-15
(1 row)
```

### Return Flow
```bash
psql -d library_db -c "CALL library_app.sp_return_book(1, DATE '2024-08-10');"
```
**Expected output**
```
CALL
```

### Check Return Status
```bash
psql -d library_db -c "SELECT status, returned_date FROM library_app.loans WHERE loan_id = 1;"
```
**Expected output**
```
 status  | returned_date 
---------+---------------
 RETURNED | 2024-08-10
(1 row)
```

### Refresh Overdue Pipeline
```bash
psql -d library_db -c "CALL library_app.sp_generate_overdue_alerts(CURRENT_DATE);"
```
**Expected output**
```
CALL
```

### Apply Late Fee Payment
```bash
psql -d library_db -c "CALL library_app.sp_apply_fee_payment(1, 50.00, 'UPI', 'TXN123');"
```
**Expected output**
```
CALL
```

### Inventory Summary Snapshot
```bash
psql -d library_db -c "SELECT title, total_copies, available_copies, loaned_copies, maintenance_copies, lost_copies FROM library_app.vw_inventory_summary ORDER BY title;"
```
**Expected output**
```
                 title                 | total_copies | available_copies | loaned_copies | maintenance_copies | lost_copies 
--------------------------------------+--------------+------------------+---------------+--------------------+-------------
 Campus Leadership Playbook           |            4 |                4 |             0 |                  0 |           0
 Echoes of the Maurya Trail           |            4 |                4 |             0 |                  0 |           0
 Practical Robotics for Campus Clubs  |            4 |                4 |             0 |                  0 |           0
 Smart Cities and You                 |            4 |                4 |             0 |                  0 |           0
 Stories from the Konkan Coast        |            4 |                4 |             0 |                  0 |           0
 Yuva Minds: Essays by Indian Students|            4 |                4 |             0 |                  0 |           0
(6 rows)
```

## Seed Data Snapshot
- **Membership Types**: Student, Research Scholar, Faculty, Alumni.
- **Publishers**: Pragati Prakashan, Lotus Leaf Media, Kaveri Books, Narmada House.
- **Catalog**: Six Indian-context titles mapped to matching authors and genres.
- **Inventory**: Four barcoded copies per title, distributed across campus locations.
- **Members**: Twenty-four active student records for workflow testing.

## Troubleshooting
1. **Permission errors**: Confirm the role can create schemas and execute PL/pgSQL.
2. **Duplicate inserts**: Scripts use `ON CONFLICT DO NOTHING`; rerunning is idempotent.
3. **Timezone-sensitive dates**: Procedures default to `CURRENT_DATE`; pass explicit dates to avoid drift.
