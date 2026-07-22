/**
 * Проверяет, что версия в package.json текущей ветки строго больше версии в базовой ветке.
 * Запускается в CI на pull request — см. .github/workflows/version-check.yml.
 *
 * Использование: node scripts/check-version.mjs [базовая-ветка]
 * По умолчанию базовая ветка — origin/main.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compareVersions } from './version.mjs';

const DEFAULT_BASE_REF = 'origin/main';

function readCurrentVersion() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function readBaseVersion(baseRef) {
  const packageJson = execFileSync('git', ['show', `${baseRef}:package.json`], {
    encoding: 'utf8',
    // Своё сообщение об ошибке понятнее, чем «fatal: invalid object name» от git.
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(packageJson).version;
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const baseRef = process.argv[2] ?? DEFAULT_BASE_REF;

let baseVersion;
try {
  baseVersion = readBaseVersion(baseRef);
} catch {
  fail(
    `не удалось прочитать package.json из «${baseRef}».\n` +
      '  В CI это обычно значит, что checkout сделан без fetch-depth: 0.',
  );
}

const currentVersion = readCurrentVersion();

if (compareVersions(currentVersion, baseVersion) <= 0) {
  fail(
    `версия не выросла: в ${baseRef} — ${baseVersion}, в ветке — ${currentVersion}.\n` +
      '  Определи тип изменения (major / minor / patch) по таблице в CLAUDE.md,\n' +
      '  секция «Версионирование», и забампь version в package.json.',
  );
}

console.log(`✓ версия выросла: ${baseVersion} → ${currentVersion}`);
