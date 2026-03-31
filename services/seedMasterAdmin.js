const User = require('../models/User');

const ensureMasterAdmin = async () => {
  const email = (process.env.MASTER_ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD || 'admin123';

  const existing = await User.findOne({ email });
  if (!existing) {
    const user = new User({
      email,
      password,
      role: 'master_admin',
    });

    await user.save();
    return;
  }

  if (existing.role !== 'master_admin') {
    existing.role = 'master_admin';
    await existing.save();
  }
};

module.exports = ensureMasterAdmin;
