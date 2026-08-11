# Coding standards

Standards for contributing to **this** repository (React + TypeScript + Express), not the vanilla-JS layout from external templates.

## Stack

- **Language:** TypeScript  
- **UI:** React 19, Tailwind CSS 4  
- **Build:** Vite 6 (client), esbuild (server bundle)  
- **Server:** Express in `server.ts`  
- **Formatting:** Prettier via editor (VS Code) — match existing style after format-on-save  

There is no mandatory ESLint config in-repo yet. CI enforces **`npm run lint`** (`tsc --noEmit`) and **`npm run build`**.

## Layout and responsibility

| Area | Keep concerns here |
|------|--------------------|
| `src/App.tsx` | UI state, test lifecycle orchestration |
| `src/components/*` | Presentational / focused widgets |
| `src/utils/speedTest.ts` | Measurement math and real network runners |
| `src/utils/speedTest.local.ts` | **Only** localhost overrides (CDN download, simulated upload) |
| `server.ts` | HTTP API, rate limits, static/Vite hosting |
| `docs/` | Human documentation |

Prefer small, focused diffs. Avoid drive-by refactors unrelated to the task.

## Naming

- React components: **PascalCase** files and exports (`Gauge.tsx`)  
- Utilities / functions: **camelCase** (`runRealDownloadTest`)  
- Types: **PascalCase** interfaces/types in `types.ts`  
- Constants: **UPPER_SNAKE_CASE** for module-level caps  
- Branches: `feature/*`, integrate via `develop`, release from `master`  

## TypeScript

- Prefer explicit types on public exports and shared models  
- Avoid `any` unless interfacing with browser APIs that force it; narrow quickly  
- Do not silence errors with empty catch blocks without a comment  

## React

- Functional components and hooks  
- Clean up timers, intervals, and abort controllers on unmount / cancel  
- Lazy-load heavy tabs (`StabilityChart`, `AboutPage`) when already established  

## Security and secrets

- Never commit `.env`, API keys, or credentials  
- Document new env vars in `.env.example` only  
- Validate user-supplied URLs (custom servers) before fetching  
- Server: keep upload size limits and content-type checks when changing upload paths  

## Measurement code

- Localhost behavior belongs in `speedTest.local.ts`, not scattered through `App.tsx`  
- Prefer reusing `runRealDownloadTest` / helpers over duplicating stream loops  
- If you change metrics, update [measurement-methodology.md](measurement-methodology.md) and `CHANGELOG.md`  

## Before opening a PR

1. Format with Prettier (editor)  
2. `npm run lint`  
3. `npm run build`  
4. Update `[Unreleased]` in [CHANGELOG.md](../CHANGELOG.md) for user-visible changes  
5. Use the PR template checklist  

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch and commit conventions.

## Documentation

- User-facing process docs live under `docs/`  
- Keep claims consistent with actual code (modes, APIs, limits)  
- Prefer short paragraphs and tables over large walls of text  
