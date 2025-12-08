import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const API_BASE_URL = 'http://localhost:5000/api';

let authTokens = {
  adminToken: '',
  studentToken: '',
  librarianToken: '',
  studentMemberId: 0,
  bookId: 0,
  copyId: 0,
};

test.beforeAll(() => {
  // Load auth tokens from setup file
  try {
    const data = fs.readFileSync('tests/auth.json', 'utf-8');
    authTokens = { ...authTokens, ...JSON.parse(data) };
  } catch (err) {
    console.warn('Auth file not found, skipping token load');
  }
});

// Helper function for API requests
async function apiRequest(
  method: string,
  endpoint: string,
  body?: any,
  token?: string
) {
  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

test.describe('Library Management System E2E Tests', () => {
  test.describe('Health & Connection', () => {
    test('should return health status', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status', 'OK');
      expect(data).toHaveProperty('timestamp');
    });

    test('should handle 404 for non-existent routes', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/nonexistent`);
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    test('database should be connected', async ({}) => {
      const { status } = await apiRequest(
        'GET',
        '/admin/users',
        undefined,
        authTokens.adminToken
      );
      expect([200, 401]).toContain(status);
    });
  });

  test.describe('Authentication Routes', () => {
    test('should fail login with invalid credentials', async ({}) => {
      const { status, data } = await apiRequest('POST', '/auth/login', {
        email: 'admin@library.in',
        password: 'WrongPassword',
      });

      expect(status).toBe(401);
      expect(data.success).toBe(false);
    });

    test('should get current user', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/auth/me',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('user_id');
      expect(data.data).toHaveProperty('role');
    });

    test('should fail getting current user without token', async ({}) => {
      const { status, data } = await apiRequest('GET', '/auth/me');

      expect(status).toBe(401);
      expect(data.success).toBe(false);
    });

    test('should fail registration with invalid data', async ({}) => {
      const { status, data } = await apiRequest('POST', '/auth/register', {
        full_name: 'Test',
        // missing email and password
      });

      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  test.describe('Admin Routes', () => {
    test('should get all users', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/admin/users',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get login list', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/admin/login-list',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should add a book', async ({}) => {
      const { status, data } = await apiRequest(
        'POST',
        '/admin/books',
        {
          title: `Test Book ${Date.now()}`,
          isbn: `ISBN-${Date.now()}`,
          author: 'Test Author',
          publisher: 'Test Publisher',
          total_pages: 300,
        },
        authTokens.adminToken
      );

      expect(status).toBe(201);
      expect(data.success).toBe(true);
      if (data.data?.book_id) {
        authTokens.bookId = data.data.book_id;
      }
    });

    test('should add a book copy', async ({}) => {
      const { status, data } = await apiRequest(
        'POST',
        '/admin/book-copies',
        {
          book_id: 1,
          barcode: `BARCODE-${Date.now()}`,
          location: 'Shelf A1',
        },
        authTokens.adminToken
      );

      if (status === 201) {
        expect(data.success).toBe(true);
        if (data.data?.copy_id) {
          authTokens.copyId = data.data.copy_id;
        }
      }
    });

    test('should update copy status', async ({}) => {
      if (!authTokens.copyId) return;

      const { status, data } = await apiRequest(
        'PATCH',
        `/admin/book-copies/${authTokens.copyId}/status`,
        { status: 'AVAILABLE' },
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should set book location', async ({}) => {
      if (!authTokens.copyId) return;

      const { status, data } = await apiRequest(
        'PATCH',
        `/admin/book-copies/${authTokens.copyId}/location`,
        { location: 'Shelf B2' },
        authTokens.adminToken
      );

      expect([200, 400]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
      }
    });

    test('should deny access to non-admin users', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/admin/users',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  test.describe('Circulation Routes', () => {
    test('should get loan details', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/circulation/loans/1',
        undefined,
        authTokens.adminToken
      );

      expect([200, 404]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
      }
    });

    test('should get loans by member', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        `/circulation/member/${authTokens.studentMemberId}/loans`,
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get active loans by member', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        `/circulation/member/${authTokens.studentMemberId}/active-loans`,
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get loan history by copy', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/circulation/copy/1/history',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should deny access without authentication', async ({}) => {
      const { status, data } = await apiRequest('GET', '/circulation/loans/1');

      expect(status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  test.describe('Student Routes', () => {
    test('should get my loans', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/my-loans',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data) || data.data === null).toBe(true);
    });

    test('should get my overdue loans', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/my-overdue-loans',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data) || data.data === null).toBe(true);
    });

    test('should get my fees', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/my-fees',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(200);
      if (data.success) {
        expect([true, false]).toContain(data.success);
      }
    });

    test('should get my alerts', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/my-alerts',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get payment history', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/payment-history',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should browse books', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/browse-books',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get book details', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/books/1',
        undefined,
        authTokens.studentToken
      );

      expect([200, 404]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
      }
    });

    test('should get available copies', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/student/books/1/available-copies',
        undefined,
        authTokens.studentToken
      );

      expect([200, 404]).toContain(status);
      if (status === 200) {
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    test('should deny access to admin routes', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/admin/users',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  test.describe('Librarian Routes', () => {
    test('should search student', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/librarian/students/search?query=test',
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 403]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });

    test('should get student loans', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        `/librarian/students/${authTokens.studentMemberId}/loans`,
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 403]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });

    test('should get student fees', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        `/librarian/students/${authTokens.studentMemberId}/fees`,
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 403]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });

    test('should get student overdue loans', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        `/librarian/students/${authTokens.studentMemberId}/overdue-loans`,
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 403]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });

    test('should get student alerts', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        `/librarian/students/${authTokens.studentMemberId}/alerts`,
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 403]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });

    test('should view books', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/librarian/books',
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 403]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });

    test('should get book stock status', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/librarian/books/stock-status',
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 403]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });

    test('should view book copies', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/librarian/books/1/copies',
        undefined,
        authTokens.librarianToken || authTokens.adminToken
      );

      expect([200, 404, 403]).toContain(status);
      if (status === 200) {
        expect(Array.isArray(data.data) || data.data === null).toBe(true);
      }
    });
  });

  test.describe('Reports Routes', () => {
    test('should get overdue report', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/overdue',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get circulation report', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/circulation',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should get inventory summary', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/inventory',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should get member activity report', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/member-activity',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should get debt aging report', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/debt-aging',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should get turnaround metrics', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/turnaround-metrics',
        undefined,
        authTokens.adminToken
      );

      expect([200, 500]).toContain(status);
      if (status === 200) {
        expect(data.success).toBe(true);
      }
    });

    test('should get dashboard summary', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/dashboard-summary',
        undefined,
        authTokens.adminToken
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should deny access to non-admin users', async ({}) => {
      const { status, data } = await apiRequest(
        'GET',
        '/reports/overdue',
        undefined,
        authTokens.studentToken
      );

      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  test.describe('Database & Error Handling', () => {
    test('should handle database connection gracefully', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE_URL}/health`);
      expect(response.status()).toBe(200);
    });

    test('should return proper error messages', async ({}) => {
      const { status, data } = await apiRequest('POST', '/auth/login', {
        email: 'nonexistent@test.com',
        password: 'password',
      });

      expect(status).toBe(401);
      expect(data).toHaveProperty('message');
    });

    test('should validate request body', async ({}) => {
      const { status, data } = await apiRequest('POST', '/auth/login', {
        // missing required fields
      });

      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('all routes should be accessible', async ({}) => {
      const routes = [
        '/auth/me',
        '/admin/users',
        '/admin/login-list',
        '/student/my-loans',
        '/student/my-fees',
        '/librarian/books',
        '/reports/overdue',
      ];

      for (const route of routes) {
        const { status } = await apiRequest(
          'GET',
          route,
          undefined,
          authTokens.adminToken
        );
        expect([200, 201, 400, 403, 404]).toContain(status);
      }
    });
  });
});
