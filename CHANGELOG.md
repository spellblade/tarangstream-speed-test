# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project documentation under `docs/` (setup, architecture, usage, coding standards, measurement methodology)
- Unit tests with Vitest for measurement helpers, gauge mapping, and localhost overrides; CI runs `npm test`

### Changed

### Fixed

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

[Unreleased]: https://github.com/spellblade/tarangstream-speed-test/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/spellblade/tarangstream-speed-test/releases/tag/v0.1.0
