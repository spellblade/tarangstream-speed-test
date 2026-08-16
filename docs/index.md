# TarangStream documentation

**Version:** see [VERSION](../VERSION) (currently **1.0.1**).

TarangStream is a full-stack browser network diagnostics app: download and upload speed, latency, jitter, and related telemetry, built with **React**, **TypeScript**, **Vite**, and **Express**.

## Who this is for

| Audience | Start here |
|----------|------------|
| End users / operators | [Usage](usage.md), [Setup](setup.md) |
| Contributors | [Setup](setup.md), [Architecture](architecture.md), [Coding standards](coding-standards.md) |
| Security / hardening checks | [Security hardening](security-hardening.md) |
| Anyone interpreting results | [Measurement methodology](measurement-methodology.md) |

## Contents

| Document | Description |
|----------|-------------|
| [Setup](setup.md) | Install, run, environment variables, troubleshooting |
| [Architecture](architecture.md) | System layout, layers, APIs, measurement modes |
| [Usage](usage.md) | Running tests, UI controls, history and export |
| [Coding standards](coding-standards.md) | Conventions for this repository |
| [Measurement methodology](measurement-methodology.md) | How metrics are computed and their limits |
| [Security hardening](security-hardening.md) | Controls and step-by-step verification (TRUST_PROXY, later items) |

## Project metadata (repository root)

- [README](../README.md) — overview and quick start
- [CHANGELOG](../CHANGELOG.md) — release history
- [CONTRIBUTING](../CONTRIBUTING.md) — branches, PRs, commits
- [SECURITY](../SECURITY.md) — vulnerability reporting
- [LICENSE](../LICENSE) — MIT

## Branches

| Branch | Role |
|--------|------|
| `master` | Stable / releases (not `main`) |
| `develop` | Integration |
| `staging` | Optional pre-release |
| `feature/*` | Feature work |

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full workflow.
