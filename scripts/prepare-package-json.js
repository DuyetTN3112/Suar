#!/usr/bin/env node

/**
 * Script chuẩn bị package.json cho môi trường Docker
 * Loại bỏ các dependencies Windows và thay thế bằng dependencies Linux
 */

import fs from 'fs';
import path from 'path';

// Danh sách các module Windows cần loại bỏ
const windowsModules = [
  '@rollup/rollup-win32-x64-msvc',
  '@swc/core-win32-x64-msvc',
  '@tailwindcss/oxide-win32-x64-msvc',
  'lightningcss-win32-x64-msvc'
];

// Danh sách các module Linux tương ứng
const linuxModules = [
  '@rollup/rollup-linux-x64-gnu',
  '@swc/core-linux-x64-gnu',
  '@tailwindcss/oxide-linux-x64-gnu',
  'lightningcss-linux-x64-gnu'
];

// Đọc package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('Đang chuẩn bị package.json cho Docker...');

// Loại bỏ các module Windows
windowsModules.forEach((module) => {
  if (packageJson.dependencies && packageJson.dependencies[module]) {
    delete packageJson.dependencies[module];
    console.log(`Đã loại bỏ ${module} khỏi dependencies`);
  }
  
  if (packageJson.devDependencies && packageJson.devDependencies[module]) {
    delete packageJson.devDependencies[module];
    console.log(`Đã loại bỏ ${module} khỏi devDependencies`);
  }
});

// Ghi lại package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('Đã chuẩn bị xong package.json cho Docker!'); 