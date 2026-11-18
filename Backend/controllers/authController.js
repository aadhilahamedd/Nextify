const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/apiResponse');
const { getJwtSecret, REFRESH_WINDOW_MS, signAuthToken, publicUser } = require('../utils/authToken');

/** Public registration always creates a normal user. Privilege fields in the body are ignored. */
function buildRegisteredUserDocument({ username, email, passwordHash }) {
  return {
    username,
    email,
    password: passwordHash,
    role: 'user',
  };
}

async function authenticateByEmailPassword(email, password) {
  const normalizedEmail = email?.toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, status: 400, message: 'Email and password are required' };
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { ok: false, status: 401, message: 'Invalid email or password' };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { ok: false, status: 401, message: 'Invalid email or password' };
  }

  return { ok: true, user };
}

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const normalizedEmail = email?.toLowerCase();

    if (!username || !normalizedEmail || !password) {
      return error(res, 400, 'All fields are required');
    }

    // Explicitly ignore privilege / mass-assignment fields from the client.
    // role, isAdmin, and similar must never influence registration.
    void req.body?.role;
    void req.body?.isAdmin;
    void req.body?.admin;

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return error(res, 409, 'User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User(
      buildRegisteredUserDocument({
        username,
        email: normalizedEmail,
        passwordHash: hashedPassword,
      }),
    );

    await newUser.save();

    const token = signAuthToken(newUser);

    return success(res, 201, 'Registration successful', {
      token,
      user: publicUser(newUser),
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return error(res, 500, 'Error during registration');
  }
};

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await authenticateByEmailPassword(email, password);
    if (!result.ok) {
      return error(res, result.status, result.message);
    }

    const token = signAuthToken(result.user);
    return success(res, 200, 'Login successful', {
      token,
      user: publicUser(result.user),
    });
  } catch (err) {
    console.error('User login error:', err.message);
    return error(res, 500, 'Error during login');
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await authenticateByEmailPassword(email, password);
    if (!result.ok) {
      return error(res, result.status, result.message);
    }

    if (result.user.role !== 'admin') {
      return error(res, 403, 'Admin access denied');
    }

    const token = signAuthToken(result.user);
    return success(res, 200, 'Login successful', {
      token,
      user: publicUser(result.user),
    });
  } catch (err) {
    console.error('Admin login error:', err.message);
    return error(res, 500, 'Error during login');
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return error(res, 404, 'User not found');
    return success(res, 200, 'User profile', {
      user: publicUser(user),
    });
  } catch (err) {
    return error(res, 500, 'Error fetching profile');
  }
};

exports.refresh = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 401, 'Access denied. No token provided.');
    }
    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      if (err.name !== 'TokenExpiredError') {
        return error(res, 403, 'Invalid token.');
      }
      decoded = jwt.verify(token, getJwtSecret(), { ignoreExpiration: true });
      const expiredAt = Number(decoded.exp) * 1000;
      if (!expiredAt || Date.now() - expiredAt > REFRESH_WINDOW_MS) {
        return error(res, 401, 'Token has expired. Please login again.');
      }
    }

    const user = await User.findById(decoded.userId);
    if (!user) return error(res, 401, 'User not found');

    return success(res, 200, 'Session refreshed', {
      token: signAuthToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    return error(res, 401, 'Token has expired. Please login again.');
  }
};

// Exported for unit tests only — not an HTTP route.
exports._test = {
  buildRegisteredUserDocument,
};
