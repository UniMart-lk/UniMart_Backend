import dotenv from 'dotenv';
dotenv.config();

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Member 1: Auth & User Profile Tests', () => {
  const ts = Date.now();
  const testStudentEmail = `student_${ts}@ms.sab.ac.lk`;
  let studentToken = null;

  test('POST /api/auth/register creates user with isCompleted = false', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'Password123!',
        contactNumber: '+94771234567',
        role: 'USER',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.ok(body.data.token);
    assert.equal(body.data.user.email, testStudentEmail);
    assert.equal(body.data.user.userProfile.isCompleted, false);
    studentToken = body.data.token;
  });

  test('POST /api/auth/login authenticates user and returns token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'Password123!',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.ok(body.data.token);
  });

  test('GET /api/users/profile fetches user profile with relations', async () => {
    const res = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.equal(body.data.user.email, testStudentEmail);
    assert.equal(body.data.user.userProfile.isCompleted, false);
  });

  test('PUT /api/users/profile updates details and sets isCompleted = true', async () => {
    const res = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        fullName: 'Test Student Buyer',
        university: 'Sabaragamuwa University of Sri Lanka',
        faculty: 'Faculty of Computing',
        studentRegistrationNumber: '22/COM/0100',
        studentEvidenceUrl: 'Student_ID_Proof.pdf',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.equal(body.data.user.userProfile.fullName, 'Test Student Buyer');
    assert.equal(body.data.user.userProfile.isCompleted, true);
    assert.equal(body.data.user.userProfile.universityIdNumber, '22/COM/0100');
  });

  test('GET /api/auth/me returns updated profile with isCompleted = true', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.equal(body.data.user.userProfile.isCompleted, true);
  });
});

describe('Member 1: Provider Flow Tests', () => {
  const ts = Date.now();
  const testProviderEmail = `prov_${ts}@ms.sab.ac.lk`;
  let providerToken = null;

  test('POST /api/providers/register creates provider with PENDING status', async () => {
    const res = await fetch(`${baseUrl}/api/providers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testProviderEmail,
        password: 'Password123!',
        contactNumber: '+94779990000',
        providerType: 'STUDENT_PROVIDER',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.equal(body.data.user.role, 'PROVIDER');
    assert.equal(body.data.user.providerProfile.verificationStatus, 'PENDING');
    providerToken = body.data.token;
  });

  test('POST /api/providers/verify updates verification details', async () => {
    const res = await fetch(`${baseUrl}/api/providers/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        displayName: 'Campus Tools Hub',
        description: 'Quality tools for engineering students',
        serviceArea: 'Main Campus',
        verificationDocUrl: 'id_doc_sample.pdf',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.equal(body.data.provider.displayName, 'Campus Tools Hub');
    assert.equal(body.data.provider.verificationStatus, 'PENDING');
  });
});

describe('Member 1: Categories & Admin Tests', () => {
  test('GET /api/categories returns list of categories', async () => {
    const res = await fetch(`${baseUrl}/api/categories`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.ok(Array.isArray(body.data.categories));
  });

  test('Admin login and metrics retrieval', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@unimart.com',
        password: 'Password123!',
      }),
    });

    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.equal(loginBody.data.user.role, 'ADMIN');
    const adminToken = loginBody.data.token;

    // Test GET /api/admin/analytics/metrics
    const metricsRes = await fetch(`${baseUrl}/api/admin/analytics/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(metricsRes.status, 200);
    const metricsBody = await metricsRes.json();
    assert.ok(metricsBody.data.metrics.totalUsers >= 1);

    // Test GET /api/admin/users
    const usersRes = await fetch(`${baseUrl}/api/admin/users?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(usersRes.status, 200);
    const usersBody = await usersRes.json();
    assert.ok(Array.isArray(usersBody.data.users));

    // Test GET /api/admin/providers/pending
    const pendingRes = await fetch(`${baseUrl}/api/admin/providers/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(pendingRes.status, 200);
    const pendingBody = await pendingRes.json();
    assert.ok(Array.isArray(pendingBody.data.providers));
  });
});
