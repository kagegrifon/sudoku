# Sudoku PWA — Индекс планов реализации

Реализация разбита по фазам (этапы §9 спеки). **Каждая фаза детализируется в отдельном файле-плане перед исполнением**, чтобы не переполнять контекст (лимит 150k токенов). Причина по-фазной детализации: полные сигнатуры поздних фаз зависят от кода ранних — детализируя фазу непосредственно перед работой над ней, мы опираемся на уже написанные интерфейсы, а не на догадки.

**Источники истины:**
- Дизайн-документ: [2026-07-02-sudoku-pwa-design.md](../specs/2026-07-02-sudoku-pwa-design.md)
- Исходная спека: [sudoku-pwa-spec.md](../../../sudoku-pwa-spec.md)
- Роадмап: [docs/roadmap.md](../../roadmap.md)
- ADR: [docs/adr/](../../adr/)

## Глобальные ограничения (для всех фаз)

- **Стек:** TypeScript + Vite, React 18, CSS Modules ([ADR-0001](../../adr/0001-css-approach.md)), Vitest, Playwright, ESLint + Prettier.
- **Состояние:** React Context + useReducer; слои `components → state → core`, `core/` без React/DOM ([ADR-0003](../../adr/0003-state-architecture.md)).
- **Хранение:** localStorage (партия `sudoku:game`, настройки `sudoku:settings`), IndexedDB через `idb` (журнал `games`) ([ADR-0002](../../adr/0002-storage-strategy.md)).
- **Диспетчеризация reducer** — через `Record<ActionType, handler>`, не `switch` (CLAUDE.md).
- **Читаемость** — приоритет по CLAUDE.md: без вложенных тернарников, описательные имена, options-объект при 3+ параметрах, flat JSX.
- **E2E** — селекторы только по `data-testid`.
- **Git** — работа в ветке (не в `main`); коммит на фазу; сообщения в формате `<type>: <описание> (Phase N)`.
- **Grid:** 9×9, `0` = пустая клетка. Типы — в `src/core/types.ts`.

## Фазы

| Фаза | Название | План | Статус детализации | Зависит от |
|---|---|---|---|---|
| 1 | База проекта (Vite + React + TS, ESLint/Prettier, базовый PWA) | [phase-1-project-base.md](2026-07-02-phase-1-project-base.md) | ✅ реализован (2026-07-02, feat/phase-1-project-base) | — |
| 2 | Core-логика (generator / solver / validator) + тесты | [phase-2-core-logic.md](2026-07-02-phase-2-core-logic.md) | ✅ реализован (2026-07-02, feat/phase-2-core-logic) | 1 |
| 3 | Игровое поле (рендер, ввод, подсветка, детект победы) | [phase-3-board.md](2026-07-02-phase-3-board.md) | ✅ реализован (2026-07-03, feat/phase-3-board) | 2 |
| 4 | Состояние и сохранение (Context, reducer, localStorage, restore) | [phase-4-5-game-engine.md](2026-07-03-phase-4-5-game-engine.md) | ✅ реализован (2026-07-03, feat/phase-4-5-game-engine) | 3 |
| 5 | Доп. механики (заметки, undo, таймер, сложность, жизни) | [phase-4-5-game-engine.md](2026-07-03-phase-4-5-game-engine.md) | ✅ реализован (2026-07-03, feat/phase-4-5-game-engine) | 4 |
| 6 | Статистика по периодам (IndexedDB, агрегация, экран) | [phase-6-stats.md](2026-07-03-phase-6-stats.md) | ✅ реализован (2026-07-03, feat/phase-6-stats) | 4 |
| 7 | PWA-полировка + механизм обновления | [phase-7-pwa-polish.md](2026-07-14-phase-7-pwa-polish.md) | 📝 детализирован (2026-07-14), реализация не начата | 1 |
| 8 | Ручное тестирование на устройствах | — | 📋 детализировать перед стартом | 5, 6, 7 |

> Фазы 4 и 5 детализированы и реализованы единым планом [phase-4-5-game-engine.md](2026-07-03-phase-4-5-game-engine.md) (игровой движок целиком).

## Порядок работы

1. Взять фазу с готовым планом.
2. Если план фазы ещё не детализирован — сначала детализировать его в отдельной сессии (вызвать `writing-plans`, опираясь на реальные сигнатуры уже завершённых фаз), затем исполнять.
3. Исполнять через `superpowers:subagent-driven-development` или `superpowers:executing-plans`.
4. По завершении фазы — обновить роадмап (статус `✅ готово`, дата, ветка/PR) и отметить фазу в этом индексе.
