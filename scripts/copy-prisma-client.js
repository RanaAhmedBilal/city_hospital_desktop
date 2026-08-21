const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/main/database/client');
const destDir = path.resolve(__dirname, '../dist-electron/main/database/client');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  try {
    fs.cpSync(srcDir, destDir, { recursive: true });
    console.log('✓ Successfully copied Prisma client to dist-electron/main/database/client');
  } catch (err) {
    console.log('ℹ️ Prisma client copy skipped (files in use by running server)');
  }
} else {
  console.warn('⚠️ Warning: src/main/database/client does not exist. Run prisma generate first.');
}
