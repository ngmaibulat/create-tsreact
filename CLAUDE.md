# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run build         # esbuild src/index.ts -> bin/index.js (single bundled ESM file)
npm run build-watch   # same, with --watch
npm test              # build, then node smoke.mjs (scaffolds every template for real)
npm run lint          # npx eslint src
npm run format:check  # npx prettier src --check
npm run format:fix    # npx prettier src --write
```

`npm test` runs `smoke.mjs`: it scaffolds every template (plus one `--tailwind --daisyui` combination) into a temp dir, runs a real `npm install`, `npm run typecheck` and `npm run build` in each, and asserts on what lands on disk (files emitted, JSON validity, production React, classic-script output for the extension and the PWA's `sw.js`, DaisyUI classes reaching the compiled CSS, build output gitignored). It needs network access for the installs and takes ~2min. There is no other test runner and no CI (`.github/` does not exist).

The `# api` section at the end is **hermetic** — it spawns its own fixture API and needs no external service. That matters more than usual, because the feature is _about_ executing real requests and a test reaching the internet would fail for reasons unrelated to the code. It covers the inference cases a declared-types approach could not know (an optional key, a `| null` union, an empty array merging with a populated one), that mutations are not sampled by default, that a `~disabled` header and `Authorization` never reach the emitted client, and — with the fixture killed — that `create-tsreact api` regenerates byte-identically offline while leaving a hand-edited `config.ts` alone.

The `expo` row is the exception: it sets `resolveOnly`, because Expo has no `build` or `typecheck` script and a real install is enormous. It runs `npm install --package-lock-only` instead — that still does full registry and peer resolution, which is the failure mode a handwritten pin table actually has — and then asserts on file and JSON shape only. **A broken Expo template is otherwise only discoverable by a human running `npx expo start`.**

`tsc` is never run by any script. esbuild transpiles without type-checking, so `tsconfig.json` only serves the editor. To actually type-check, run `npx tsc --noEmit` (do not run plain `tsc` — `outDir` is `./bin` and it would collide with the esbuild bundle).

## Architecture

`src/index.ts` is the entry point, run via the `#!/usr/bin/env node` shebang that esbuild preserves into the bundle. Flow:

1. `parseArgs` (`src/cli.ts`) turns `process.argv` into a `Parsed` union: `usage`, `help`, `version`, `create`, or `api`.
2. For `create`, it resolves the target directory, derives the app name from its basename, validates that name, and checks the directory is missing or empty. It returns an `Opts` object (`name`, `template`, `tailwind`, `daisyui`) plus an optional `ApiArgs`.
3. With `--api`, `index.ts` reads the Bruno collection and samples it, then hangs the resulting `ApiSpec` on `opts.api`. This is the only async step, and it happens _before_ `mkdir`, so a collection that cannot be reached leaves nothing behind.
4. `index.ts` picks a preset from `PRESETS`, calls it with the `Opts`, and gets back a `Record<relativePath, contents>`.
5. `writeTree` creates each file's parent directory and writes it.
6. `steps()` (`src/help.ts`) prints template-specific next steps.

`main()` is async and the top-level handler is `main().catch(...)` — only because of the sampling in step 3. Everything else is still synchronous.

Arg parsing is manual — no commander/yargs, no prompts. `chalk` is the only runtime dependency; everything else is `node:fs` / `node:path`. The `.bru` parser, the type inferrer and the emitters are all hand-written, so `--api` added no dependency; `@tanstack/react-query` is a dependency of _generated apps_ only.

### Templates are code, not files

There is no `templates/` directory and **no template file is ever read from disk**. That is the actual rule — it sidesteps two npm packaging problems: npm renames a packed `.gitignore` to `.npmignore`, and a nested `templates/package.json` confuses tooling. `src/presets/` is TypeScript that gets bundled, so it does not violate this; don't rename it to `templates/`, which reads like the thing being forbidden.

The rule used to be phrased "nothing is read from disk at runtime", which `--api` would look like a violation of. It isn't: a Bruno collection is _user input the CLI was pointed at_, not a template shipped in the tarball, and none of the packaging problems above apply to it. Template content still comes only from `src/gen*.ts`.

Each generated file comes from one `src/gen*.ts` module exporting a default function that returns a template-literal string:

```ts
export default function genFoo(name?: string) {
  const tpl = `...`;
  return tpl;
}
```

The four files in `src/presets/` map output paths to those functions. **Presets must stay thin map-builders** — if they start holding template strings of their own, there are three different places a generated file can be defined. `pwa.ts` spreads `react(o)` and adds four entries, which is the intended way to express "template X is template Y plus some files". `src/apiFiles.ts` is the same idea in the other direction: a map-builder every preset spreads, returning nothing at all unless `o.api` is set. It lives outside `src/presets/` so that directory stays one file per template.

