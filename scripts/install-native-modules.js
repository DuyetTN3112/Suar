#!/usr/bin/env node

/**
 * Script cài đặt các native modules cho Linux
 * Script này sẽ chạy trong môi trường Docker để cài đặt các bản Linux
 * của các native modules thay vì bản Windows mà npm cài đặt trên Windows
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Định nghĩa các cặp module Windows và Linux tương ứng
const moduleMapping = [
  { win: '@rollup/rollup-win32-x64-msvc', linux: '@rollup/rollup-linux-x64-gnu' },
  { win: '@swc/core-win32-x64-msvc', linux: '@swc/core-linux-x64-gnu' },
  { win: '@tailwindcss/oxide-win32-x64-msvc', linux: '@tailwindcss/oxide-linux-x64-gnu' },
  { win: 'lightningcss-win32-x64-msvc', linux: 'lightningcss-linux-x64-gnu' }
];

// Đầu tiên gỡ cài đặt các module Windows
console.log('Đang gỡ cài đặt các native modules Windows...');
for (const mapping of moduleMapping) {
  try {
    console.log(`Đang gỡ cài đặt ${mapping.win}...`);
    execSync(`npm uninstall ${mapping.win} --no-save`, { stdio: 'inherit' });
    console.log(`✅ Đã gỡ cài đặt ${mapping.win}`);
  } catch (error) {
    console.error(`❌ Lỗi khi gỡ cài đặt ${mapping.win}:`, error.message);
  }
}

// Sau đó cài đặt các module Linux
console.log('Đang cài đặt các native modules Linux...');
for (const mapping of moduleMapping) {
  try {
    console.log(`Đang cài đặt ${mapping.linux}...`);
    execSync(`npm install ${mapping.linux} --no-save`, { stdio: 'inherit' });
    console.log(`✅ Đã cài đặt ${mapping.linux}`);
  } catch (error) {
    console.error(`❌ Lỗi khi cài đặt ${mapping.linux}:`, error.message);
  }
}

console.log('Hoàn tất cài đặt native modules!'); 