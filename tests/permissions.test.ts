import assert from 'node:assert/strict';
import test from 'node:test';
import { can, canManageRole, memberRoles } from '../packages/shared/src';
import { hashPassword, verifyPassword } from '../apps/web/src/lib/auth/crypto';
test('role hierarchy grants read access and restricts editing, deletion and member management', () => {
  for (const role of memberRoles) assert.equal(can(role, 'read'), true);
  assert.equal(can('VIEWER', 'edit'), false); assert.equal(can('EDITOR', 'edit'), true);
  assert.equal(can('EDITOR', 'delete'), false); assert.equal(can('EDITOR', 'members'), false);
  assert.equal(can('ADMIN', 'members'), true); assert.equal(canManageRole('ADMIN', 'OWNER'), false);
  assert.equal(canManageRole('ADMIN', 'ADMIN'), false); assert.equal(canManageRole('ADMIN', 'EDITOR'), true);
  assert.equal(canManageRole('OWNER', 'OWNER'), true);
});
test('passwords use independent salts, preserve Unicode, and reject wrong credentials', async () => {
  const password = 'Uma senha longa com acentuação!';
  const a = await hashPassword(password), b = await hashPassword(password);
  assert.notEqual(a, b); assert.equal(a.includes(password), false);
  assert.equal(await verifyPassword(password, a), true); assert.equal(await verifyPassword(password + 'x', a), false);
  assert.equal(await verifyPassword(password, 'corrupted'), false);
});