**Adding a generated file** is two touches: create `src/genX.ts`, then add one `"path/to/file": genX(o)` line to the relevant preset. `index.ts` never needs to change — parent directories are derived from the map keys.

**Generator signatures follow one rule:** a generator takes `(name: string)` if its output depends only on the app name, and `(o: Opts)` if it branches on the template or a flag. Nothing takes both. Generators whose output differs per template branch on `o.template` rather than being duplicated (`genTsConfig`, `genGitIgnore`, `genIndexHtml`, `genAppTsx`) — except where two templates share nothing at all, which is why expo has its own `genExpoTsConfig` / `genExpoGitIgnore` instead of a branch.

The parsed collection is hung off `Opts` as `o.api?: ApiSpec` precisely to keep that rule intact — every `genApi*.ts` still takes one `Opts`. It is also why `genManifest`, `genExpoPackageJson` and `genExpoAppTsx` were moved from `(name: string)` to `(o: Opts)`: they now branch on `o.api`.

### Adding a template

`TEMPLATES` in `cli.ts` is the source of truth and `Template` is derived from it (`typeof TEMPLATES[number]`), so adding a member there is step one. Only `PRESETS` (`index.ts`) and `OUTPUT`/`TAILWIND_OUTPUT` (`genGitIgnore.ts`) then fail to compile. The rest drift silently and must be worked by hand: a preset in `src/presets/` (spreading `apiFiles(o)` if the template should support `--api`), the `steps()` branch in `help.ts`, the `templates` array in `smoke.mjs`, the QueryClientProvider in whatever the template's root component is, and the README table plus a `### The X template` section. `help()`'s option line and template list render from `TEMPLATES`/`DESCRIPTIONS`, so those two do not drift.

`BrowserTemplate` is `Exclude<Template, "expo">` — expo has no esbuild output, so anything keyed on build artefacts uses that instead of `Template`.

`writeTree` applies `.trim() + "\n"` to every string, so generators may open their template literal on the line before the content (most do) without that blank first line reaching disk.

**Binary files.** A preset may also return a `Buffer`, which `writeTree` writes through byte for byte (the type is `Files = Record<string, string | Buffer>`). This exists for exactly one case: the PWA's PNG icons, which Chrome requires for installability and which cannot be expressed as text. They are still _generated_, not checked in — `src/png.ts` is a small PNG encoder over `node:zlib`, and `src/genIconPng.ts` draws an identicon from a hash of the app name. The "no binary assets in the repo" rule holds; the "everything is a string" one no longer does. Icons are deterministic per name on purpose, so re-scaffolding produces no diff.

### `--api`: typed clients from a Bruno collection

`--api <dir>` reads a Bruno collection, executes its safe requests once, infers TypeScript types from the real responses, and emits a TanStack Query client. It composes with every template.

The pipeline is one direction, and each stage knows nothing about its neighbours' concerns:

```
api/**.bru ──parse──> ApiSpec ──sample──> api/samples.json
                         │                      │
                         └──────────┬───────────┘
                                    ▼
                            src/api/*.ts
```

`src/bruno/` is the front end. **It is not `src/api/`** — that is the path these files are _emitted to_ inside the scaffolded app, and having both meanings share a name is how you end up editing the wrong one.

| Module          | Does                                                 | Deliberately does not                                 |
| --------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `spec.ts`       | the `ApiSpec`/`Endpoint` IR, `substitute`, `origins` | import anything at runtime — see the cycle note below |
| `parse.ts`      | brace-depth scanner: `.bru` → block map              | know what any block _means_                           |
| `collection.ts` | walks the dir, builds `ApiSpec`                      | touch `process.env` or the network                    |
| `sample.ts`     | resolves vars, executes, reads/writes `samples.json` | write anything that could be a credential             |
| `infer.ts`      | JSON → TypeScript source                             | know about endpoints                                  |
| `emit.ts`       | naming, base-url splitting, shared emit helpers      | hold whole templates                                  |

The `gen*.ts` emitters (`genApiTypes`, `genApiClient`, `genApiConfig`, `genApiKeys`, `genApiQueries`, `genApiMutations`, `genApiIndex`) follow the flat convention like every other generator.

