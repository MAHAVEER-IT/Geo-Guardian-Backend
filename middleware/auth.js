const jwt = require('jsonwebtoken');
const User = require('../models/User');

const buildToken = (user) => {
  const secret = process.env.JWT_SECRET || 'geo-guardian-dev-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    secret,
    { expiresIn }
  );
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const secret = process.env.JWT_SECRET || 'geo-guardian-dev-secret';
    const payload = jwt.verify(token, secret);

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    req.token = token;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions',
    });
  }

  return next();
};

module.exports = {
  buildToken,
  authenticate,
  requireRole,
};
