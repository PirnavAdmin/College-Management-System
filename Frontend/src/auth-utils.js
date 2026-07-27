const ROLE_OPTIONS = ['Super Admin', 'College Admin', 'HOD', 'Faculty', 'Student', 'Parent', 'Accounts', 'Examination Cell', 'Library', 'Hostel Warden', 'Placement Officer'];

function createUser({ name, contact, password, role, users }) {
  const normalizedContact = contact.trim().toLowerCase();
  const existingUser = users.find((user) => user.contact.toLowerCase() === normalizedContact);

  if (existingUser) {
    throw new Error('User already exists. Please login instead.');
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    contact: normalizedContact,
    password,
    role,
  };

  users.push(newUser);
  return newUser;
}

function registerUser({ name, contact, password, confirmPassword, role, users }) {
  if (!name?.trim()) {
    throw new Error('Name is required.');
  }

  if (!contact?.trim()) {
    throw new Error('Email or phone number is required.');
  }

  if (!password || password !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }

  if (!ROLE_OPTIONS.includes(role)) {
    throw new Error('Please select a valid role.');
  }

  return createUser({ name, contact, password, role, users });
}

function authenticateUser(users, contact, password) {
  const normalizedContact = contact.trim().toLowerCase();
  const user = users.find((entry) => entry.contact.toLowerCase() === normalizedContact);

  if (!user || user.password !== password) {
    throw new Error('Invalid credentials.');
  }

  return { userId: user.id, role: user.role, name: user.name };
}

function requestPasswordReset(users, contact) {
  const normalizedContact = contact.trim().toLowerCase();
  const user = users.find((entry) => entry.contact.toLowerCase() === normalizedContact);

  if (!user) {
    throw new Error('No account found for this email or phone number.');
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  return { otp, contact: user.contact };
}

function resetPasswordWithOtp(users, contact, otp, password, confirmPassword) {
  const normalizedContact = contact.trim().toLowerCase();
  const user = users.find((entry) => entry.contact.toLowerCase() === normalizedContact);

  if (!user) {
    throw new Error('No account found for this email or phone number.');
  }

  if (!password || password !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }

  if (!otp || otp.length !== 6) {
    throw new Error('OTP must be 6 digits.');
  }

  user.password = password;
  return user;
}

export { ROLE_OPTIONS, registerUser, authenticateUser, requestPasswordReset, resetPasswordWithOtp };
