import { test as setup } from '@playwright/test';

const authFile = 'tests/auth.json';

setup('authenticate and save tokens', async ({}) => {
  const API_BASE_URL = 'http://localhost:5000/api';

  // Helper function for API requests
  async function apiRequest(method: string, endpoint: string, body?: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await response.json();
  }

  // Login as admin
  const adminData = await apiRequest('POST', '/auth/login', {
    email: 'admin@library.in',
    password: 'Admin@123',
  });

  // Register a new student
  const studentData = await apiRequest('POST', '/auth/register', {
    full_name: 'Test Student',
    email: `student_${Date.now()}@test.com`,
    password: 'Password123',
  });

  // Create a librarian account
  const librarianData = await apiRequest('POST', '/admin/librarians', {
    full_name: 'Test Librarian',
    email: `librarian_${Date.now()}@test.com`,
    password: 'Librarian@123',
  });

  // Login as librarian to get token
  let librarianToken = '';
  if (librarianData.data?.email) {
    const libLoginData = await apiRequest('POST', '/auth/login', {
      email: librarianData.data.email,
      password: 'Librarian@123',
    });
    librarianToken = libLoginData.data?.token || '';
  }

  // Save tokens to file
  const fs = require('fs');
  fs.mkdirSync('tests', { recursive: true });
  fs.writeFileSync(
    authFile,
    JSON.stringify({
      adminToken: adminData.data?.token || '',
      adminUserId: adminData.data?.user?.user_id || '',
      studentToken: studentData.data?.token || '',
      studentUserId: studentData.data?.user?.user_id || '',
      studentMemberId: studentData.data?.user?.member_id || '',
      librarianToken: librarianToken,
    })
  );
});
