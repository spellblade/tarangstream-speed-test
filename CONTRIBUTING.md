# Contributing to TarangStream

Thank you for helping improve TarangStream. This document describes how we work on the repository.

## Branch model

| Branch | Purpose |
|--------|---------|
| `master` | Production / stable releases (not `main`) |
| `develop` | Integration branch for ongoing work |
| `staging` | Optional pre-release / validation |
| `feature/*` | Short-lived feature or fix branches |

Typical flow:

1. Branch from `develop`: `feature/your-change`
2. Open a pull request into `develop`
3. After validation, promote `develop` → `staging` (optional) → `master`
4. Tag releases on `master` as `vMAJOR.MINOR.PATCH` (see `VERSION`)

## Commit style

Prefer [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new user-facing capability
- `fix:` — bug fix
- `docs:` — documentation only
- `chore:` — tooling, metadata, dependencies
- `ci:` — CI / GitHub Actions
- `refactor:` — code change with no intended behavior change

Keep commits focused and message subjects under ~72 characters.

## Local development

```bash
npm install
npm run dev      # development server (default port 3000)
npm run lint     # TypeScript check (tsc --noEmit)
npm run build    # production client + server bundle
npm start        # serve production build
```

Before opening a PR:

1. Run `npm run lint` and `npm run build` successfully
2. Summarize what changed and why in the PR description
3. Link related issues when applicable

## Pull requests

- Use the repository PR template
- Target `develop` unless the change is a hot-fix for `master`
- Keep PRs reasonably small when possible
- Do not commit secrets, `.env` files, or personal machine paths

## Versioning and changelog

- Semantic Versioning: `MAJOR.MINOR.PATCH`
- `VERSION` is the single source of truth for the project version
- Record user-visible changes under `[Unreleased]` in `CHANGELOG.md`
- On release: move Unreleased items into a dated section, bump `VERSION` and `package.json`, tag `vX.Y.Z`

## Security

Do not report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md).
