# Публикация Sudoku PWA в GitHub Pages через GitHub Actions

**Дата:** 2026-07-19
**Статус:** дизайн утверждён, реализация не начата

## Цель

Автоматически собирать и публиковать статическую сборку Sudoku PWA в GitHub Pages
по адресу `https://kagegrifon.github.io/sudoku/`. Проверки (lint, type-check, тесты)
гоняются на каждый push в `main`; публикация происходит только после **ручного
одобрения** в GitHub UI.

## Ключевые решения

| Вопрос | Решение | Почему |
|---|---|---|
| Адрес сайта | Подпапка `github.io/sudoku/` | Стандартный Pages для repo-сайта; отдельный домен/репо не нужны |
| base в Vite | Условный от `mode`: prod → `/sudoku/`, dev → `/` | dev-сервер остаётся на `localhost:5173/`; preview проверяет прод-пути |
| Триггер | `push` в `main` + `workflow_dispatch` | Проверки на каждый push; ручной запуск при необходимости |
| Публикация | Protected environment `github-pages` с required reviewer | Деплой встаёт на паузу и ждёт approve в UI — контроль без отдельного workflow |
| Проверки | Полный набор: lint + type-check + test | Не публикуем заведомо сломанную игру |
| Видимость падений | Отдельные именованные шаги с `if: always()` | Прогоняются все проверки за один прогон — видно ВСЕ ошибки, а не только первую; один `npm ci` |
| Структура | Один workflow, два job (`build`, `deploy`) | Компактно; деплой отделён и защищён environment'ом |

**Не входит в scope:** SPA 404-fallback (в проекте нет клиентского роутера —
react-router отсутствует в зависимостях). Добавим, если появится роутинг.
E2E (Playwright) — в package.json нет скрипта `test:e2e`, поэтому в CI не включаем.

## Архитектура

Один файл `.github/workflows/deploy.yml`.

```
push в main / workflow_dispatch
        │
        ▼
┌─────────────────────────────────────────┐
│ job: build                              │
│  - checkout                             │
│  - setup-node (npm cache)               │
│  - npm ci                               │
│  - lint         (if: always)            │  ← все три проверки
│  - type-check   (if: always)            │    прогоняются всегда,
│  - test         (if: always)            │    видно все падения
│  - npm run build   (только если всё ✅) │
│  - upload-pages-artifact (dist/)        │
└─────────────────────────────────────────┘
        │ needs: build (успешен)
        ▼
┌─────────────────────────────────────────┐
│ job: deploy                             │
│  environment: github-pages              │  ← пауза: ждёт ручной
│  (required reviewer → approve в UI)     │    approve перед публикацией
│  - deploy-pages@v4                      │
└─────────────────────────────────────────┘
```

### Права и concurrency

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false
```

`cancel-in-progress: false` — не обрывать уже идущую публикацию.

### Job `build` — детали шагов

- `actions/checkout@v4`
- `actions/setup-node@v4` с `node-version` (LTS, напр. 20 или 22) и `cache: npm`
- `npm ci` — `package-lock.json` в репозитории есть (проверено)
- Шаги проверок, каждый со **своим `name`** и `if: always()`:
  - `name: Lint` → `npm run lint`
  - `name: Type check` → `npm run type-check`
  - `name: Test` → `npm test`
- `name: Build` → `npm run build` — **без** `always()`. По умолчанию шаг
  выполняется только если предыдущие шаги успешны (`success()`), поэтому битые
  проверки не дадут собрать и опубликовать. `always()` на проверках лишь
  гарантирует, что они все отработают для отчёта, но статус job остаётся failed
  при любом падении — значит `build` не запустится.
- `actions/upload-pages-artifact@v3` с `path: dist`

### Job `deploy` — детали

```yaml
deploy:
  needs: build
  runs-on: ubuntu-latest
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
  steps:
    - id: deployment
      uses: actions/deploy-pages@v4
```

Пауза на approve обеспечивается **не кодом workflow**, а настройкой
protected environment в UI (см. ниже). Пока reviewer не нажал Approve —
job `deploy` висит в статусе Waiting.

## Изменения в коде проекта

1. **`vite.config.ts`** — сделать `base` **условным от `mode`**, а не жёстким
   `'/sudoku/'`. Иначе dev-сервер тоже уедет на `/sudoku/` и `http://localhost:5173/`
   станет отдавать 404.

   ```ts
   export default defineConfig(({ mode }) => ({
     base: mode === 'production' ? '/sudoku/' : '/',
     plugins: [ /* ... */ ],
     test: { /* ... */ },
   }))
   ```

   Поведение по режимам:
   - `npm run dev` → `mode='development'` → `base='/'` → `http://localhost:5173/` (как сейчас)
   - `npm run build` → `mode='production'` → `base='/sudoku/'` → корректные пути для Pages
   - `npm run preview` → поднимает уже собранный `dist/` с вшитым `/sudoku/` →
     `http://localhost:4173/sudoku/` → **точная проверка прод-путей** без доп. настройки

   `base` на подпапке критичен: без него ассеты и PWA-манифест резолвятся от корня
   домена и ломаются. `vite-plugin-pwa` подхватывает `base` автоматически
   (manifest, service worker, precache). На `vitest` (environment `node`) `base`
   не влияет.

2. **`public/.nojekyll`** — пустой файл. Vite копирует `public/` в `dist/`.
   Отключает обработку Jekyll на стороне Pages (Jekyll игнорирует пути,
   начинающиеся с `_`, которые может создавать Vite).

## Ручная настройка в GitHub UI (вне репозитория)

Выполняется пользователем один раз:

1. **Settings → Pages → Build and deployment → Source: `GitHub Actions`.**
2. **Settings → Environments → `github-pages` → Required reviewers** — добавить
   себя. Именно это включает паузу на ручной approve перед публикацией.

## Тестирование

Workflow целиком проверяется только реальным прогоном в Actions. До push:

1. Локально: `npm run build && npm run preview` — превью поднимает `dist/` на
   `http://localhost:4173/sudoku/`; убедиться, что открывается на пути `/sudoku/`
   и ассеты грузятся без 404. (`npm run dev` при этом остаётся на корне `/`.)
2. Проверить, что `dist/.nojekyll` попал в сборку.

После первого push:

3. Наблюдать прогон в Actions: проверки → сборка → `deploy` встаёт на Waiting.
4. Нажать Approve → дождаться публикации → открыть `https://kagegrifon.github.io/sudoku/`.
5. Проверить, что PWA ставится и работает офлайн на боевом URL.

## Риски

- **Неверный `base`** — самая частая причина белого экрана на Pages. Митигируется
  локальным `preview` перед push.
- **Environment не защищён** — если забыть добавить required reviewer, деплой
  пройдёт автоматически без паузы. Проверяется на первом прогоне.
- **Service worker и кэш** — при обновлении PWA старый SW может отдавать старую
  версию. В проекте уже есть механизм обновления (`registerType: 'prompt'`,
  Phase 7), отдельно в этой задаче не трогаем.
