# Security

> Last reviewed: **2026-11-13** — dependency pins and audit counts below reflect
> the state of the `package-lock.json` as of that date. Re-verify with
> `npm audit` before relying on them.

## Threat Model Overview

`claspenv` is a small command-line utility. Its **runtime** dependencies are only
`arg` and `fs-extra` (both currently free of known advisories). Everything else
listed in `package.json` (jest, ts-jest, typescript-eslint, eslint, prettier)
are **devDependencies** that run only on a developer's machine during `npm test`
and linting — they are not shipped with the CLI (only `dist/**` is packaged).

Dev-only tooling vulnerabilities are low-severity by nature: an attacker would
first need to execute code on a developer's machine or plant a malicious
tooling configuration in the repository.

## Pinned Versions (`overrides` in package.json)

The `overrides` block exists because several transitive dependencies of our
dev tooling had vulnerabilities for which the *parent* packages (jest,
typescript-eslint) had not yet published patched releases. We pin the patched
leaf versions directly instead of waiting or downgrading parents.

| Override | Version | Advisory | Why an override (not a normal upgrade) |
| --- | --- | --- | --- |
| `glob` (under `@jest/reporters`, `jest-config`, `jest-runtime`) | 14.0.6 | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) / CVE-2026-118773 — AbortSignal cancellation bypass (fixed in 14.0.2) | jest's `@jest/*` packages declare `glob@^13`, which is still vulnerable; glob 14 is the first patched line. jest only calls `glob.sync(pattern, { windowsPathsNoEscape })`, a stable API across v10–v14, and glob 14 still ships a CJS build. |
| `minimatch` (under `@typescript-eslint/typescript-estree`) | 11.0.8 | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) / CVE-2026-118764 — glob-parts amplification DoS (fixed in 11.0.1) | typescript-estree declares `minimatch@^10`, still vulnerable. minimatch 11 remains CJS-compatible and typescript-estree only calls `minimatch(path, pattern, { dot: true })`. |
| `minimatch` (under `test-exclude`) | 11.0.8 | same as above | jest 30.5's coverage chain (babel-plugin-istanbul → test-exclude) declares `minimatch@^10`, still vulnerable. test-exclude only calls `minimatch(path, pattern, opts)`. |

Other relevant bumps handled by normal dependency ranges (no override needed):

- `ts-jest` 29.4.15 depends on `handlebars@^4.7.10`, which contains the fix
  for the three handlebars JavaScript-injection advisories
  ([GHSA-xw65-4hp5-5hc7](https://github.com/advisories/GHSA-xw65-4hp5-5hc7),
  [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj),
  [GHSA-p8wg-vrv2-v86f](https://github.com/advisories/GHSA-p8wg-vrv2-v86f)).
  ts-jest only ever compiles trusted local template strings, so the exposure
  was theoretical; the upgrade was still the correct fix.
- The eslint tree's nested `minimatch@3.1.5` instances are **outside** the
  vulnerable range (>= 7.0.0) and are intentionally left untouched.

**Do not remove these overrides** until the parent packages (jest,
typescript-eslint, babel-plugin-istanbul) release versions that depend on the
patched lines themselves. Re-check with `npm ls glob minimatch` and
`npm audit` before removing any pin.

### Why not `npm audit fix --force`?

`npm audit fix --force` is known to *increase* the vulnerability count in this
project. The npm advisory database records the "fix" for several jest and
typescript-eslint advisories as **downgrades** (e.g. `jest@25.1.0`,
`ts-jest@25.5.1`, `@typescript-eslint/*@6.15.0`) — versions from before the
vulnerable transitive dependencies were added. Forcing those swaps in an older
dependency tree with more CVEs. Never run `npm audit fix --force` in this
repository.

## Accepted Residual Risk

### deepmerge (CVE-2026-93753, LOW)

`npm audit` currently reports **6 low-severity findings**, all stemming from
one advisory:

- [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) —
  prototype pollution via `mergeObject()` when merging untrusted objects
  (CVSS 2.7).
- Affected: `deepmerge@4.3.1`, pulled in by `jest-config`. The remaining 5
  flagged packages (`jest-config`, `@jest/core`, `jest-cli`, `jest`, `ts-jest`)
  are cascade entries flagged only because they depend on it.
- **No patched release exists**: 4.3.1 is the latest version in the npm
  registry as of the time of writing, so there is nothing to upgrade to.

Risk assessment: the vulnerable code path merges the jest configuration
object. Exploitation would require a malicious `jest.config` (or config file
discovered via `projects` globs) on a developer's machine — an attacker with
that level of access already has arbitrary code execution, so the practical
impact is negligible. The package is dev-only and never shipped.

**Revisit condition:** when deepmerge publishes a patched release (or jest
pins one), run `npm update deepmerge` and re-run `npm audit`; the 6 findings
should drop to zero. No override for deepmerge is in place because
substituting a fork or git build of a security-sensitive utility is riskier
than accepting this LOW, dev-only, theoretical exposure.

## Verifying the Posture

```bash
npm audit          # expected: 6 low (deepmerge chain), 0 moderate/high/critical
npm test           # expected: full suite green (validates the glob/minimatch pins)
npx eslint 'src/**/*.ts' 'tests/**/*.ts'   # expected: exit 0
```

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities. Report them by
email to <anthony.peluso@gsa.gov> and allow time for a fix to be prepared
before public disclosure.