**The `.bru` subset.** Three block shapes, all delimited, so one scanner handles them: dictionary `name { k: v }`, list `name [ item ]`, and text `body:json { ... }`. `~key` marks a disabled entry and is dropped. Unknown blocks are parsed and ignored — collections in the wild are full of `script:*` and `tests`, and erroring on them would be useless. Only text blocks get string-skipping while depth-counting; dict blocks don't need it (their only braces are balanced `{{var}}` pairs) and _must not_ have it, or a header value like `don't send this` would swallow the rest of the file.

**Sampling is conservative on purpose.** `--api-sample=safe` (the default) executes only GET and HEAD: a scaffolder must not POST to someone's real API as a side effect of `npm create`. Un-sampled endpoints are typed `unknown`, and `samples.json` records _why_ in a `skipped` string, so the committed file explains itself in review. One dead endpoint is never fatal; every endpoint failing is, because that is a wrong base URL or a missing token rather than a flaky service.

**Why the samples are committed.** `api/samples.json` is what makes regeneration deterministic, offline, and reviewable — a teammate with no credentials gets byte-identical output, and an API change shows up as a diff in `samples.json` next to the diff in `types.ts`. `npm run api:gen` replays it; `--refresh` re-hits the network.

**The collection is copied into the app** under `api/`, and the path is recorded in the generated `package.json` as `"tsreact": { "api": "api" }`. That key is also how `parseArgs` tells `create-tsreact api` (the regenerate subcommand) apart from `create-tsreact api` (scaffolding an app named "api") — the subcommand only wins in a directory that already carries the marker.

### Five toolchains — don't confuse them

|          | This CLI                                                      | react template                                          | extension template                                | pwa template                                            | expo template                 |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| Entry    | `src/index.ts`                                                | `src/app.tsx`                                           | `src/popup.tsx` + `content.ts` + `background.ts`  | `src/app.tsx` + `src/sw.ts`                             | `index.ts` → `App.tsx`        |
| Bundler  | `--platform=node --format=esm --target=es2022`, out to `bin/` | `--platform=browser --format=esm`, out to `public/`     | `--platform=browser --format=iife`, out `public/` | react's, plus a second `--format=iife` run for `sw.js`  | **metro** — no esbuild at all |
| tsconfig | `lib: ES2022`, `outDir: ./bin`                                | `jsx: react-jsx`, DOM libs, `noEmit`, `isolatedModules` | same plus `types: ["chrome"]`                     | same plus `exclude: ["src/sw.ts"]` + `tsconfig.sw.json` | `extends: expo/tsconfig.base` |

The README's "Building" section shows the _react template's_ build command, not this repo's.

The expo template is the only one that shares nothing with the rest: no esbuild, no `public/`, exact version pins instead of caret ranges, and `typescript ~6.0.3` where every other template generates `^7.0.2`. That skew is intentional — it mirrors the published `expo-template-blank-typescript` — so don't "fix" it.

### Things that will silently break if changed

- **`--watch` in the react template's `dev` script.** Live reload is esbuild's `/esbuild` SSE endpoint, and its `change` event only fires on a _watch_ rebuild. With `--serve` alone the endpoint still exists and the browser still connects — it just never fires. Also note esbuild's `--watch` stops when stdin closes, which matters when running it from a script rather than a terminal.
- **`--minify` in both `build` scripts.** With `platform=browser`, esbuild defines `process.env.NODE_ENV` as `"production"` only when _all_ minify options are enabled. Dropping `--minify` (or using only `--minify-syntax`) silently ships React's development build.
- **The live-reload snippet's `.map` filter.** Dev builds pass `--sourcemap`, so a CSS edit reports `["/app.css", "/app.css.map"]`. esbuild's documented snippet checks `updated.length === 1`, which is then never true, so it always falls back to a full reload instead of hot-swapping the stylesheet.
- **`"types": ["chrome"]` in the extension's tsconfig.** `@types/chrome` is _not_ picked up automatically (verified on TypeScript 7); without this, every `chrome.*` call is `TS2304: Cannot find name 'chrome'`. Setting `types` opts out of other ambient `@types` packages, which is fine here only because `@types/react` / `@types/react-dom` are module types resolved through imports.
- **The tailwind chain `src/styles.css` → `src/app.css` → esbuild → `public/app.css`.** Pointing `@tailwindcss/cli` straight at `public/app.css` looks simpler and silently kills the live-reload CSS swap: the `/esbuild` stream only emits `change` for esbuild's _own_ outputs, so a file written behind its back never fires one. The compiled CSS has to stay inside esbuild's import graph.
- **`src/app.css` being gitignored under `--tailwind`.** It flips from source file to build output. It is still written once at scaffold time (as a placeholder) so the first `npm run dev` can resolve the import in `app.tsx` before the CSS watcher has ever run — deleting that placeholder breaks a cold start with `Could not resolve "./app.css"`.
- **The service worker not being registered on localhost.** It caches cache-first, so in dev it would serve a stale bundle and sit in front of the `/esbuild` EventSource. The guard in `genAppTsx` is what keeps `npm run dev` usable.
- **`tsconfig.sw.json` and the `exclude` in the pwa's `tsconfig.json`.** `lib.webworker.d.ts` and `DOM` cannot both be loaded, and `app.tsx` needs `DOM`. Merging the two configs makes every `FetchEvent`/`ExtendableEvent` in `sw.ts` an unresolved name.
- **`--format=iife` for the extension.** MV3 content scripts cannot be ES modules. The background service worker could be, but only with `"type": "module"` in the manifest — which is deliberately absent so one command can build all three entries.
- **No inline `<script>` in `public/popup.html`.** MV3's CSP is `script-src 'self'`. In particular, do not copy the react template's live-reload snippet into it.
- **`app.css` lives in `src/`, not `public/`.** It is imported from `app.tsx` so esbuild emits `public/app.css` as build output. A handwritten `public/app.css` would be silently overwritten by the first CSS import, since `--outdir` is also `public/`.
- **`npm create` swallows unknown flags.** `npm create tsreact myapp --template extension` sets `npm_config_template` and never reaches `process.argv`; users need `-- --template extension`. `npx` is unaffected. This is documented in `help()` and the README.
- **`SAMPLE_MODES` living in `src/bruno/spec.ts` rather than `sample.ts`.** `cli.ts` needs it to validate the flag, and `sample.ts` imports `CliError` back out of `cli.ts`. `spec.ts` has no runtime imports at all, which is what keeps that from being a cycle — moving the constant "where it belongs" reintroduces one.
- **Dict blocks must not get the text-block string scanner.** See the `.bru` subset note above: a header value containing an apostrophe is far more common than an unbalanced brace, and treating `'` as a string delimiter in a dict block swallows the rest of the file.
- **`src/api/config.ts` being excluded from regeneration.** It holds the base URL and the token the user typed in. `index.ts` deletes it from the map when it already exists; without that, the first `npm run api:gen` silently throws their credentials away. It is the reason config was split out of `client.ts` at all.
- **`host_permissions` in the extension's manifest.** MV3 blocks a cross-origin fetch that is not declared, and it surfaces as an opaque network error rather than a CORS message — so a generated client that is not listed looks like a broken API rather than a missing permission.
- **The fixture API in `smoke.mjs` running in its own process.** Every scaffold there goes through `execFileSync`, which blocks the event loop, so an in-process `http.Server` never accepts the connection and every sampled request sits until the 10s timeout. It binds port 0 and reports the port on stdout.
- **Sampling happening before `mkdir`.** An unreachable collection must leave no half-made directory behind. `create()` in `index.ts` awaits `loadSpec` first for that reason alone.

