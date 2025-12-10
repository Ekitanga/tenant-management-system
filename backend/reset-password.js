const bcrypt = require('bcryptjs');
const db = require('./database');

// Get username from command line
const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.log('\n========================================');
  console.log('   PASSWORD RESET TOOL');
  console.log('========================================\n');
  console.log('Usage: node reset-password.js <username> <newpassword>');
  console.log('\nExample:');
  console.log('  node reset-password.js admin newpassword123');
  console.log('  node reset-password.js john.mwangi tenant123\n');
  process.exit(1);
}

// Find user
const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

if (!user) {
  console.log('\n❌ User not found:', username);
  console.log('\nAvailable users:');
  const users = db.prepare('SELECT id, username, role FROM users').all();
  console.table(users);
  process.exit(1);
}

// Hash new password
const hashedPassword = bcrypt.hashSync(newPassword, 10);

// Update password
db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

console.log('\n========================================');
console.log('   PASSWORD RESET SUCCESSFUL!');
console.log('========================================\n');
console.log('User:', user.username);
console.log('Role:', user.role);
console.log('Email:', user.email);
console.log('New Password:', newPassword);
console.log('\n✅ Password has been reset!');
console.log('\nYou can now login with:');
console.log('  Username:', user.username);
console.log('  Password:', newPassword);
console.log('\n========================================\n');

db.close();
