import dotenv from 'dotenv';
dotenv.config();
process.env.DISABLE_EMAIL_SENDING = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import emailService from '../src/services/email.service.js';

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

  test('POST /api/auth/send-verification-otp sends OTP for new email and rejects invalid OTP on register', async () => {
    const freshEmail = `otp_${ts}@ms.sab.ac.lk`;
    const otpRes = await fetch(`${baseUrl}/api/auth/send-verification-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: freshEmail }),
    });

    assert.equal(otpRes.status, 200);
    const otpBody = await otpRes.json();
    assert.equal(otpBody.status, 'success');

    const badRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: freshEmail,
        password: 'Password123!',
        otpCode: '000000',
      }),
    });

    assert.equal(badRegRes.status, 400);
  });

  test('POST /api/auth/forgot-password accepts registered email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
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

  test('POST /api/auth/register saves STUDENT_PROVIDER academic details only for student providers and EXTERNAL_PROVIDER without academic details', async () => {
    const studEmail = `22cse9${String(ts).slice(-3)}@ms.sab.ac.lk`;
    const studRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studEmail,
        password: 'Password123!',
        contactNumber: '+94771112222',
        role: 'PROVIDER',
        providerType: 'Student provider',
        verificationData: {
          fullName: '22CSE9001',
          universityEmail: studEmail,
          university: 'Sabaragamuwa University of Sri Lanka',
          faculty: 'Faculty of Computing',
          department: 'Software Engineering',
          intakeBatch: '22/23',
          studentId: '22CSE9001',
        },
      }),
    });

    assert.equal(studRes.status, 201);
    const studBody = await studRes.json();
    assert.equal(studBody.data.user.providerProfile.providerType, 'STUDENT_PROVIDER');
    assert.equal(studBody.data.user.userProfile.userType, 'STUDENT');
    assert.equal(studBody.data.user.userProfile.university, 'Sabaragamuwa University of Sri Lanka');
    assert.equal(studBody.data.user.userProfile.faculty, 'Faculty of Computing');
    assert.equal(studBody.data.user.userProfile.universityIdNumber, '22CSE9001');

    const extEmail = `extprov_${ts}@gmail.com`;
    const extRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: extEmail,
        password: 'Password123!',
        contactNumber: '+94773334444',
        role: 'PROVIDER',
        providerType: 'EXTERNAL_PROVIDER',
        verificationData: {
          fullName: 'extprov',
          university: 'Should Not Store',
          faculty: 'Should Not Store',
        },
      }),
    });

    assert.equal(extRes.status, 201);
    const extBody = await extRes.json();
    assert.equal(extBody.data.user.providerProfile.providerType, 'EXTERNAL_PROVIDER');
    assert.equal(extBody.data.user.userProfile.userType, 'EXTERNAL');
    assert.equal(extBody.data.user.userProfile.university, null);
    assert.equal(extBody.data.user.userProfile.faculty, null);
    assert.equal(extBody.data.user.userProfile.universityIdNumber, null);
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

  test('PUT /api/auth/profile keeps provider PENDING until Admin approves via /api/admin/providers/:id/verify', async () => {
    const sentVerifiedEmails = [];
    const originalSendProfileVerified = emailService.sendProfileCompletedEmail.bind(emailService);
    emailService.sendProfileCompletedEmail = async (payload) => {
      sentVerifiedEmails.push(payload);
      return originalSendProfileVerified(payload);
    };

    try {
      const profileRes = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
          fullName: 'Campus Tools Owner',
          contactNumber: '+94779990000',
          providerDisplayName: 'Campus Tools Hub',
          isProvider: true,
          providerType: 'STUDENT_PROVIDER',
          studentEvidenceUrl: 'id_doc_sample.pdf',
        }),
      });

      assert.equal(profileRes.status, 200);
      const profileBody = await profileRes.json();
      assert.equal(profileBody.data.user.userProfile.isCompleted, true);
      assert.equal(profileBody.data.user.providerProfile.verificationStatus, 'PENDING');
      assert.equal(sentVerifiedEmails.length, 0);
      const providerId = profileBody.data.user.providerProfile.id;

      // Login as admin and inspect verificationChecks + approve
      const adminLoginRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@unimart.lk', password: 'admin123' }),
      });
      assert.equal(adminLoginRes.status, 200);
      const adminToken = (await adminLoginRes.json()).data.token;

      const detailRes = await fetch(`${baseUrl}/api/admin/providers/${providerId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(detailRes.status, 200);
      const detailBody = await detailRes.json();
      assert.equal(detailBody.data.provider.verificationChecks.profileCompleted, true);
      assert.equal(detailBody.data.provider.verificationChecks.noDuplicateAccount, true);
      assert.equal(detailBody.data.provider.verificationChecks.noViolations, true);

      const approveRes = await fetch(`${baseUrl}/api/admin/providers/${providerId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'VERIFIED' }),
      });
      assert.equal(approveRes.status, 200);
      assert.equal((await approveRes.json()).data.provider.verificationStatus, 'VERIFIED');
      assert.equal(sentVerifiedEmails.length, 1);
      assert.equal(sentVerifiedEmails[0].to, testProviderEmail);
      assert.equal(sentVerifiedEmails[0].accountType, 'Student Provider');

      // Verify provider /auth/me now reflects VERIFIED
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${providerToken}` },
      });
      assert.equal(meRes.status, 200);
      assert.equal((await meRes.json()).data.user.providerProfile.verificationStatus, 'VERIFIED');
    } finally {
      emailService.sendProfileCompletedEmail = originalSendProfileVerified;
    }
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

  test('POST /api/auth/admin/login authenticates admin@unimart.lk and rejects non-admin accounts', async () => {
    const okRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@unimart.lk',
        password: 'admin123',
      }),
    });

    assert.equal(okRes.status, 200);
    const okBody = await okRes.json();
    assert.equal(okBody.status, 'success');
    assert.equal(okBody.data.user.role, 'ADMIN');
    assert.ok(okBody.data.token);

    // Wrong password -> 401
    const badPassRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@unimart.lk',
        password: 'wrongpassword',
      }),
    });
    assert.equal(badPassRes.status, 401);

    // Non-admin user -> 403
    const nonAdminRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dilshan@campus.ac.lk',
        password: 'Password123!',
      }),
    });
    assert.equal(nonAdminRes.status, 403);
  });

  test('Admin User Management endpoints filter, fetch details, update status, and bulk delete', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@unimart.lk',
        password: 'admin123',
      }),
    });
    assert.equal(loginRes.status, 200);
    const { token: adminToken } = (await loginRes.json()).data;

    // Create a temporary test user for status toggle & delete verification
    const tempEmail = `um_test_${Date.now()}@ms.sab.ac.lk`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: tempEmail,
        password: 'Password123!',
        role: 'USER',
      }),
    });
    assert.equal(regRes.status, 201);
    const tempUserId = (await regRes.json()).data.user.id;

    // List buyer-only users (role=USER) and verify no providers or admins appear
    const listRes = await fetch(
      `${baseUrl}/api/admin/users?role=USER&search=${encodeURIComponent(tempEmail)}&limit=6&sort=recent`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.data.users.length, 1);
    assert.equal(listBody.data.users[0].id, tempUserId);
    assert.ok(listBody.data.users.every((u) => u.role === 'USER' && !u.providerProfile));
    assert.equal(typeof listBody.counts.all, 'number');
    assert.equal(typeof listBody.counts.students, 'number');
    assert.equal(typeof listBody.counts.external, 'number');
    assert.equal(typeof listBody.counts.suspended, 'number');

    // Fetch single user details
    const detailRes = await fetch(`${baseUrl}/api/admin/users/${tempUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(detailRes.status, 200);
    const detailBody = await detailRes.json();
    assert.equal(detailBody.data.user.email, tempEmail);

    // Bulk suspend -> then activate single
    const bulkSuspendRes = await fetch(`${baseUrl}/api/admin/users/bulk-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ ids: [tempUserId], status: 'SUSPENDED' }),
    });
    assert.equal(bulkSuspendRes.status, 200);

    const activateRes = await fetch(`${baseUrl}/api/admin/users/${tempUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    assert.equal(activateRes.status, 200);
    assert.equal((await activateRes.json()).data.user.status, 'ACTIVE');

    // Clean up temporary user via bulk delete
    const deleteRes = await fetch(`${baseUrl}/api/admin/users/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ ids: [tempUserId] }),
    });
    assert.equal(deleteRes.status, 200);
    assert.equal((await deleteRes.json()).data.deletedCount, 1);

    // List approved providers only (Providers page) and unapproved providers only (Verifications page)
    const approvedRes = await fetch(
      `${baseUrl}/api/admin/providers?verificationStatus=VERIFIED&limit=6&sort=recent`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert.equal(approvedRes.status, 200);
    const approvedBody = await approvedRes.json();
    assert.ok(Array.isArray(approvedBody.data.providers));
    assert.ok(approvedBody.data.providers.every((p) => p.verificationStatus === 'VERIFIED'));

    const queueRes = await fetch(
      `${baseUrl}/api/admin/providers?excludeVerificationStatus=VERIFIED&limit=6&sort=recent`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert.equal(queueRes.status, 200);
    const queueBody = await queueRes.json();
    assert.ok(Array.isArray(queueBody.data.providers));
    assert.ok(queueBody.data.providers.every((p) => p.verificationStatus !== 'VERIFIED'));

    if (approvedBody.data.providers.length > 0) {
      const firstProviderId = approvedBody.data.providers[0].id;
      const singleProviderRes = await fetch(`${baseUrl}/api/admin/providers/${firstProviderId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(singleProviderRes.status, 200);
      const singleBody = await singleProviderRes.json();
      assert.equal(singleBody.data.provider.id, firstProviderId);
    }
  });
});
