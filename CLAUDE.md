# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm install          # at the workspace root - this repo is a pnpm workspace
pnpm build            # esbuild -> packages/cli/bin/index.js (single bundled ESM file)
pnpm build-watch      # same, with --watch
pnpm test             # build, then node smoke.mjs (scaffolds every template for real)
pnpm typecheck        # tsc --noEmit over each package in turn
pnpm lint             # oxlint, from the root, over everything not ignored
pnpm format:check     # oxfmt --check, over each package's src plus scripts/ and smoke.mjs
pnpm format:fix       # same, writing
```

`lint` takes no path: oxlint walks the working directory and honours
`.oxlintrc.json`'s `ignorePatterns`, so it covers `scripts/release.mjs` and
`packages/cli/smoke.mjs` as well — neither of which the old `eslint packages/*/src`
ever saw. `format:*` does take paths, and spells every one of them out; see the
oxfmt note under "Things that will silently break" for why a glob is not enough.

The repo is a pnpm workspace of four packages:

| Package          | Name             | What it is                                                                  |
| ---------------- | ---------------- | --------------------------------------------------------------------------- |
| `packages/cli`   | `create-tsreact` | the published package: the CLI, all generators, the smoke suite             |
| `packages/bruno` | `@tsreact/bruno` | private; the `.bru` parser, sampler, type inferrer and the client emitters  |
| `packages/png`   | `@tsreact/png`   | private; a PNG encoder over `node:zlib` and the identicon the PWA icons use |
| `packages/pm`    | `@tsreact/pm`    | private; which package manager launched us, and how to spell its commands   |

The three private ones are all **devDependencies** of the CLI, not dependencies:
esbuild inlines them into `bin/index.js`, so they have no runtime presence, and a
`workspace:*` under `dependencies` would make `pnpm publish` demand a published
`@tsreact/*`. Their `exports` maps point straight at `.ts` sources — there is no
build step for any of them. **Their code ships; the packages do not.** Only
`packages/cli/src` is in the tarball, so the extracted sources are readable in
the repo and nowhere else.

That is also why each one carries its own `@types/node` devDependency. Without it
a package resolves the stray `@types/node@18.11.5` sitting in the root
`node_modules` and typechecks against different `Buffer` types than the CLI does
— which is what `packages/png` did on the day it was split out. Same class of
trap as the `typescript` entry in "Out of date" below: pnpm's isolated linker does
not hand a package its neighbours' dependencies.

**Declaring the dependency is only half of it — every `tsconfig.json` must also
say `"types": ["node"]`.** With `types` unset, TypeScript sweeps in every
`@types/*` package it can find across all typeRoots, and the root's stray 18.11.5
is one of them. `packages/cli` was the one config that left it unset, which was
survivable until the TypeScript 7 bump and then wasn't: the whole package failed
with `Cannot find name 'process'` / `'Buffer'` / `'console'` on every file,
including the sources it pulls in from the other three packages. Naming `node`
pins the lookup to the package's own copy. It is safe to opt out of the automatic
sweep here because nothing in this repo relies on an ambient `@types` package.

**A new package needs five touches**, none of them compile-checked: the
`package.json` (private, `exports` at `.ts`, `@types/node`), a `tsconfig.json`
copied from an existing one (`"types": ["node"]` included), a `workspace:*` line
in `packages/cli`'s devDependencies, a `tsc --noEmit -p` clause in the root
`typecheck` script, and its `src` appended to both `format:*` scripts. `lint`
needs nothing — oxlint takes no path and picks the package up on its own.

**`CliError` lives in `packages/bruno/src/error.ts`**, not in the CLI. `parse.ts`,
`collection.ts` and `sample.ts` all throw it, and importing it back out of the
CLI would make the two packages mutually dependent. `cli.ts` imports and
re-exports it so every call site there still says `from "./cli.js"`.

`pnpm test` runs `smoke.mjs`: it scaffolds every template (plus one `--tailwind --daisyui --husky` combination) into a temp dir, runs a real `pnpm install`, `pnpm -r run typecheck` and `pnpm -r run build` in each, and asserts on what lands on disk (files emitted, JSON validity, production React, classic-script output for the extension and the PWA's `sw.js`, DaisyUI classes reaching the compiled CSS, build output gitignored).

It needs network access for the installs and takes ~5min. Every generated app is a pnpm workspace, so the row fields below are all relative to that root. There is no other test runner and no CI (`.github/` does not exist).

**Every row also runs the scaffold's own `lint` and `format:check`** (`quality()`), which is the assertion that a brand new app is clean before anyone touches it. Those two gates are why the generated sources have to be written in oxfmt's style, and they are what caught the two lint false positives and the six formatting differences when the esbuild lane moved off prettier. The expo row runs them too, after its real install.

A row may set four optional fields. `husky` turns on the assertions for the half of `--husky` no preset emits — the `prepare` script and the two devDependencies in the root manifest. `outDir` (default `public`) is where `outputs` are looked for and is also what the gitignore-leak check uses — `vite-spa` sets `dist`, and `fastify-react` sets `.` and gives full paths because it has one output directory per workspace. `jsonFiles` names JSON below the top level, which the `readdirSync` sweep cannot see. `resolveOnly` and `skipBuild` are the two ways a row opts out of the full run; see below.

The `# api` section at the end is **hermetic** — it spawns its own fixture API and needs no external service. That matters more than usual, because the feature is _about_ executing real requests and a test reaching the internet would fail for reasons unrelated to the code. It covers the inference cases a declared-types approach could not know (an optional key, a `| null` union, an empty array merging with a populated one), that mutations are not sampled by default, that a `~disabled` header and `Authorization` never reach the emitted client, and — with the fixture killed — that `create-tsreact api` regenerates byte-identically offline while leaving a hand-edited `config.ts` alone.

It also covers where `--api` emits: every template puts the client inside the app that consumes it, and the two-app template is where `apiRoot()` has a real choice to make. A separate check builds a _pre-workspace_ fixture — a flat `src/api/` and a marker with no `"template"` key — and asserts that regeneration follows it rather than the current react layout.

Two rows opt out of the full run. The `expo` row sets `resolveOnly`, because Expo has no `build` or `typecheck` script and a real install is enormous. It runs `pnpm install --lockfile-only` instead — that still does full registry and peer resolution, which is the failure mode a handwritten pin table actually has — and then asserts on file and JSON shape only. **A broken Expo template is otherwise only discoverable by a human running `pnpm start`.** The one exception is the linker: the row does a real install and asserts that `expo` ends up at the top of `node_modules` rather than behind a `.pnpm/` symlink, because `nodeLinker: hoisted` failing silently is exactly how metro breaks.

The `next-drizzle` row sets `skipBuild`: it installs and type-checks but never runs `next build`, whose first run downloads Turbopack's native binaries and would dominate the suite. The risk that row exists to catch — TypeScript 7 against Next 16's own types — is entirely in the typecheck. **The `db:push` → `dev` path is therefore not covered by any test**; verify it by hand after touching `genDbIndex`, `genDrizzleConfig` or `genNextPageTsx`.

`tsc` is never run by any script. esbuild transpiles without type-checking, so `tsconfig.json` only serves the editor. To actually type-check, run `pnpm typecheck` (do not run plain `tsc` in `packages/cli` — `outDir` is `./bin` and it would collide with the esbuild bundle).

## Architecture

`packages/cli/src/index.ts` is the entry point, run via the `#!/usr/bin/env node` shebang that esbuild preserves into the bundle. Flow:

1. `parseArgs` (`src/cli.ts`) turns `process.argv` into a `Parsed` union: `usage`, `help`, `version`, `templates`, `create`, or `api`. `--list-templates` cannot return on sight the way `--help` does, because `--json` may still be ahead of it in argv — it sets a flag and returns after the loop, before the "no target means usage" check.
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

The eight files in `src/presets/` map output paths to those functions. **Presets must stay thin map-builders** — if they start holding template strings of their own, there are three different places a generated file can be defined. `pwa.ts` spreads `react(o)` and adds four entries, which is the intended way to express "template X is template Y plus some files". `src/apiFiles.ts` is the same idea in the other direction: a map-builder every preset spreads, returning nothing at all unless `o.api` is set. It lives outside `src/presets/` so that directory stays one file per template. `src/huskyFiles.ts` has exactly the same shape for `--husky`, and exists for the same reason — a flag that adds files to all eight templates should not mean eight conditionals.

`fastifyReact.ts` is the only preset that writes into two package roots (`apps/server/…` and `apps/web/…`). It needs no special handling — `writeTree` derives parent directories from the map keys — and it reuses every `genVite*` generator rather than duplicating them, each of which branches on `o.template` where the workspace child differs.

**Adding a generated file** is two touches: create `src/genX.ts`, then add one `"path/to/file": genX(o)` line to the relevant preset. `index.ts` never needs to change — parent directories are derived from the map keys.

**Generator signatures follow one rule:** a generator takes `(name: string)` if its output depends only on the app name, and `(o: Opts)` if it branches on the template or a flag. Nothing takes both. Generators whose output differs per template branch on `o.template` rather than being duplicated (`genTsConfig`, `genGitIgnore`, `genIndexHtml`, `genAppTsx`, `genStylesCss`, `genEnvDts`, and both oxc configs — `genOxlintrc` turns off one rule each for expo and pwa, `genOxfmtrc` emits `sortTailwindcss` only with tailwind) — except where two templates share nothing at all, which is why expo has its own `genExpoTsConfig` / `genExpoGitIgnore`, and why the vite, next and fastify templates have their own `gen*PackageJson` and `gen*TsConfig` rather than another branch inside the esbuild ones.

`genEnvDts` shows the boundary: the vite templates need `/// <reference types="vite/client" />` where the esbuild ones need `declare module "*.css";` — one line either way, so it branches. `genSpaTsConfig` is the same call made twice over: it serves vite-spa, rsbuild-spa and fastify-react's web half, differing between the vite and rsbuild lanes by nothing but the `types` array, so it branches rather than forking. It does not serve the esbuild templates, because almost nothing in it is shared with those.

The parsed collection is hung off `Opts` as `o.api?: ApiSpec`, which is why `genManifest`, `genExpoPackageJson` and `genExpoAppTsx` were moved from `(name: string)` to `(o: Opts)`: they now branch on `o.api`.

**The `--api` emitters are the documented exception** and no longer live here at all. They take `(spec: ApiSpec)` and sit in `@tsreact/bruno` — see the `--api` section below for why narrowing the argument is what let them move.

### Adding a template

`TEMPLATES` in `cli.ts` is the source of truth and `Template` is derived from it (`typeof TEMPLATES[number]`), so adding a member there is step one. Four things then fail to compile — `DESCRIPTIONS` and `APPS` (`cli.ts`), `PRESETS` (`index.ts`), and `OUTPUT`/`TAILWIND_OUTPUT` (`genGitIgnore.ts`) — plus the `DESCRIPTIONS` map at the foot of `genRootPackageJson.ts`. The rest drift silently and must be worked by hand: a preset in `src/presets/` (spreading `apiFiles(o)` if the template should support `--api`, and `huskyFiles(o)` — every preset does, and a template that forgets it accepts `--husky` and then emits no hook), the `steps()` branch in `help.ts`, the `templates` array in `smoke.mjs`, the QueryClientProvider in whatever the template's root component is, the README table plus a `### The X template` section, and a row in `supported-stacks.md`'s bundler matrix (plus a styling entry, and a "why" bullet if the new toolchain has a constraint worth warning about).

**The new template's generated sources have to be written in oxfmt's style**, because the smoke suite runs `lint` and `format:check` on every scaffold and both are gates. That means double quotes, `function f() {` on one line, semicolons, trailing commas on anything that spans lines, and Tailwind class lists in `sortTailwindcss` order. The quickest way to get it right is to scaffold once, run `format:fix`, and copy the result back into the generator — which is exactly how the four esbuild-lane templates were converted, and the diff was not small. `help()`'s option line and template list render from `TEMPLATES`/`DESCRIPTIONS`, so those two do not drift.

`OUTPUT` and `TAILWIND_OUTPUT` are keyed on the full `Template` union, including `expo`, whose row is empty because it uses `genExpoGitIgnore.ts` instead. That is on purpose: it makes those two maps the compile-time guard that every new template declares its build output. There used to be a `BrowserTemplate = Exclude<Template, "expo">` alias with an unchecked `o.template as BrowserTemplate` cast at the top of `genGitIgnore`; it was removed when the non-esbuild templates arrived, because a cast that silently yields `undefined` is exactly the failure the maps exist to prevent.

`TAILWIND_ALWAYS` in `cli.ts` forces `o.tailwind` true for the templates whose bundler compiles Tailwind, so `--tailwind` is a no-op there rather than an error, and no generator needs a per-template special case.

**`standaloneTailwind(o)` in `cli.ts` is the derived half of that**, and the only thing anything else should ask. It is `o.tailwind && !TAILWIND_ALWAYS.includes(o.template)` — true exactly for the templates where `@tailwindcss/cli` runs as its own watcher — and it is what decides the `tw` script (`genRootPackageJson`), the `predev` hook (`genNpmrc`), the `@source` paths (`genStylesCss`) and whether `steps()` advertises the watcher (`tailwindNote` in `help.ts`). All four used to spell out `react || pwa || extension` by hand, and one of them had drifted into a stale `!oxc` that meant "not a template with oxlint". Expo cannot reach the true branch: `parseArgs` rejects `--tailwind` there outright.

`APPS` in `cli.ts` is the other compile-checked map: it declares the directories under `apps/` a template creates, and its first entry is the primary app — the one `--api` writes its client into, and the one `appDir()` returns.

`writeTree` applies `.trim() + "\n"` to every string, so generators may open their template literal on the line before the content (most do) without that blank first line reaching disk.

**Binary files.** A preset may also return a `Buffer`, which `writeTree` writes through byte for byte (the type is `Files = Record<string, string | Buffer>`). This exists for exactly one case: the PWA's PNG icons, which Chrome requires for installability and which cannot be expressed as text. They are still _generated_, not checked in — `@tsreact/png` holds a small PNG encoder over `node:zlib` (`png.ts`) and an identicon drawn from a hash of the app name (`icon.ts`), and `presets/pwa.ts` is its only consumer. The "no binary assets in the repo" rule holds; the "everything is a string" one no longer does. Icons are deterministic per name on purpose, so re-scaffolding produces no diff.

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

**`packages/bruno/src/` is the whole feature except the last step.** It is not `src/api/` — that is the path these files are _emitted to_ inside the scaffolded app, and having both meanings share a name is how you end up editing the wrong one.

| Module          | Does                                                 | Deliberately does not                                 |
| --------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `spec.ts`       | the `ApiSpec`/`Endpoint` IR, `substitute`, `origins` | import anything at runtime — see the cycle note below |
| `parse.ts`      | brace-depth scanner: `.bru` → block map              | know what any block _means_                           |
| `collection.ts` | walks the dir, builds `ApiSpec`                      | touch `process.env` or the network                    |
| `sample.ts`     | resolves vars, executes, reads/writes `samples.json` | write anything that could be a credential             |
| `infer.ts`      | JSON → TypeScript source                             | know about endpoints                                  |
| `emit.ts`       | naming, base-url splitting, shared emit helpers      | hold whole templates                                  |
| `emit*.ts`      | one emitted file each, via the `generate.ts` barrel  | know where the file lands                             |

**The seven emitters take `(spec: ApiSpec)`, not `(o: Opts)`.** That is what let them move out of the CLI: they used to read `o.api` off the CLI's `Opts` and cast it, and importing `Opts` back out of the CLI would have made the two packages mutually dependent — the same cycle the `CliError` note above describes. Every one of them touched exactly one field, so narrowing the argument cost nothing and retired an `o.api as ApiSpec` cast seven times over.

They export as `clientTs`, `configTs`, `typesTs`, `keysTs`, `queriesTs`, `mutationsTs` and `indexTs` — named for the files they produce. **The `Ts` suffix is load-bearing:** `emit.ts` already exports `queries()` and `mutations()`, the filters that split a spec into safe and unsafe endpoints, and `apiFiles.ts` imports both sets side by side.

`apiFiles.ts` stays in the CLI, because the split is _what the client source is_ (bruno) against _where it goes_ (the CLI, which is the side that knows `appDir`, `APPS` and `Files`).

**The `.bru` subset.** Three block shapes, all delimited, so one scanner handles them: dictionary `name { k: v }`, list `name [ item ]`, and text `body:json { ... }`. `~key` marks a disabled entry and is dropped. Unknown blocks are parsed and ignored — collections in the wild are full of `script:*` and `tests`, and erroring on them would be useless. Only text blocks get string-skipping while depth-counting; dict blocks don't need it (their only braces are balanced `{{var}}` pairs) and _must not_ have it, or a header value like `don't send this` would swallow the rest of the file.

**Sampling is conservative on purpose.** `--api-sample=safe` (the default) executes only GET and HEAD: a scaffolder must not POST to someone's real API as a side effect of `pnpm create`. Un-sampled endpoints are typed `unknown`, and `samples.json` records _why_ in a `skipped` string, so the committed file explains itself in review. One dead endpoint is never fatal; every endpoint failing is, because that is a wrong base URL or a missing token rather than a flaky service.

**Why the samples are committed.** `api/samples.json` is what makes regeneration deterministic, offline, and reviewable — a teammate with no credentials gets byte-identical output, and an API change shows up as a diff in `samples.json` next to the diff in `types.ts`. `pnpm api:gen` replays it; `--refresh` re-hits the network.

**The collection is copied into the app** under `api/`, and the path is recorded in the generated `package.json` as `"tsreact": { "api": "api" }`. That key is also how `parseArgs` tells `create-tsreact api` (the regenerate subcommand) apart from `create-tsreact api` (scaffolding an app named "api") — the subcommand only wins in a directory that already carries the marker.

**Where the client lands** is `apiRoot(o)` in `src/apiFiles.ts`: `apps/<primary app>/src/api`, derived from `APPS` in `cli.ts`. The collection and `api/samples.json` stay at the workspace root, next to the marker. `preserved(root)` names `config.ts` under whichever root is in play.

**`APPS` order matters.** The first entry is the primary app, and that is where the client goes — which is why `fastify-react` lists `web` before `server`.

Because `apiRoot` is a function of `o.template`, the template is recorded alongside the collection as `"tsreact": { "api": "api", "template": "vite-spa" }`, and `regenerate()` reads it back through `recordedTemplate()`.

**A missing `template` key means a pre-workspace app**, not `react`. Those have a flat `src/api/`, so `recordedTemplate()` returns `undefined` and `index.ts` passes `LEGACY_API_ROOT` explicitly. Falling back to `"react"` there would regenerate into `apps/web/src/api` and leave the real client stale beside it.

### Nine toolchains — don't confuse them

The esbuild lane — the CLI itself plus `react`, `extension`, `pwa`:

|          | This CLI                                                                   | react template                                          | extension template                                | pwa template                                            |
| -------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Entry    | `packages/cli/src/index.ts`                                                | `src/app.tsx`                                           | `src/popup.tsx` + `content.ts` + `background.ts`  | `src/app.tsx` + `src/sw.ts`                             |
| Bundler  | `--platform=node --format=esm --target=es2022`, out to `packages/cli/bin/` | `--platform=browser --format=esm`, out to `public/`     | `--platform=browser --format=iife`, out `public/` | react's, plus a second `--format=iife` run for `sw.js`  |
| tsconfig | `lib: ES2022`, `outDir: ./bin`                                             | `jsx: react-jsx`, DOM libs, `noEmit`, `isolatedModules` | same plus `types: ["chrome"]`                     | same plus `exclude: ["src/sw.ts"]` + `tsconfig.sw.json` |

And the five that are not esbuild at all:

|          | expo template                 | vite-spa template                                    | rsbuild-spa template                                   | next-drizzle template                                 | fastify-react template                                           |
| -------- | ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Entry    | `index.ts` → `App.tsx`        | `index.html` → `src/main.tsx` → `src/App.tsx`        | `source.entry` → `src/main.tsx` → `src/App.tsx`, no html | `src/app/layout.tsx` + `src/app/page.tsx`             | `apps/server/src/index.ts` + the vite-spa tree under `apps/web/` |
| Bundler  | **metro**                     | **vite 8** (rolldown is its dependency), out `dist/` | **rspack**, via rsbuild 2, out `dist/`                 | **Turbopack**, out `.next/`                           | **rolldown** for the server, vite for the web                    |
| tsconfig | `extends: expo/tsconfig.base` | `types: ["vite/client"]`, bundler resolution         | `types: ["@rsbuild/core/types"]`, otherwise vite-spa's  | `jsx: react-jsx`, `plugins: [{name:"next"}]`, `paths` | server is `NodeNext` with no DOM; web reuses vite-spa's          |
| Styling  | StyleSheet objects            | `@tailwindcss/vite`                                  | `@rsbuild/plugin-tailwindcss`                          | `@tailwindcss/postcss`                                | `@tailwindcss/vite`                                              |
| Lint/fmt | oxlint + oxfmt, on `App.tsx` + `index.ts` (no `src/`) | oxlint + oxfmt                      | oxlint + oxfmt                                         | oxlint + oxfmt                                        | oxlint + oxfmt, once from the root                               |

`vite-spa`, `rsbuild-spa` and `fastify-react`'s web half share one tsconfig generator — `genSpaTsConfig.ts`, which branches on nothing but that `types` array. It is named for the shape (a bundler-driven SPA) rather than for vite, which is what it used to be called.

The README's "Building" section shows the _react template's_ build command, not this repo's.

The expo template is the only one that shares nothing with the rest: no esbuild, no `public/`, exact version pins instead of caret ranges, and `typescript ~6.0.3` where every other template generates `^7.0.2`. That skew is intentional — it mirrors the published `expo-template-blank-typescript` — so don't "fix" it.

### Things that will silently break if changed

- **`--watch` in the react template's `dev` script.** Live reload is esbuild's `/esbuild` SSE endpoint, and its `change` event only fires on a _watch_ rebuild. With `--serve` alone the endpoint still exists and the browser still connects — it just never fires. Also note esbuild's `--watch` stops when stdin closes, which matters when running it from a script rather than a terminal.
- **`--minify` in both `build` scripts.** With `platform=browser`, esbuild defines `process.env.NODE_ENV` as `"production"` only when _all_ minify options are enabled. Dropping `--minify` (or using only `--minify-syntax`) silently ships React's development build.
- **The live-reload snippet's `.map` filter.** Dev builds pass `--sourcemap`, so a CSS edit reports `["/app.css", "/app.css.map"]`. esbuild's documented snippet checks `updated.length === 1`, which is then never true, so it always falls back to a full reload instead of hot-swapping the stylesheet.
- **`"types": ["chrome"]` in the extension's tsconfig.** `@types/chrome` is _not_ picked up automatically (verified on TypeScript 7); without this, every `chrome.*` call is `TS2304: Cannot find name 'chrome'`. Setting `types` opts out of other ambient `@types` packages, which is fine here only because `@types/react` / `@types/react-dom` are module types resolved through imports.
- **The tailwind chain `src/styles.css` → `src/app.css` → esbuild → `public/app.css`.** Pointing `@tailwindcss/cli` straight at `public/app.css` looks simpler and silently kills the live-reload CSS swap: the `/esbuild` stream only emits `change` for esbuild's _own_ outputs, so a file written behind its back never fires one. The compiled CSS has to stay inside esbuild's import graph.
- **`src/app.css` being gitignored under `--tailwind`.** It flips from source file to build output. It is still written once at scaffold time (as a placeholder) so the first `pnpm dev` can resolve the import in `app.tsx` before the CSS watcher has ever run — deleting that placeholder breaks a cold start with `Could not resolve "./app.css"`.
- **The service worker not being registered on localhost.** It caches cache-first, so in dev it would serve a stale bundle and sit in front of the `/esbuild` EventSource. The guard in `genAppTsx` is what keeps `pnpm dev` usable.
- **`tsconfig.sw.json` and the `exclude` in the pwa's `tsconfig.json`.** `lib.webworker.d.ts` and `DOM` cannot both be loaded, and `app.tsx` needs `DOM`. Merging the two configs makes every `FetchEvent`/`ExtendableEvent` in `sw.ts` an unresolved name.
- **`--format=iife` for the extension.** MV3 content scripts cannot be ES modules. The background service worker could be, but only with `"type": "module"` in the manifest — which is deliberately absent so one command can build all three entries.
- **No inline `<script>` in `public/popup.html`.** MV3's CSP is `script-src 'self'`. In particular, do not copy the react template's live-reload snippet into it.
- **`app.css` lives in `src/`, not `public/`.** It is imported from `app.tsx` so esbuild emits `public/app.css` as build output. A handwritten `public/app.css` would be silently overwritten by the first CSS import, since `--outdir` is also `public/`.
- **`npm create` swallows unknown flags.** `npm create tsreact myapp --template extension` sets `npm_config_template` and never reaches `process.argv`; users need `-- --template extension`. `pnpm create`, `pnpm dlx` and `npx` all forward flags as-is and need no separator — verified, not assumed. This is documented in `help()` and the README.
- **`SAMPLE_MODES` living in `packages/bruno/src/spec.ts` rather than `sample.ts`.** `cli.ts` needs it to validate the flag, and `sample.ts` imports `CliError` back out of `cli.ts`. `spec.ts` has no runtime imports at all, which is what keeps that from being a cycle — moving the constant "where it belongs" reintroduces one.
- **Dict blocks must not get the text-block string scanner.** See the `.bru` subset note above: a header value containing an apostrophe is far more common than an unbalanced brace, and treating `'` as a string delimiter in a dict block swallows the rest of the file.
- **`config.ts` being excluded from regeneration.** It holds the base URL and the token the user typed in. `index.ts` deletes it from the map when it already exists; without that, the first `pnpm api:gen` silently throws their credentials away. It is the reason config was split out of `client.ts` at all.
- **`host_permissions` in the extension's manifest.** MV3 blocks a cross-origin fetch that is not declared, and it surfaces as an opaque network error rather than a CORS message — so a generated client that is not listed looks like a broken API rather than a missing permission.
- **The fixture API in `smoke.mjs` running in its own process.** Every scaffold there goes through `execFileSync`, which blocks the event loop, so an in-process `http.Server` never accepts the connection and every sampled request sits until the 10s timeout. It binds port 0 and reports the port on stdout.
- **Sampling happening before `mkdir`.** An unreachable collection must leave no half-made directory behind. `create()` in `index.ts` awaits `loadSpec` first for that reason alone.
- **`source.entry` in the rsbuild template's config.** Rsbuild's default entry is `./src/index.tsx`, and this template generates `./src/main.tsx` so its tree matches vite-spa's and the two share `genMainTsx`. Deleting the block does not fall back to something workable — the default file does not exist, so `source.entry` resolves to `{}` and the build produces an app with no code in it.
- **`html.title` in the rsbuild template's config, and the absent `index.html`.** There is no html file in this template: rsbuild generates the document from its own built-in template, which is also where the `<div id="root">` that `main.tsx` mounts into comes from. So the app name reaches the page only through `html.title`, and a hand-written `apps/web/index.html` is inert unless `html.template` is pointed at it.
- **`"types": ["@rsbuild/core/types"]` in the rsbuild template's tsconfig.** Unlike vite, rsbuild ships no `src/*-env.d.ts` reference — that array is the *only* route by which css imports, asset imports and `import.meta.env` are typed. Dropping it costs all three at once, and the failure looks like a broken css import rather than a missing types entry. `genSpaTsConfig.ts` branches on exactly this and nothing else.
- **`@rsbuild/core`, `@rsbuild/plugin-react` and `@rsbuild/plugin-tailwindcss` must stay on one major.** Both plugins peer on `@rsbuild/core: "^2.0.0"`, and the peers are marked optional — so a mismatched major resolves and installs without complaint, then fails at build time.
- **`@vitejs/plugin-react-oxc` is a trap.** It peers on `vite ^6.3 || ^7` only. oxc is already Vite 8's transform, so `@vitejs/plugin-react@6` _is_ the oxc path; the `-oxc` package is the backport for older Vite and fails peer resolution against 8.
- **`rolldown-vite` is obsolete here.** It is a Vite **7** alias package (`"vite": "npm:rolldown-vite@..."`). Vite 8 depends on `rolldown` directly, so adding the alias would downgrade the bundler.
- **A `webpack` key in `next.config.ts`.** Next 16 builds with Turbopack by default and hard-fails rather than falling back, so this turns `next build` into an error rather than a slower build.
- **`"jsx": "react-jsx"` and `.next/dev/types` in the next template's tsconfig.** Next rewrites `tsconfig.json` on first run and calls the `jsx` value a _mandatory_ change — `"preserve"` is the pre-automatic-runtime setting and gets overwritten. Next 16 also emits route types under `.next/dev/types` as well as `.next/types`; both must be in `include` or `PageProps`/`LayoutProps` go unresolved. Generating the settled version is what makes the first `next dev` report nothing.
- **`next-env.d.ts` being generated at scaffold time.** Next writes it during `next dev`/`next build`, neither of which the smoke row runs, so without it `pnpm typecheck` fails on every JSX element on a fresh clone.
- **The `?? "file:./local.db"` defaults in `src/db/index.ts` and `drizzle.config.ts`.** Without them a fresh scaffold cannot run `db:push` or `dev` until the user writes a `.env`, which turns a working template into a broken one. The two must agree, or `db:push` writes to a different database than the page reads.
- **`server.proxy` in `apps/web/vite.config.ts`.** Dropping it means the client asks Vite for `/api/...` and gets the SPA fallback HTML, which surfaces as a JSON parse error rather than as a missing proxy.
- **`external` in `apps/server/rolldown.config.ts`.** Fastify resolves plugin metadata by identity at registration time, so inlining it fails at runtime rather than at build. Runtime deps stay external; the bundle exists to collapse `src/` into one file, not to vendor `node_modules`.
- **The oxc format scripts pointing at `src/`, not `.`.** oxfmt reads `.editorconfig`, which sets `indent_size = 2` for JSON — so formatting the project root would rewrite every generated 4-space JSON file on the first `pnpm format:fix`. For the same reason the monorepo spells out both workspace paths: **oxfmt does not expand globs itself**, so `"apps/*/src"` only works where a shell expands it first, which pnpm scripts do on posix and cmd.exe does not. (`oxfmt --help` advertises glob support; a quoted `packages/*/src` still resolves to nothing.)
- **`--husky` needs `git init` before the install.** husky installs the hook from the generated `prepare` script, package managers run `prepare` as part of install, and husky 9 **exits 0** with `.git can't be found` outside a repository. Install first and you get a `.husky/pre-commit` that never runs and no error anywhere. `steps()` therefore prints `git init` above the install line, which it does by folding it into the shared `cd` string — the one place every template's command block passes through.
- **`src/api` in `.oxfmtrc.json`'s `ignorePatterns`.** Those files are emitted from the Bruno collection in prettier's style, and their regeneration output is asserted byte-identically. Formatting them is churn that comes straight back on the next `api:gen`. The second pattern is `apps/*/src/api`, not `apps/web/src/api`: the client follows the primary app, so it is `apps/extension/…` for the extension template and `apps/mobile/…` for expo.
- **`--no-error-on-unmatched-pattern` in the generated `.lintstagedrc.json`.** oxfmt exits **2** when every path it was handed is excluded by an ignore rule — "Expected at least one target file" — and lint-staged hands it exactly the staged files. So a commit containing nothing but a regenerated `src/api` would fail, with a message about target files rather than about anything the user did. `pnpm api:gen` produces precisely that commit.
- **expo's format paths naming `App.tsx` and `index.ts` instead of a directory.** Its app has no `src/`, so `apps/mobile/src` is a path that does not exist and oxfmt exits 2 on it, and `oxfmt apps/mobile` would reformat the generated 4-space `app.json`/`tsconfig.json` to `.editorconfig`'s 2. `genRootPackageJson` and `genLintStagedrc` both carry the exception and must agree.
- **`react/style-prop-object` off for expo, `unicorn/require-module-specifiers` off for pwa.** Both are false positives that would otherwise make a brand new app lint dirty: expo-status-bar's `style` prop takes a string, and `sw.ts` ends in `export {}` because `isolatedModules` refuses a file with no import or export (TS1208).
- **Generated sources must already be in oxfmt's style.** `format:check` is a smoke gate for every template, so a generator emitting single quotes, an Allman brace or a line over 100 columns fails the suite. The subtle one is conditional width: the extension's popup button is 69 columns without `--daisyui` and 104 with it, so `genPopupTsx` emits it pre-broken only in the daisy case — and the formatter would pull the broken form back onto one line in the other. A long app name can still push a generated line past 100; that is the one case where a fresh scaffold may need a `format:fix`.
- **`react/react-in-jsx-scope` being off in `.oxlintrc.json`.** It is on by default with oxlint's react plugin and predates the automatic runtime, so with `"jsx": "react-jsx"` a freshly scaffolded app lints dirty out of the box. Note also that oxlint's `plugins` array _overwrites_ the default set rather than adding to it — dropping `typescript`/`unicorn`/`oxc` from that list silently disables their rules.
- **`nodeLinker: hoisted` must be in `pnpm-workspace.yaml`, not `.npmrc`.** pnpm 11 ignores `node-linker` in `.npmrc` outright — `pnpm config get node-linker` reports `undefined` — and the failure is silent: the install succeeds, `node_modules` stays symlinked, and metro then cannot resolve packages that are plainly installed. The expo smoke row asserts the _effect_ (expo at the top of `node_modules`) rather than the setting, because the spelling that does nothing looks identical to the one that works.
- **`allowBuilds` in `pnpm-workspace.yaml`.** pnpm 10+ refuses to run a dependency's postinstall unless it is named, and the symptom is indirect — the package installs, then its binary is missing at build time. `esbuild` is listed for every template because it also arrives transitively (drizzle-kit and tsx each bundle one); `@parcel/watcher` is added with the standalone tailwind toolchain. Note the key is `allowBuilds` on pnpm 11 — `onlyBuiltDependencies` is the pnpm 10 spelling and is silently ignored, with pnpm rewriting the file to add an `allowBuilds` stub rather than erroring.
- **No caret floor may be the newest published patch.** pnpm 11 defaults `minimumReleaseAge` to about a week and refuses anything newer, so `"vite": "^8.2.1"` on the day 8.2.1 ships makes `pnpm install` fail outright — nothing older satisfies the range. `"^8.0.0"` still resolves to the newest allowed version and degrades instead. This applies to expo too, whose whole dependency tree publishes on one day; its range is `~57.0.0`.
- **The generated `.npmrc` is only for pnpm 10.** It enables `pre<name>` hooks so the tailwind templates' `predev` runs. pnpm 11 runs them by default, so its absence is invisible on a current pnpm and breaks the first `dev` on an older one.
- **`pnpm -r --parallel run dev` replaced `concurrently`.** npm ran workspace scripts serially, which is why that dependency existed. Reintroducing a serial fan-out for `dev` would start the API and never reach the web app.
- **Workspace children are scoped, and npm names must be lowercase.** `scope()` in `cli.ts` lowercases the app name; without it `create-tsreact MyApp` emits an invalid `@MyApp/web` manifest.
- **`npm version` must not be run from `packages/cli`.** npm decides whether it is in a git repo with `stat(cwd + "/.git")` (`@npmcli/git`'s `is()`), and `libnpmversion` gates _all_ git behaviour on that one check. A workspace child has no `.git`, so the clean-tree check, the commit and the tag are all skipped and the command degrades to rewriting `version` — which then leaves the tree dirty and `pnpm publish` fails with `ERR_PNPM_GIT_UNCLEAN`. Nothing warns; the bump prints `v0.0.25` and looks like it worked. That is why the release is `scripts/release.mjs` at the root, and why no `release` script lives in `packages/cli` any more.

## `bin/index.js` is committed and auto-generated

The esbuild bundle is tracked in git (`.gitignore` covers `dist`, not `bin`) because it's the published `bin` target. `.husky/pre-commit` runs `pnpm run build`, `git add packages/cli/bin/index.js`, `pnpm exec lint-staged`, then `pnpm run lint`.

Consequences: never hand-edit `bin/index.js` — the hook overwrites it. `packages/cli/bin` is in `ignorePatterns` in **both** `.oxfmtrc.json` and `.oxlintrc.json` so the bundle is neither reformatted nor linted. Committing a `src/` change is sufficient to ship the rebuilt bundle.

Both of those entries are load-bearing for a reason that is easy to miss. For oxfmt: the hook runs `git add packages/cli/bin/index.js` _before_ `lint-staged`, so the bundle is always staged at the moment formatting runs. For oxlint: `lint` takes no path and walks the whole tree, and oxlint's other source of exclusions is `.gitignore` — which deliberately does not cover `bin`.

## Conventions

- Pure ESM (`"type": "module"`). Relative imports must carry explicit `.js` extensions even though sources are `.ts` (NodeNext resolution) — e.g. `import genAppTsx from "./genAppTsx.js"`.
- Linting and formatting are `oxlint` and `oxfmt` — the same pair the modern templates generate, and the reason `.oxlintrc.json` here is a near-copy of `genOxlintrc.ts`'s output. It differs in two ways: no `react` plugin (nothing here is JSX) and `env.node` rather than `env.browser`.
- `unicorn/no-array-sort` is the one rule turned off. It fires on `[...seen].sort()` and on `readdirSync().filter().sort()`, neither of which mutates anything a caller can see, and its suggested `toSorted()` is not in the `ES2022` lib these tsconfigs set — so taking its advice would not compile.
- `.oxfmtrc.json` sets no indentation. oxfmt reads `.editorconfig`, so `indent_size = 4` wins for `*.ts` — which is why sources are 4-space and lint-staged never reformats them to 2. It does set `sortImports`, which groups external packages above relative ones. Run `pnpm format:fix` rather than hand-formatting.
- Formatting is scoped to sources, so Markdown, YAML and the root JSON files are **not** auto-formatted on commit. This file, `README.md` and `supported-stacks.md` are hand-maintained. `supported-stacks.md` is the per-template toolchain reference — package manager, bundler, dev/build commands, output directory, Tailwind delivery — written for whoever is choosing or using a template; the "Nine toolchains" table below is the same ground from the generator side, and the two must be kept in step by hand.

## Publishing

`pnpm run release` from the root, on a clean `main`. That is `node scripts/release.mjs [patch|minor|major]` (default `patch`), which in order: refuses to start unless the branch is `main` (`--any-branch` overrides) and `git status --porcelain` is empty, runs `npm version <bump> --no-git-tag-version` in `packages/cli`, rebuilds the bundle, commits `packages/cli/package.json` + `bin/index.js` as `v<x.y.z>`, tags `v<x.y.z>`, and only then runs `pnpm --filter create-tsreact publish`. So the version in git always matches what is on npm, and nothing bumps the version by hand.

It does **not** push — `git push --follow-tags` is a deliberate manual step. And if the publish fails, the commit and tag already exist: retry with `pnpm --filter create-tsreact publish`, never by re-running `release`, which would bump a second time.

Never `pnpm publish` from the root: the root is `create-tsreact-workspace`, `private: true`, and exists only to hold the workspace, so it fails with `EPRIVATE`. Publishing is always `packages/cli`.

**`prepublishOnly` in `packages/cli` runs `pnpm run build`.** This is the guard against the 0.0.23 failure below — without it, only `.husky/pre-commit` ever rebuilds `bin/index.js`, so any path to `pnpm publish` that does not go through a commit ships whatever bundle happens to be on disk.

There is no `files` field and no `.npmignore`, so publishing ships everything not gitignored (`src/`, `bin/`, configs). This is also why `--version` can read `../package.json` at runtime — the manifest is always in the tarball, and after the split that path resolves to `packages/cli/package.json`.

That same rule is why **`packages/cli/README.md` and `packages/cli/LICENSE` exist as copies** of the root ones: the tarball is packed from `packages/cli`, so the root files are not in it and the npm page would otherwise be blank. The root `README.md` stays canonical and much longer; the copy is the short npm-facing version. When the template table or the flag tables change, update both — nothing checks that they agree.

`@tsreact/bruno` is a `workspace:*` **devDependency**, which `pnpm publish` rewrites to `0.0.0` in the published manifest. Harmless, since consumers never install devDependencies — but see the note at the top of this file about why it must not move to `dependencies`.

**Verify a release against the tarball, not the version number.** `create-tsreact@0.0.23` on npm is a ~20 KB bundle with no template system at all: the version was bumped but the built `bin/index.js` that shipped predates the feature. `npm view create-tsreact@<v> dist.tarball`, then grep the extracted `bin/index.js` for something the release is supposed to contain.

**pnpm's `minimumReleaseAge`** (a built-in default of about a week on pnpm 11) refuses freshly published versions, so `pnpm dlx create-tsreact@latest` fails for the first days after a release. That is also why no generated dependency's caret floor is the newest patch — see genRootPackageJson.ts.

## Out of date

Nothing, as of the oxc migration — the root toolchain is now the one the modern templates generate. `eslint` 8 with legacy config, `@typescript-eslint` 5, and `prettier` 2 are gone in favour of `oxlint` + `oxfmt`; `husky` is 9 (no `husky install`, no `husky.sh` shim) and `lint-staged` is 17; `typescript` is `^7.0.2`.

`@typescript-eslint` 5 is what made this urgent rather than cosmetic: it supports `<5.2.0`, so it printed an unsupported-version banner on every `pnpm lint`, and it was never going to support 7.

Two older entries are also long gone. `esbuild` was 0.15, whose `bin/esbuild` is the raw native binary — pnpm shims it as JS and it fails with a `SyntaxError` full of ELF bytes; it is now `^0.28.1`, matching what the templates generate. And `typescript` is a real devDependency rather than a 4.8.4 that happened to arrive through `tsutils`, because pnpm's isolated linker does not expose transitive dependencies.

**The one artefact that remains is not a dependency at all.** The root `node_modules` still holds `@types/node@18.11.5`, `@types/semver`, `@types/json-schema`, `@eslint/*` and friends as _plain directories_ next to a leftover `node_modules/.package-lock.json` — the residue of an npm install predating the move to pnpm. pnpm never owned them, so no `pnpm install` will ever remove them, and `pnpm why @types/node` reports only the declared `26.1.2`. A fresh clone has none of it. It matters only to a `tsconfig.json` that omits `"types"`, which is the trap described in the package table above; `rm -rf node_modules && pnpm install` clears it for good.
