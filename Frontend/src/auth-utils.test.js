import test from 'node:test';
import assert from 'node:assert/strict';
import { registerUser, authenticateUser, requestPasswordReset, resetPasswordWithOtp } from './auth-utils.js';

test('registers a user and authenticates with stored password', () => {
  const users = [];
  const user = registerUser({
    name: 'Asha Rao',
    contact: 'asha@example.com',
    password: 'Abc123!@',
    confirmPassword: 'Abc123!@',
    role: 'Student',
    users,
  });

  assert.equal(user.name, 'Asha Rao');
  assert.equal(users.length, 1);

  const session = authenticateUser(users, 'asha@example.com', 'Abc123!@');
  assert.equal(session.role, 'Student');
});

test('requests reset and resets password with OTP', () => {
  const users = [{ id: 1, name: 'Asha Rao', contact: 'asha@example.com', password: 'OldPass1!', role: 'Student' }];

  const resetState = requestPasswordReset(users, 'asha@example.com');
  assert.equal(resetState.otp.length, 6);

  const updated = resetPasswordWithOtp(users, 'asha@example.com', resetState.otp, 'NewPass1!', 'NewPass1!');
  assert.equal(updated.password, 'NewPass1!');
});

test('rejects mismatched passwords during registration', () => {
  const users = [];

  assert.throws(
    () =>
      registerUser({
        name: 'Asha Rao',
        contact: 'asha@example.com',
        password: 'Abc123!@',
        confirmPassword: 'Different123!',
        role: 'Student',
        users,
      }),
    /Passwords do not match/
  );
});
