# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project documentation under `docs/` (setup, architecture, usage, coding standards, measurement methodology)
- Project metadata and contributor scaffolding: `VERSION`, MIT `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`
- GitHub templates: issue templates, pull request template
- Dependabot config (`.github/dependabot.yml`)
- README project structure, badges, branch model, and quick start

### Changed

### Fixed

## [0.1.2] - 2026-08-12

### Added

- Unit-tested helpers: API rate limit / client IP (`rateLimit`), history localStorage sanitize, custom-server URL validation
- CSV export helpers (`escapeCsvValue` / `buildHistoryCsv`) with unit tests
- Custom-server list sanitization on localStorage load
- Express API smoke tests via `createApiApp` + supertest (health, upload, download, rate limit)
- Concurrent download per-IP cap test (429 when streams exceed limit)

### Changed

- Server rate limiting uses shared `createRateLimiter` / `getClientIp` helpers
- History load and custom server URLs go through sanitize / `validatePingHostUrl`
- API routes extracted to `createApiApp` for a testable Express surface

### Fixed

- Revoke blob URL after CSV history export (`URL.revokeObjectURL`)

## [0.1.1] - 2026-08-12

### Added

- Unit tests with Vitest for measurement helpers, gauge mapping, and localhost overrides; CI runs `npm test`
- Optional Semgrep GitHub Actions workflow (skips cleanly when secrets are missing)

### Changed

- CI push triggers limited to `master`, `develop`, and `staging` (no `feature/*`)
- Security contact email set to `sohamray24@outlook.com`

### Fixed

- Transitive dependency security patches via `npm audit fix`: `body-parser` ≥1.20.6, `nanoid` ≥3.3.17, `postcss` ≥8.5.23

## [0.1.0] - 2026-08-11

### Added

- Initial TarangStream application: React 19, TypeScript, Vite, Express, Tailwind CSS
- Real-time download and upload speed gauges with EMA / WMA / Hybrid smoothing
- Latency (ping), jitter, and estimated packet-loss diagnostics
- Multi-stream download/upload pipelines with sliding-window speed sampling
- Local history, CSV/JSON export, and measurement-mode badges
- Localhost overrides (`speedTest.local.ts`) for CDN download and simulated upload
- Express `/api/download` and `/api/upload` endpoints with size and content-type guards
- Dark / light theme with instant theme toggle
- Stability chart and About page (lazy-loaded)

[Unreleased]: https://github.com/spellblade/tarangstream-speed-test/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/spellblade/tarangstream-speed-test/releases/tag/v0.1.2
[0.1.1]: https://github.com/spellblade/tarangstream-speed-test/compare/v0.1.1...v0.1.2
[0.1.0]: https://github.com/spellblade/tarangstream-speed-test/compare/v0.1.0...v0.1.1
