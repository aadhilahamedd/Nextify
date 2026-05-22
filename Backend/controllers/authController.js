const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    role: 'admin'
  });
  return adminUser.save();
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase();

    // Validate required fields
    if (!username || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Assign role: if email matches configured ADMIN_EMAIL or hardcoded default, make admin, otherwise user
    const assignedRole = (normalizedEmail === DEFAULT_ADMIN_EMAIL) ? 'admin' : 'user';

    const newUser = new User({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Error during registration', error: err.message });
  }
};

// User login
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase();

    // Validate required fields
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email (do not restrict by role so admins and users can both login here)
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      if (normalizedEmail === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
        user = await createDefaultAdmin();
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }

    // Ensure default admin email always has admin role
    if (user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('User login error:', err);
    return res.status(500).json({ message: 'Error during login', error: err.message });
  }
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase();

    // Validate required fields
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find admin by email
    let admin = await User.findOne({ email: normalizedEmail, role: 'admin' });
    if (!admin) {
      if (normalizedEmail === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
        admin = await createDefaultAdmin();
      } else {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ message: 'Error during admin login', error: err.message });
  }
};
