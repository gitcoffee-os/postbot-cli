#!/usr/bin/env node

// 静态 import 会先于模块体执行，因此这里必须用动态 import，
// 否则 `--app postar` 会在 CLI 解析完参数后才追加。
if (!process.argv.some((arg) => arg === '--app' || arg.startsWith('--app='))) {
  process.argv.push('--app', 'postar');
}

await import('../dist/index.js');
