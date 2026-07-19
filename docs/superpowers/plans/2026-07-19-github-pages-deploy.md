# GitHub Pages Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автоматически собирать и публиковать Sudoku PWA в GitHub Pages по адресу `https://kagegrifon.github.io/sudoku/` через GitHub Actions с ручным approve перед публикацией.

**Architecture:** Один workflow `.github/workflows/deploy.yml` с двумя job'ами: `build` (проверки + сборка + артефакт) и `deploy` (публикация через protected environment `github-pages` с паузой на ручной approve). В коде: условный `base` от `mode` в Vite и `.nojekyll`.

**Tech Stack:** GitHub Actions, Vite 8, actions/upload-pages-artifact@v3, actions/deploy-pages@v4.

## Global Constraints

- Адрес продакшена: `https://kagegrifon.github.io/sudoku/` — `base` в проде строго `'/sudoku/'`.
- Вся работа в ветке `feat/github-pages-deploy`, НЕ в `main` (git-правила проекта).
- Коммиты: `<type>: <описание>` в императиве. Каждый — законченная единица.
- `npm ci` требует `package-lock.json` (в репозитории есть).
- E2E (Playwright) в CI НЕ включаем — в package.json нет скрипта `test:e2e`.
- Читаемость — приоритет (CLAUDE.md). Именованные шаги в workflow.

---

### Task 1: Ветка + условный base в Vite

**Files:**
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: прод-сборка кладёт ассеты с префиксом `/sudoku/`; dev остаётся на `/`.

- [ ] **Step 1: Создать ветку**

```bash
git checkout -b feat/github-pages-deploy
```

- [ ] **Step 2: Сделать base условным от mode**

В `vite.config.ts` заменить сигнатуру `defineConfig({...})` на функциональную форму и добавить `base`. Было:

```ts
export default defineConfig({
  plugins: [
```

Стало:

```ts
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/sudoku/' : '/',
  plugins: [
```

И закрыть в конце файла: последняя строка `})` меняется на `}))` (функция возвращает объект).

- [ ] **Step 3: Проверить dev — корень**

Run: `npm run dev`
Expected: в консоли Vite строка `Local: http://localhost:5173/` (БЕЗ `/sudoku/`). Остановить сервер (Ctrl+C).

- [ ] **Step 4: Проверить прод-пути через preview**

Run: `npm run build && npm run preview`
Expected: в консоли `Local: http://localhost:4173/sudoku/`. Открыть этот URL — страница грузится, в DevTools Network ассеты идут с префиксом `/sudoku/assets/...` без 404. Остановить (Ctrl+C).

- [ ] **Step 5: Коммит**

```bash
git add vite.config.ts
git commit -m "feat: условный base от mode для GitHub Pages"
```

---

### Task 2: Отключить Jekyll (.nojekyll)

**Files:**
- Create: `public/.nojekyll`

**Interfaces:**
- Consumes: Vite копирует `public/` в `dist/` при сборке.
- Produces: `dist/.nojekyll` — сигнал Pages не прогонять вывод через Jekyll.

- [ ] **Step 1: Создать пустой файл**

Создать `public/.nojekyll` с пустым содержимым (0 байт).

- [ ] **Step 2: Проверить, что файл попадает в сборку**

Run: `npm run build`
Expected: сборка успешна. Проверить наличие `dist/.nojekyll`:

Run: `ls dist/.nojekyll`
Expected: путь выводится без ошибки.

- [ ] **Step 3: Коммит**

```bash
git add public/.nojekyll
git commit -m "chore: .nojekyll для GitHub Pages"
```

---

### Task 3: Workflow деплоя

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: скрипты `lint`, `type-check`, `test`, `build` из package.json; `dist/` как результат сборки.
- Produces: workflow, публикующий `dist/` в Pages после ручного approve.

- [ ] **Step 1: Создать workflow**

Создать `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        if: always()
        run: npm run lint

      - name: Type check
        if: always()
        run: npm run type-check

      - name: Test
        if: always()
        run: npm test

      - name: Build
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Примечание по `if: always()`: шаги проверок прогоняются все, даже если предыдущий упал (видно все ошибки). Шаг `Build` — БЕЗ `always()`: при падении любой проверки статус предыдущих шагов = failed, шаг `Build` пропускается (поведение `success()` по умолчанию), артефакт не грузится, `deploy` не стартует.

- [ ] **Step 2: Провалидировать YAML локально**

Run: `npx --yes js-yaml .github/workflows/deploy.yml > /dev/null && echo "YAML OK"`
Expected: `YAML OK` без ошибок парсинга.

- [ ] **Step 3: Коммит**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: workflow публикации в GitHub Pages"
```

---

### Task 4: Запись в roadmap

**Files:**
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: формат таблицы roadmap (колонки Фича | Статус | Приоритет | Зависимости | Ветка/PR | Спека/доки | План создан | Завершено | Заметки).

- [ ] **Step 1: Добавить строку в таблицу**

В `docs/roadmap.md` после строки про «Обёртка в Capacitor» (последняя строка таблицы) добавить новую строку:

```markdown
| Публикация в GitHub Pages (CI + деплой через Actions) | 🚧 в работе | backlog | PWA-полировка | feat/github-pages-deploy | [design](superpowers/specs/2026-07-19-github-pages-deploy-design.md), [план](superpowers/plans/2026-07-19-github-pages-deploy.md) | 2026-07-19 | — | CI на push в main (lint+type-check+test+build), деплой с ручным approve через environment github-pages. base=/sudoku/ |
```

- [ ] **Step 2: Коммит**

```bash
git add docs/roadmap.md
git commit -m "docs: завести фичу публикации в GitHub Pages в roadmap"
```

---

## Ручная настройка в GitHub UI (вне плана — делает пользователь)

После merge в `main` пользователь один раз выполняет:

1. **Settings → Pages → Build and deployment → Source: `GitHub Actions`.**
2. **Settings → Environments → `github-pages` → Required reviewers** — добавить себя (включает паузу на approve).

Без п.2 деплой пройдёт автоматически без паузы; без п.1 публикация не состоится.

## Финальная проверка (после первого прогона в Actions)

1. Push ветки / merge в main → наблюдать прогон: проверки → сборка → `deploy` в статусе Waiting.
2. Approve → дождаться публикации → открыть `https://kagegrifon.github.io/sudoku/`.
3. Проверить установку PWA и офлайн-работу на боевом URL.
