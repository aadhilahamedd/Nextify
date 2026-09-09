const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'nextify_fallback_secret';
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase() : 'support@nextify.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nextify123';
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Nextify Admin';

const createDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
  if (existingAdmin) {
    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
    }
    return existingAdmin;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);
  const adminUser = new User({
    username: DEFAULT_ADMIN_USERNAME,
    email: DEFAULT_ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
  });
  return adminUser.save();
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase();

    if (!username || !normalizedEmail || !password) {
      return error(res, 400, 'All fields are required');
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return error(res, 409, 'User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const assignedRole = normalizedEmail === DEFAULT_ADMIN_EMAIL ? 'admin' : 'user';

    const newUser = new User({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });

    return success(res, 201, 'Registration successful', {
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return error(res, 500, 'Error during registration', [err.message]);
  }
};

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase();

    if (!normalizedEmail || !password) {
      return error(res, 400, 'Email and password are required');
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      if (normalizedEmail === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
        user = await createDefaultAdmin();
      } else {
        return error(res, 401, 'Invalid email or password');
      }
    }

    if (user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return error(res, 401, 'Invalid email or password');
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    return success(res, 200, 'Login successful', {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('User login error:', err);
    return error(res, 500, 'Error during login', [err.message]);
  }
};

exports.adminLogin = exports.userLogin;

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return error(res, 404, 'User not found');
    return success(res, 200, 'User profile', {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return error(res, 500, 'Error fetching profile', [err.message]);
  }
};