## `bin/index.js` is committed and auto-generated

The esbuild bundle is tracked in git (`.gitignore` covers `dist`, not `bin`) because it's the published `bin` target. `.husky/pre-commit` runs `npm run build`, `git add bin/index.js`, `npx lint-staged`, then `npx eslint src`.

Consequences: never hand-edit `bin/index.js` — the hook overwrites it. `bin/**` is in `.prettierignore` so the bundle isn't reformatted. Committing a `src/` change is sufficient to ship the rebuilt bundle.

## Conventions

- Pure ESM (`"type": "module"`). Relative imports must carry explicit `.js` extensions even though sources are `.ts` (NodeNext resolution) — e.g. `import genAppTsx from "./genAppTsx.js"`.
- ESLint uses the legacy `.eslintrc.json` format (ESLint 8), not flat config.
- `.prettierrc.json` is `{}`. Prettier reads `.editorconfig` by default and an empty `.prettierrc.json` overrides nothing, so `.editorconfig`'s `indent_size = 4` wins for `*.ts` — which is why sources are 4-space and lint-staged never reformats them to 2. Run `npm run format:fix` rather than hand-formatting.

## Publishing

There is no `files` field and no `.npmignore`, so `npm publish` ships everything not gitignored (`src/`, `bin/`, configs, `package-lock.json`). This is also why `--version` can read `../package.json` at runtime — npm always includes the manifest in the tarball. Version bumps are manual `npm version` commits — the git log is a series of bare version-number commit messages.

## Out of date

The repo's own toolchain is still 2022-era even though the generated dependencies were modernized: `eslint` 8 with legacy config, `prettier` 2, `esbuild` 0.15 (the generated apps get 0.28), `@types/node` 18, `husky` 8 with the deprecated `husky install` + `husky.sh` shim, and no direct `typescript` devDependency (only 4.8.4, transitively via `tsutils`).
