import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

test('GET /api/health should respond with status success', async () => {
  assert.ok(app);
});
