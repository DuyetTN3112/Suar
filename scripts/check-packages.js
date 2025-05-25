import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Danh sách packages cần kiểm tra
const packagesToCheck = [
  // Các package quan trọng cần kiểm tra kỹ
  '@tanstack/react-table',
  'react-day-picker',
  'recharts',
  'zod',
  'uuid',
  'input-otp',
  'react-resizable-panels',
  'next-themes',
  'vaul',

  // Các UI components
  '@heroicons/react',
  '@tabler/icons-react',
  'feather-icons',
  'lucide-react',

  // Form related
  '@hookform/resolvers',

  // Database & APIs
  'better-sqlite3',
  'mysql2',
  'googleapis',
  '@google-cloud/local-auth',
  'nodemailer',

  // Radix UI components cụ thể
  '@radix-ui/react-accordion',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-progress',
  '@radix-ui/react-slider'
];

function searchForPackageImports(rootDir, packageNames) {
  const results = {};
  packageNames.forEach(pkg => results[pkg] = { found: false, files: [] });

  function scanDirectory(directory) {
    try {
      const files = fs.readdirSync(directory);

      files.forEach(file => {
        const fullPath = path.join(directory, file);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
            scanDirectory(fullPath);
          } else if (stat.isFile()) {
            // Chỉ kiểm tra các file code
            if (/\.(js|jsx|ts|tsx|vue|svelte)$/.test(file)) {
              const content = fs.readFileSync(fullPath, 'utf8');

              packageNames.forEach(pkg => {
                // Tìm import/require statements
                const importPatterns = [
                  new RegExp(`import\\s+.*\\s+from\\s+['"]${pkg}['"]`),
                  new RegExp(`require\\(['"]${pkg}['"]\\)`),
                  new RegExp(`from\\s+['"]${pkg}['"]`),
                  new RegExp(`['"]${pkg}['"]`)
                ];

                const isUsed = importPatterns.some(pattern => pattern.test(content));
                if (isUsed) {
                  results[pkg].found = true;
                  results[pkg].files.push(fullPath);
                }
              });
            }

            // Kiểm tra cả config files
            if (/\.(json|config\.js|config\.ts)$/.test(file)) {
              const content = fs.readFileSync(fullPath, 'utf8');
              packageNames.forEach(pkg => {
                if (content.includes(pkg)) {
                  results[pkg].found = true;
                  results[pkg].files.push(fullPath);
                }
              });
            }
          }
        } catch (err) {
          // Bỏ qua file không đọc được
        }
      });
    } catch (err) {
      console.log(`Cannot read directory: ${directory}`);
    }
  }

  // Quét các thư mục quan trọng
  const scanDirs = ['./app', './resources', './config', './database', './start', './bin'];
  scanDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      scanDirectory(dir);
    }
  });

  // Quét file root
  const rootFiles = [
    'package.json',
    'vite.config.js',
    'vite.config.ts',
    'tailwind.config.js',
    'tailwind.config.ts',
    'tsconfig.json'
  ];

  rootFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      packageNames.forEach(pkg => {
        if (content.includes(pkg)) {
          results[pkg].found = true;
          results[pkg].files.push(file);
        }
      });
    }
  });

  return results;
}

console.log('🔍 Đang kiểm tra package usage...\n');
const results = searchForPackageImports('.', packagesToCheck);

// Hiển thị kết quả
console.log('📦 KẾT QUẢ KIỂM TRA PACKAGE USAGE:\n');

const usedPackages = [];
const unusedPackages = [];

Object.entries(results).forEach(([pkg, data]) => {
  if (data.found) {
    usedPackages.push({ package: pkg, files: data.files });
  } else {
    unusedPackages.push(pkg);
  }
});

console.log('✅ PACKAGES ĐANG ĐƯỢC SỬ DỤNG:');
usedPackages.forEach(item => {
  console.log(`\n📁 ${item.package}`);
  item.files.forEach(file => console.log(`   └── ${file}`));
});

console.log('\n❌ PACKAGES KHÔNG ĐƯỢC SỬ DỤNG (có thể gỡ bỏ):');
unusedPackages.forEach(pkg => {
  console.log(`   ${pkg}`);
});

console.log(`\n📊 Tổng kết: ${usedPackages.length} packages đang dùng, ${unusedPackages.length} packages không dùng`);
