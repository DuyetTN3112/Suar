/**
 * Script khởi động Vite với chế độ debug
 * Trước khi sử dụng, cần cài thêm cross-env nếu chưa:
 * npm install --save-dev cross-env
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tạo biến môi trường debug
const envVars = {
  ...process.env,
  VITE_DEBUG: 'true',
  DEBUG: 'vite:*,adonis:*',
  LOG_LEVEL: 'debug',
};

console.log('=== KHỞI ĐỘNG CHỨC NĂNG DEBUG VITE ===');
console.log('Đang bật chế độ debug với biến môi trường:');
console.log('VITE_DEBUG=true');
console.log('DEBUG=vite:*,adonis:*');
console.log('LOG_LEVEL=debug');

// Tạo file báo cáo lỗi
const logDir = path.join(__dirname, 'tmp', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const errorLogPath = path.join(logDir, 'vite-error.log');
const debugLogPath = path.join(logDir, 'vite-debug.log');

const errorStream = fs.createWriteStream(errorLogPath, { flags: 'a' });
const debugStream = fs.createWriteStream(debugLogPath, { flags: 'a' });

// Hàm ghi thời gian
function timestamp() {
  return `[${new Date().toISOString()}] `;
}

// Khởi động Vite với chế độ debug
const vite = spawn('node', ['ace', 'serve', '--watch'], { 
  env: envVars,
  shell: true 
});

// Ghi log stdout
vite.stdout.on('data', (data) => {
  process.stdout.write(data);
  debugStream.write(timestamp() + data);
});

// Ghi log stderr
vite.stderr.on('data', (data) => {
  process.stderr.write(data);
  errorStream.write(timestamp() + data);
});

// Xử lý khi process kết thúc
vite.on('close', (code) => {
  const message = `Vite exited with code ${code}\n`;
  errorStream.write(timestamp() + message);
  debugStream.write(timestamp() + message);
  errorStream.end();
  debugStream.end();
  console.log(message);
});

// Xử lý khi CTRL+C
process.on('SIGINT', () => {
  console.log('\nĐang dừng Vite debug...');
  vite.kill('SIGINT');
  setTimeout(() => process.exit(0), 500);
}); 