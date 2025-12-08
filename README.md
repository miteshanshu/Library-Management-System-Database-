# Library Management System - RBAC Backend
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![Express](https://img.shields.io/badge/Express.js-Backend-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen)
![Status](https://img.shields.io/badge/Status-Active-success)
Complete Role-Based Access Control (RBAC) backend for the Library Management System with PostgreSQL.

## Overview

This backend implements a three-tier role-based access control system:
- **Admin**: Full system management and oversight
- **Librarian**: Circulation operations and daily management
- **Student**: Self-service borrowing and personal account management

## Features

✅ JWT-based authentication  
✅ Role-based authorization middleware  
✅ PostgreSQL integration with stored procedures  
✅ Comprehensive RBAC implementation  
✅ Error handling and validation  
✅ RESTful API design  

## 🏗️ System Architecture

```plaintext
                 ┌────────────────────────────┐
                 │        Frontend App        │
                 │ (React, Next.js, Mobile)   │
                 └──────────────┬─────────────┘
                                │ REST API
                                ▼
        ┌─────────────────────────────────────────────────┐
        │                Express Backend                   │
        │─────────────────────────────────────────────────│
        │  Routing Layer                                   │
        │   - auth.routes.js                               │
        │   - admin.routes.js                              │
        │   - librarian.routes.js                          │
        │   - student.routes.js                            │
        │   - circulation.routes.js                        │
        │   - reports.routes.js                            │
        │-------------------------------------------------│
        │  Middleware                                      │
        │   - JWT Authentication                           │
        │   - Role Authorization                           │
        │-------------------------------------------------│
        │  Controllers                                     │
        │   - Auth / Admin / Librarian / Student           │
        │   - Circulation / Reports                        │
        │-------------------------------------------------│
        │  Database Layer                                  │
        │   - PostgreSQL (library_app schema)              │
        │   - Stored Procedures & Functions                │
        └───────────────────────────────┬──────────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │     PostgreSQL DB       │
                          │  Users / Books / Loans  │
                          │  Copies / Alerts / Fees │
                          └─────────────────────────┘
                          
## Installation

### Prerequisites
- Node.js 14+ and npm
- PostgreSQL 12+
- Existing library_app schema with tables and functions

### Steps

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=library_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SCHEMA=library_app
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /register` - Student registration
- `GET /me` - Get current user profile (requires auth)

### Admin (`/api/admin`)
- `POST /librarians` - Create librarian
- `PATCH /librarians/:user_id` - Activate/deactivate librarian
- `GET /users` - Get all users
- `GET /login-list` - Get login activity list
- `POST /books` - Add new book
- `PATCH /books/:book_id` - Edit book details
- `DELETE /books/:book_id` - Delete book
- `POST /book-copies` - Add book copy
- `PATCH /book-copies/:copy_id/status` - Update copy status
- `PATCH /book-copies/:copy_id/location` - Set book location
- `POST /membership-types` - Manage membership types
- `PATCH /members/:member_id/override` - Override member status
- `POST /fees/:fee_id/waive` - Waive fees
- `POST /loans/:loan_id/force-close` - Force close loan

### Librarian (`/api/librarian`)
- `GET /students/search` - Search student by card or email
- `GET /students/:member_id/loans` - View student loans
- `GET /students/:member_id/overdue-loans` - View overdue loans
- `GET /students/:member_id/fees` - View student fees
- `GET /students/:member_id/alerts` - View student alerts
- `GET /book-copies/:copy_id` - View copy status
- `PATCH /book-copies/:copy_id/mark-available` - Mark copy available
- `POST /alerts/generate-overdue` - Generate overdue alerts
- `PATCH /alerts/:alert_id/resolve` - Mark alert resolved
- `GET /books` - View books
- `GET /books/:book_id/copies` - View book copies
- `POST /scan-barcode` - Scan barcode

### Student (`/api/student`)
- `GET /my-loans` - Get personal loans
- `GET /my-overdue-loans` - Get overdue loans
- `GET /my-fees` - Get personal fees
- `GET /my-alerts` - Get personal alerts
- `GET /payment-history` - Get payment history
- `GET /browse-books` - Browse library books
- `GET /books/:book_id` - Get book details
- `GET /books/:book_id/available-copies` - Check available copies

### Circulation (`/api/circulation`) (Admin/Librarian only)
- `POST /checkout` - Checkout book
- `POST /return` - Return book
- `GET /loans/:loan_id` - Get loan details
- `GET /member/:member_id/loans` - Get member loans
- `GET /member/:member_id/active-loans` - Get active loans
- `GET /copy/:copy_id/history` - Get copy history

### Reports (`/api/reports`) (Admin only)
- `GET /overdue` - Overdue report
- `GET /circulation` - Circulation report
- `GET /inventory` - Inventory summary
- `GET /member-activity` - Member activity report
- `GET /debt-aging` - Debt aging report
- `GET /turnaround-metrics` - Turnaround metrics
- `GET /dashboard-summary` - Dashboard summary

## Permission Matrix

| Feature | Admin | Librarian | Student |
|---------|-------|-----------|---------|
| Create librarian | ✔️ | ❌ | ❌ |
| Manage users | ✔️ | ❌ | ❌ |
| Add/Edit/Delete books | ✔️ | ❌ | ❌ |
| Checkout/Return books | ✔️ | ✔️ | ❌ |
| View system reports | ✔️ | ❌ | ❌ |
| View own loans | ✔️ | ✔️ | ✔️ |
| View own fees | ✔️ | ✔️ | ✔️ |
| Browse books | ✔️ | ✔️ | ✔️ |

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Login to get token:
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "role": "student",
      "full_name": "John Doe"
    }
  }
}
```

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js          # Database connection pool
│   │   └── env.js         # Environment variables
│   ├── middleware/
│   │   ├── auth.js        # JWT authentication
│   │   └── requireRole.js # Role-based authorization
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── librarianController.js
│   │   ├── studentController.js
│   │   ├── circulationController.js
│   │   └── reportsController.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── admin.routes.js
│   │   ├── librarian.routes.js
│   │   ├── student.routes.js
│   │   ├── circulation.routes.js
│   │   └── reports.routes.js
│   ├── utils/
│   │   ├── response.js    # Response formatting
│   │   └── error.js       # Error handling
│   ├── app.js             # Express app setup
│   └── server.js          # Server startup
├── .env.example           # Environment template
├── package.json           # Dependencies
└── README.md              # Documentation
```

## Database Schema Requirements

The backend expects the following PostgreSQL schema and functions:

**Tables**:
- users (user_id, full_name, email, password_hash, role, is_active)
- members (member_id, card_number, first_name, last_name, email, status)
- books, book_copies, loans, loan_fees, member_alerts, etc.

**Functions**:
- fn_register_student_user()
- fn_create_librarian_user()
- fn_verify_user_credentials()
- sp_checkout_book()
- sp_return_book()
- sp_generate_overdue_alerts()

See the main project schema files for full details.

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": null
}
```

Common status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Development

### Running tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Environment Modes
- `development`: Detailed logging
- `production`: Optimized performance

## License

MIT
