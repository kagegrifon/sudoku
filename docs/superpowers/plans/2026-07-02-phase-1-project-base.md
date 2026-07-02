# Фаза 1: База проекта — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Инициализировать Vite + React + TypeScript проект с ESLint/Prettier, Vitest, базовым `vite-plugin-pwa` и структурой каталогов, чтобы все последующие фазы стартовали с готового, проверяемого фундамента.

**Architecture:** Стандартный Vite-scaffold React+TS, поверх которого добавляются линтинг, формат, тест-раннер и PWA-плагин с плейсхолдер-иконками. Создаётся скелет каталогов слоёв `core/`, `state/`, `components/` ([ADR-0003](../../adr/0003-state-architecture.md)).

**Tech Stack:** TypeScript, Vite, React 18, CSS Modules, Vitest, ESLint, Prettier, vite-plugin-pwa.

## Global Constraints

- TypeScript + Vite, React 18, CSS Modules (не Tailwind — [ADR-0001](../../adr/0001-css-approach.md)).
- Слои `components → state → core`; `core/` без React/DOM ([ADR-0003](../../adr/0003-state-architecture.md)).
- Читаемость по CLAUDE.md; E2E-селекторы по `data-testid`.
- Git: работа в ветке `feat/phase-1-project-base`, коммиты в формате `<type>: <описание> (Phase 1)`.
- Не коммитить `node_modules/`, `dist/`.

---

### Task 1: Инициализация ветки и Vite-проекта

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `.gitignore`

**Interfaces:**
- Consumes: —
- Produces: рабочий `npm run dev` / `npm run build`; корневой React-компонент `App`.

- [ ] **Step 1: Создать ветку**

```bash
git checkout main
git checkout -b feat/phase-1-project-base
```

- [ ] **Step 2: Скаффолд Vite-проекта в текущую директорию**

Проект уже содержит `docs/`, `CLAUDE.md`, `README.md` — scaffold в непустую папку. Инициализируем во временную и переносим, либо используем `--template` с ручным слиянием. Выполнить:

```bash
npm create vite@latest sudoku-tmp -- --template react-ts
# перенести содержимое sudoku-tmp/* в корень, кроме README.md и .gitignore (слить вручную)
cp -r sudoku-tmp/src ./ 2>/dev/null || true
cp sudoku-tmp/index.html sudoku-tmp/vite.config.ts sudoku-tmp/tsconfig.json sudoku-tmp/tsconfig.node.json sudoku-tmp/package.json ./
rm -rf sudoku-tmp
```

Если Vite-шаблон изменил структуру файлов — ориентироваться на актуальный вывод `npm create vite`, сохранив React+TS.

- [ ] **Step 3: Настроить `.gitignore`**

```gitignore
node_modules/
dist/
dist-ssr/
*.local
.DS_Store
.env
coverage/
dev-dist/
```

- [ ] **Step 4: Установить зависимости и проверить сборку**

```bash
npm install
npm run build
```
Expected: сборка проходит без ошибок, создаётся `dist/`.

- [ ] **Step 5: Проверить dev-сервер**

Run: `npm run dev`
Expected: сервер стартует, страница Vite+React открывается на `http://localhost:5173`. Остановить (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html src/
git commit -m "chore: Инициализировать Vite + React + TS проект (Phase 1)"
```

---

### Task 2: ESLint + Prettier

**Files:**
- Create: `.eslintrc.cjs` (или `eslint.config.js` при flat-config), `.prettierrc.json`, `.prettierignore`
- Modify: `package.json` (скрипты `lint`, `format`)

**Interfaces:**
- Consumes: проект из Task 1.
- Produces: команды `npm run lint`, `npm run format`.

- [ ] **Step 1: Установить зависимости**

```bash
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react-hooks eslint-plugin-react-refresh @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

- [ ] **Step 2: Создать `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 3: Создать `.prettierignore`**

```
dist
dev-dist
coverage
node_modules
```

- [ ] **Step 4: Настроить ESLint**

Использовать конфиг, сгенерированный Vite-шаблоном, как основу; добавить `eslint-config-prettier` последним в extends, чтобы отключить конфликтующие правила форматирования. Убедиться, что включены `react-hooks` и `@typescript-eslint`.

- [ ] **Step 5: Добавить скрипты в `package.json`**

```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  }
}
```

- [ ] **Step 6: Прогнать линт и формат**

Run: `npm run format && npm run lint`
Expected: format проходит; lint завершается без ошибок (0 warnings).

- [ ] **Step 7: Commit**

```bash
git add .eslintrc.cjs eslint.config.js .prettierrc.json .prettierignore package.json package-lock.json src/
git commit -m "chore: Настроить ESLint и Prettier (Phase 1)"
```
(закоммитить реально существующий конфиг ESLint — `.eslintrc.cjs` или `eslint.config.js`.)

---

### Task 3: Vitest

**Files:**
- Modify: `vite.config.ts` (секция `test`)
- Modify: `package.json` (скрипты `test`, `type-check`)
- Create: `src/core/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: проект из Task 1.
- Produces: команды `npm test`, `npm run type-check`; работающий Vitest.

