import { readFileSync } from 'node:fs';

interface PackageJson {
  version?: string;
  name?: string;
}

function readPackageJson(): PackageJson {
  try {
    const url = new URL('../package.json', import.meta.url);
    return JSON.parse(readFileSync(url, 'utf-8')) as PackageJson;
  } catch {
    return {};
  }
}

const pkg = readPackageJson();

/** CLI 版本：直接读取 package.json，避免与发布版本脱节 */
export const VERSION = pkg.version ?? '0.0.0';
export const PACKAGE_NAME = pkg.name ?? '@gitcoffee/postbot-cli';
