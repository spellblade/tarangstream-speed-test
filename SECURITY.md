# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Prefer one of the following:

1. **GitHub private vulnerability reporting** for this repository (Security → Report a vulnerability), if enabled
2. Email: `sohamray24@outlook.com`

Include as much detail as you can:

- Description of the issue and impact
- Steps to reproduce or a proof of concept
- Affected version / commit if known
- Any suggested fix

We will acknowledge reports as soon as practical and coordinate disclosure after a fix is available.

## Scope notes

TarangStream is a network speed diagnostics app. Reports related to:

- Abuse of `/api/download` or `/api/upload` (resource exhaustion, bypass of size limits)
- XSS or injection via stored history / custom server fields
- Supply-chain issues in published dependencies

…are especially appreciated.

## Non-security issues

Bugs and feature requests should use [GitHub Issues](https://github.com/spellblade/tarangstream-speed-test/issues) with the appropriate template.
