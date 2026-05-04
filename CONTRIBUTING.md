# Contributing to ModScan Pro Community

Thank you for considering a contribution. This document covers everything you need to get started, what we expect from PRs, and how to keep the codebase healthy.

---

## Table of Contents

- [License & IP notice](#license--ip-notice)
- [Getting started](#getting-started)
- [Contribution flow](#contribution-flow)
- [Branch naming](#branch-naming)
- [Commit messages](#commit-messages)
- [Before opening a PR — checklist](#before-opening-a-pr--checklist)
- [Project structure](#project-structure)
- [Architecture notes](#architecture-notes)
- [Running tests](#running-tests)
- [Code style](#code-style)
- [What we welcome](#what-we-welcome)
- [What we do not accept](#what-we-do-not-accept)

---

## License & IP notice

By submitting a pull request you agree that your contribution is licensed under **AGPLv3**, the same license as this project.

The **ModScan Pro** name, logo, and 2edge branding are trademarks of 2edge and are **not** covered by AGPLv3. Forks and redistributed versions must use a distinct name and must not imply endorsement by 2edge. See [TRADEMARK.md](TRADEMARK.md) for details.

---

## Getting started

**Prerequisites:** Node.js ≥ 18, npm ≥ 9, git.

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/modbus-scanner.git
cd modbus-scanner

# 2. Install dependencies
npm install

# 3. Start the dev server (web UI only — no Electron)
npm run dev

# 4. Start the full Electron app
npm run electron:dev
```

---

## Contribution flow

This project follows **GitHub Flow** — one branch per change, merged into `main` via pull request.

```
upstream/main  ←── reviewed PR ←── your-fork/feat/your-thing
```

```bash
# Always branch from the latest main
git checkout main && git pull upstream main
git checkout -b feat/your-thing

# Make your changes, then push
git push origin feat/your-thing

# Open a PR targeting upstream/main
```

- `main` is always stable — never push directly to it.
- Keep PRs small and focused. One PR = one logical change.
- If you are fixing a bug reported in an issue, reference it: `Fixes #123`.

---

## Branch naming

| Prefix | When to use |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code restructure with no behaviour change |
| `test/` | Adding or improving tests |
| `docs/` | Documentation only |
| `chore/` | Tooling, deps, config |

Examples: `fix/register-alias-load`, `feat/export-excel`, `test/window-storage`

---

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
```

| Type | Meaning |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code change with no behaviour change |
| `test` | Test additions or fixes |
| `docs` | Documentation only |
| `chore` | Tooling, CI, deps |

Examples:

```
fix(dashboard): restore register aliases on project load
feat(scan): add CSV export for scan history
test(window-storage): add multi-window isolation tests
```

---

## Before opening a PR — checklist

All three of these **must pass** locally before you open a PR. CI will also run them.

```bash
# 1. TypeScript — zero errors
npx tsc --noEmit

# 2. Lint — zero errors (warnings are acceptable)
npm run lint

# 3. Tests — all must pass, none may be skipped
npm test
```

**Additional expectations:**

- If you change anything in `electron/ipc/` or `src/lib/`, add or update tests in the corresponding `*.test.ts` file.
- If you change React hook logic in `src/context/`, add or update tests that use `renderHook` against the real hook — do not re-implement the logic in the test itself.
- If your change affects the UI, describe what you tested manually in the PR description.
- Do not use `test.skip`, `it.skip`, or `xit` to make the suite pass.

---

## Project structure

```
modbus-scanner/
├── electron/               # Electron main process
│   ├── main.js             # App entry, window management
│   ├── preload.js          # IPC bridge exposed to renderer
│   └── ipc/
│       ├── modbus.js       # Scan / read / write IPC handlers
│       ├── modbus-helpers.js  # Shared connectClient / getErrorMessage
│       ├── dashboard-poller.js  # ModbusQueue — sequential polling
│       ├── project.js      # Project save / load
│       └── logger.js       # CSV data logger
│
├── src/
│   ├── app/                # Next.js pages (App Router)
│   │   ├── page.tsx        # Dashboard (polling cards)
│   │   ├── scan/           # Device scanner
│   │   ├── read/           # Batch read / analyzer
│   │   ├── write/          # Write registers
│   │   ├── topology/       # Network topology map
│   │   ├── projects/       # Project management
│   │   └── ...
│   ├── components/         # Shared React components
│   ├── context/            # React Contexts (global state)
│   │   ├── ModbusContext.tsx   # Connection, scan, read, process manager
│   │   ├── ProjectContext.tsx  # Project save/load, device aliases
│   │   ├── ThemeContext.tsx
│   │   └── hooks/
│   │       └── useAnalyzerState.ts  # Logs, graph, buffer state
│   ├── lib/                # Pure utility functions (all testable)
│   │   ├── electron-api.ts # IPC API wrapper + re-exports types
│   │   ├── window-storage.ts  # Per-window localStorage isolation
│   │   ├── data-buffer.ts  # CSV buffer
│   │   ├── demo-data.ts    # Demo mode fixtures
│   │   └── modbus-utils.ts # Data type conversion
│   └── types/              # TypeScript type definitions
│       ├── electron-api.ts # All IPC interface types
│       ├── dashboard.ts    # Dashboard card types + getRegKey
│       ├── modbus.ts       # Modbus protocol types
│       └── project.ts      # Project file schema
│
└── *.test.ts               # Tests live next to the file they test
```

---

## Architecture notes

These are non-obvious constraints that affect how you should make changes.

**Per-window localStorage isolation (`src/lib/window-storage.ts`)**
Electron windows share the same origin and therefore the same `localStorage`. `getWindowItem` / `setWindowItem` prefix keys with `win_{windowId}_` for child windows. Never call `localStorage` directly — always go through these helpers.

**Register alias key contract (`src/types/dashboard.ts` → `getRegKey`)**
Aliases are stored in `ProjectContext.registerAliases` as a plain object keyed by `getRegKey(slaveId, functionCode, startAddr, regIndex)`. The format is `"{slaveId}-{fc}-{startAddr}-{regIndex}"`. If you change this format, existing saved project files will silently lose all aliases.

**Process conflict manager (`ModbusContext.tsx`)**
Only one of scan / read (polling) / topology can run at a time. Use `requestStartProcess(name, callback)` before starting any long-running operation. Do not call dashboard or scan APIs directly from pages — always go through this gate.

**ModbusQueue sequential polling (`electron/ipc/dashboard-poller.js`)**
The polling queue reads all cards over a single RS-485 connection, one device at a time. Never add parallel reads — it will cause data collisions on RS-485 bus.

**Context vs. local state**
State that must survive page navigation or needs to be shared between pages belongs in a Context. State that is purely local to a component stays in `useState`. Do not add new fields to `ModbusContext` for things that only one page needs.

---

## Running tests

```bash
# Run all tests
npm test

# Run a specific file
npx jest src/lib/window-storage.test.ts

# Run in watch mode during development
npx jest --watch
```

Test files live next to the source file they test (e.g., `window-storage.ts` → `window-storage.test.ts`).

**Test environment notes:**
- Default: `node` (Jest config)
- Files that test browser APIs (localStorage, React hooks) use `/** @jest-environment jsdom */` at the top of the file
- Hook tests use `renderHook` from `@testing-library/react` — never re-implement hook logic inside a test

---

## Code style

- **TypeScript** — no `any` unless unavoidable (will produce a lint warning)
- **No comments** unless the *why* is non-obvious (a hidden constraint, a known bug workaround, a protocol quirk). Do not describe *what* the code does.
- **No unused exports** — if you add a helper, it must be used somewhere or tested directly.
- **Tailwind CSS** — dark mode uses `dark:` prefix. Do not use `dark:instrument-accent/20` — it is not a valid Tailwind utility; use `dark:bg-emerald-900/20` or a concrete opacity class instead.
- Electron-side code (under `electron/`) is CommonJS (`require`/`module.exports`). Frontend code (under `src/`) is ESM.

---

## What we welcome

- Bug fixes with a failing test that proves the bug
- Performance improvements to the polling loop or scan logic
- Modbus protocol coverage (new function codes, data type conversions)
- UI improvements to existing pages (with a screenshot in the PR)
- New tests for currently untested code paths
- Documentation improvements
- Translations (new language files under `src/i18n/`)

---

## What we do not accept

- Changes that rename or remove existing `getRegKey` output format without a migration path (breaks saved project files)
- Parallel reads inside `ModbusQueue._pollAll` (RS-485 bus collision risk)
- Direct `localStorage` access outside `window-storage.ts` (breaks multi-window isolation)
- PRs that disable or skip existing tests to make CI pass
- Adding JSX or React components inside Context providers — UI belongs in `src/components/`
- Rebranding forks as "ModScan Pro" or using 2edge branding (see [TRADEMARK.md](TRADEMARK.md))