- [ ] **Step 1: Установить Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Добавить конфиг тестов в `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 3: Добавить скрипты в `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Написать smoke-тест**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('запускает Vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Прогнать тесты и type-check**

Run: `npm test && npm run type-check`
Expected: 1 тест проходит; `tsc --noEmit` без ошибок.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts package.json package-lock.json src/core/__tests__/smoke.test.ts
git commit -m "chore: Настроить Vitest и type-check (Phase 1)"
```

---

### Task 4: Скелет каталогов слоёв

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/.gitkeep`, `src/state/.gitkeep`, `src/components/.gitkeep`
- Delete: `src/core/__tests__/smoke.test.ts` (заменяется реальными тестами в Фазе 2 — но оставить до появления первого настоящего теста, чтобы `npm test` не падал на «нет тестов»)

**Interfaces:**
- Consumes: —
- Produces: базовые типы `Difficulty`, `Grid`, `Cell` для всех фаз.

- [ ] **Step 1: Создать базовые типы**

`src/core/types.ts`:
```ts
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Поле судоку 9×9. 0 = пустая клетка. */
export type Grid = number[][];

export const GRID_SIZE = 9;
export const BOX_SIZE = 3;
export const EMPTY_CELL = 0;
```

- [ ] **Step 2: Создать скелет каталогов**

```bash
mkdir -p src/state src/components
touch src/state/.gitkeep src/components/.gitkeep
```

- [ ] **Step 3: Проверить type-check**

Run: `npm run type-check`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/core/types.ts src/state/.gitkeep src/components/.gitkeep
git commit -m "chore: Добавить базовые типы и скелет каталогов слоёв (Phase 1)"
```

---

### Task 5: Базовый vite-plugin-pwa с плейсхолдер-иконками

**Files:**
- Modify: `vite.config.ts` (подключение `VitePWA`)
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`, `public/icons/apple-touch-icon.png` (плейсхолдеры)
- Modify: `index.html` (iOS-метатеги)

**Interfaces:**
- Consumes: проект из Task 1.
- Produces: сгенерированный manifest + SW при сборке; фундамент для полной PWA-полировки в Фазе 7.

- [ ] **Step 1: Установить плагин**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Создать плейсхолдер-иконки**

Сгенерировать простые PNG-плейсхолдеры нужных размеров (одноцветный квадрат допустим на этой фазе — финальные иконки в Фазе 7). Файлы: `icon-192.png` (192×192), `icon-512.png` (512×512), `maskable-512.png` (512×512), `apple-touch-icon.png` (180×180) в `public/icons/`.

- [ ] **Step 3: Подключить VitePWA в `vite.config.ts`**

```ts
import { VitePWA } from 'vite-plugin-pwa';

// в массив plugins добавить:
VitePWA({
  registerType: 'prompt',
  includeAssets: ['icons/apple-touch-icon.png'],
  manifest: {
    name: 'Судоку',
    short_name: 'Судоку',
    description: 'Судоку — играй офлайн',
    display: 'standalone',
    theme_color: '#1e293b',
    background_color: '#ffffff',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
}),
```
`registerType: 'prompt'` — по [ADR-0004](../../adr/0004-pwa-update-strategy.md). Ориентацию НЕ фиксируем (spec §4.1).

- [ ] **Step 4: Добавить iOS-метатеги в `index.html`**

В `<head>`:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

- [ ] **Step 5: Проверить сборку и наличие manifest**

Run: `npm run build`
Expected: сборка проходит; в `dist/` появляются `manifest.webmanifest` и `sw.js`.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts index.html public/icons/
git commit -m "feat: Добавить базовый vite-plugin-pwa с плейсхолдер-иконками (Phase 1)"
```

---

### Task 6: Обновить трекинг и завершить фазу

**Files:**
- Modify: `docs/roadmap.md` (строка «База проекта» → `✅ готово`, дата, ветка)
- Modify: `docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md` (отметить Фазу 1)

- [ ] **Step 1: Обновить роадмап**

В строке «База проекта»: статус → `✅ готово`, «Завершено» → дата, «Ветка / PR» → `feat/phase-1-project-base`.

- [ ] **Step 2: Финальная проверка всех команд из CLAUDE.md**

Run: `npm run type-check && npm run lint && npm test && npm run build`
Expected: все четыре проходят без ошибок.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md docs/superpowers/plans/2026-07-02-sudoku-pwa-index.md
git commit -m "docs: Отметить завершение базы проекта в трекинге (Phase 1)"
```

- [ ] **Step 4: Финализация ветки**

Использовать `superpowers:finishing-a-development-branch` для решения о merge/PR.

---

## Self-Review

- **Spec coverage:** §9 этап 1 (Vite+React+TS, ESLint/Prettier, базовый vite-plugin-pwa с плейсхолдер-иконками) — покрыт Tasks 1–5. §4.2 iOS-метатеги — заложены в Task 5 (полный InstallPrompt — Фаза 7). §2 стек — Tasks 1–3.
- **Placeholders:** иконки в Task 5 намеренно плейсхолдерные (так требует §9 этап 1); финал — Фаза 7. Это не plan-placeholder, а зафиксированный объём фазы.
- **Type consistency:** `Difficulty`, `Grid`, `GRID_SIZE`, `BOX_SIZE`, `EMPTY_CELL` определены в Task 4, используются в Фазе 2.
- **Note:** точная форма ESLint-конфига зависит от версии Vite-шаблона — план предписывает коммитить реально созданный файл, не навязывая имя.
