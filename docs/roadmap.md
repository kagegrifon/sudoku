# Роадмап проекта

Трекинг фич: что сделано, что запланировано, связи с документами и решениями.

**Статусы:** 📋 запланировано · 🚧 в работе · ✅ готово · 🧊 отложено
**Приоритет:** `MVP` · `backlog`
**Даты:** ISO `YYYY-MM-DD`
**Заметки:** короткий комментарий; № этапа из спеки (только для MVP); ссылка на ADR, напр. `[ADR-0001](adr/0001-css-approach.md)`

Правила ведения — см. [CLAUDE.md](../CLAUDE.md), секция «Ведение проекта / трекинг».

| Фича | Статус | Приоритет | Зависимости | Ветка / PR | Спека / доки | План создан | Завершено | Заметки |
|---|---|---|---|---|---|---|---|---|
| База проекта (Vite + React + TS, ESLint/Prettier, базовый PWA-конфиг) | ✅ готово | MVP | — | feat/phase-1-project-base | [spec §9](../sudoku-pwa-spec.md), [design](superpowers/specs/2026-07-02-sudoku-pwa-design.md) | 2026-07-02 | 2026-07-02 | Этап 1. [ADR-0001](adr/0001-css-approach.md), [ADR-0003](adr/0003-state-architecture.md) |
| Core-логика (generator / solver / validator) + Vitest-тесты | ✅ готово | MVP | База проекта | feat/phase-2-core-logic | [spec §5](../sudoku-pwa-spec.md#5-алгоритм-судоку) | 2026-07-02 | 2026-07-02 | Этап 2. Критичная логика — пороги сложности откалибровать тестами. Guard `isGridConsistent` в solver (баг эталона плана, задокументирован) |
| Игровое поле (рендер сетки, ввод цифр, подсветка, детект победы) | ✅ готово | MVP | Core-логика | feat/phase-3-board | [spec §3.1](../sudoku-pwa-spec.md), [spec §8](../sudoku-pwa-spec.md), [план](superpowers/plans/2026-07-02-phase-3-board.md) | 2026-07-02 | 2026-07-03 | Этап 3. Без сохранения и таймера. Локальный useReducer (GameContext — фаза 4) |
| Состояние и сохранение (GameContext, reducer, localStorage-персистентность, восстановление) | ✅ готово | MVP | Игровое поле | feat/phase-4-5-game-engine | [spec §6](../sudoku-pwa-spec.md), [design §2–3](superpowers/specs/2026-07-02-sudoku-pwa-design.md) | 2026-07-02 | 2026-07-03 | Этап 4. [ADR-0002](adr/0002-storage-strategy.md), [ADR-0003](adr/0003-state-architecture.md) |
| Доп. механики (заметки с автоочисткой, полный undo, таймер с паузой, выбор сложности, новая игра) | ✅ готово | MVP | Состояние и сохранение | feat/phase-4-5-game-engine | [spec §3.1](../sudoku-pwa-spec.md), [design §3](superpowers/specs/2026-07-02-sudoku-pwa-design.md) | 2026-07-02 | 2026-07-03 | Этап 5 |
| Механика жизней (3 жизни, ошибка = цифра ≠ решению, проигрыш при 0) | ✅ готово | MVP | Состояние и сохранение | feat/phase-4-5-game-engine | [design §2–3](superpowers/specs/2026-07-02-sudoku-pwa-design.md) | 2026-07-02 | 2026-07-03 | Этап 5. Расширение поверх спеки; undo не возвращает жизнь |
| Статистика по периодам (день/неделя/месяц/всё; кол-во, время, %, любимая сложность) | ✅ готово | MVP | Состояние и сохранение | feat/phase-6-stats | [spec §3.2](../sudoku-pwa-spec.md), [design §2,§4](superpowers/specs/2026-07-02-sudoku-pwa-design.md) | 2026-07-02 | 2026-07-03 | Этап 6. Streak заменён агрегацией по периодам. [ADR-0002](adr/0002-storage-strategy.md) |
| PWA-полировка (иконки, manifest, InstallPrompt iOS/Android, precache, офлайн) + механизм обновления | 📋 запланировано | MVP | База проекта | — | [spec §4](../sudoku-pwa-spec.md), [design §5](superpowers/specs/2026-07-02-sudoku-pwa-design.md) | 2026-07-02 | — | Этап 7. [ADR-0004](adr/0004-pwa-update-strategy.md) |
| Ручное тестирование на устройствах (Android/iOS, portrait/landscape, офлайн) | 📋 запланировано | MVP | Доп. механики, Механика жизней, Статистика, PWA-полировка | — | [spec §8](../sudoku-pwa-spec.md), [spec §10](../sudoku-pwa-spec.md) | 2026-07-02 | — | Этап 8 |
| Темы оформления (светлая/тёмная/кастомные) | 📋 запланировано | backlog | — | — | [spec §11](../sudoku-pwa-spec.md) | 2026-07-02 | — | Backlog. CSS-переменные из [ADR-0001](adr/0001-css-approach.md) — точка расширения |
| Подсказки (hints) с лимитом за партию | 📋 запланировано | backlog | — | — | [spec §11](../sudoku-pwa-spec.md) | 2026-07-02 | — | Backlog |
| Несколько сохранённых партий одновременно | 📋 запланировано | backlog | — | — | [spec §11](../sudoku-pwa-spec.md) | 2026-07-02 | — | Backlog |
| Push-уведомления («продолжите незаконченную партию») | 📋 запланировано | backlog | — | — | [spec §11](../sudoku-pwa-spec.md) | 2026-07-02 | — | Backlog. iOS требует 16.4+ и установку на экран |
| Обёртка в Capacitor (публикация в App Store / Google Play) | 📋 запланировано | backlog | — | — | [spec §11](../sudoku-pwa-spec.md) | 2026-07-02 | — | Backlog |
