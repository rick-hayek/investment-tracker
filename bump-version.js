#!/usr/bin/env node

/**
 * bump-version.js
 * 
 * 自动更新版本号与 Android versionCode 脚本:
 * - 接受一个可选参数作为目标版本号 (如: node bump-version.js 1.1.6)
 * - 如果未提供参数，最后一位自动加 1 (如: 1.0.0 -> 1.0.1)
 * - android/app/build.gradle 中的 versionCode 始终自增 1
 * - 同步更新 package.json, app.json, package-lock.json, android/app/build.gradle
 */

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const pkgPath = path.join(rootDir, 'package.json');
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
const appJsonPath = path.join(rootDir, 'app.json');
const lockPath = path.join(rootDir, 'package-lock.json');

// 1. 读取 package.json 获取当前版本
if (!fs.existsSync(pkgPath)) {
  console.error('❌ Error: package.json not found at', pkgPath);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

// 2. 解析新版本号
let nextVersion = '';
const inputArg = process.argv[2];

if (inputArg && inputArg.trim()) {
  // 清洗可能传入的前缀 'v' (例如 v1.1.6 -> 1.1.6)
  nextVersion = inputArg.trim().replace(/^v/i, '');
} else {
  // 默认最后一位递增
  const parts = currentVersion.split('.');
  if (parts.length > 0) {
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      parts[parts.length - 1] = String(lastNum + 1);
      nextVersion = parts.join('.');
    } else {
      nextVersion = currentVersion + '.1';
    }
  } else {
    nextVersion = '1.0.1';
  }
}

console.log(`🚀 Bumping version: ${currentVersion} -> ${nextVersion}`);

// 3. 更新 package.json
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✅ Updated package.json (version: ${nextVersion})`);

// 4. 更新 app.json (Expo 配置)
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo) {
      appJson.expo.version = nextVersion;
    }
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated app.json (version: ${nextVersion})`);
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to update app.json:`, err.message);
  }
}

// 5. 更新 package-lock.json (若存在)
if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.version = nextVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = nextVersion;
    }
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated package-lock.json (version: ${nextVersion})`);
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to update package-lock.json:`, err.message);
  }
}

// 6. 更新 android/app/build.gradle (versionCode 自增 1, versionName 更新为 nextVersion)
if (fs.existsSync(gradlePath)) {
  let gradleContent = fs.readFileSync(gradlePath, 'utf8');

  let oldVersionCode = 1;
  let newVersionCode = 2;

  // 匹配 versionCode <num>
  gradleContent = gradleContent.replace(/(versionCode\s+)(\d+)/, (match, prefix, codeStr) => {
    oldVersionCode = parseInt(codeStr, 10);
    newVersionCode = oldVersionCode + 1;
    return `${prefix}${newVersionCode}`;
  });

  // 匹配 versionName "<version>" 或 versionName '<version>'
  gradleContent = gradleContent.replace(/(versionName\s+["'])([^"']+)(["'])/, (match, prefix, oldVersion, suffix) => {
    return `${prefix}${nextVersion}${suffix}`;
  });

  fs.writeFileSync(gradlePath, gradleContent, 'utf8');
  console.log(`✅ Updated android/app/build.gradle:`);
  console.log(`   - versionCode: ${oldVersionCode} -> ${newVersionCode}`);
  console.log(`   - versionName: "${nextVersion}"`);
} else {
  console.warn(`⚠️ Warning: ${gradlePath} not found.`);
}

console.log(`🎉 Version bump complete!`);
