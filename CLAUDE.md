# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run build         # esbuild src/index.ts -> bin/index.js (single bundled ESM file)
npm run build-watch   # same, with --watch
npm run lint          # npx eslint src
npm run format:check  # npx prettier src --check
npm run format:fix    # npx prettier src --write
```

There are no tests — `npm test` is the npm-init placeholder that exits 1. There is no test runner, no `__tests__/`, and no CI (`.github/` does not exist).

`tsc` is never run by any script. esbuild transpiles without type-checking, so `tsconfig.json` only serves the editor. To actually type-check, run `npx tsc --noEmit` (do not run plain `tsc` — `outDir` is `./bin` and it would collide with the esbuild bundle).

Manual smoke test of the CLI:

```sh
npm run build && node bin/index.js myapp && cd myapp && npm install && npm run dev
```

## Architecture

`src/index.ts` is the entire CLI — a top-level script with no `main()`, run via the `#!/usr/bin/env node` shebang that esbuild preserves into the bundle. Flow:

1. Read `process.argv[2]` as the app name; if absent, print `usage()` and exit.
2. Bail if a directory with that name already exists.
3. `mkdir` `<appname>/`, `<appname>/src/`, `<appname>/public/` (relative to `process.cwd()`).
4. Call each `gen*` function and `fs.writeFileSync` its returned string.
5. Print next steps via `steps()`.

Arg parsing is manual — no commander/yargs, no flags, no prompts. `chalk` is the only runtime dependency; everything else is `node:fs`.

### Templates are code, not files

There is no `templates/` directory and nothing is read from disk at runtime. Each generated file comes from one `src/gen*.ts` module exporting a default function that returns a template-literal string, optionally interpolating the app name:

```ts
export default function genFoo(name?: string) {
  const tpl = `...`;
  return tpl;
}
```

`genPackageJson` `genIndexHtml` `genAppTsx` `genTsConfig` `genGitIgnore` `genAppCss` `genEditorConfig` `genPrettierConfig` → `package.json`, `public/index.html`, `src/app.tsx`, `tsconfig.json`, `.gitignore`, `public/app.css`, `.editorconfig`, `.prettierrc.json`.

This design sidesteps npm packaging problems: npm renames a packed `.gitignore` to `.npmignore`, and a nested `templates/package.json` confuses tooling. Generating them as strings avoids both. Keep it that way — don't introduce a `templates/` directory.

**Adding a generated file** is three touches: create `src/genX.ts`, import it at the top of `src/index.ts`, and add a `content = genX(...); fs.writeFileSync(...)` pair in the body.

**Changing what generated apps depend on** (React, esbuild versions) means editing the string literal in `src/genPackageJson.ts` — those versions are hardcoded, not derived. Bump them deliberately; nothing else in the repo tracks them.

### Two toolchains — don't confuse them

|          | This CLI                                                      | Apps it generates                                       |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Entry    | `src/index.ts`                                                | `src/app.tsx`                                           |
| esbuild  | `--platform=node --format=esm --target=es2022`, out to `bin/` | `--platform=browser --target=es2022`, out to `public/`  |
| tsconfig | `lib: ES2022`, `outDir: ./bin`                                | `jsx: react-jsx`, DOM libs, `noEmit`, `isolatedModules` |

The README's "Building" section shows the _generated app's_ build command, not this repo's.

## `bin/index.js` is committed and auto-generated

The esbuild bundle is tracked in git (`.gitignore` covers `dist`, not `bin`) because it's the published `bin` target. `.husky/pre-commit` runs `npm run build`, `git add bin/index.js`, `npx lint-staged`, then `npx eslint src`.

Consequences: never hand-edit `bin/index.js` — the hook overwrites it. `bin/**` is in `.prettierignore` so the bundle isn't reformatted. Committing a `src/` change is sufficient to ship the rebuilt bundle.

## Conventions

- Pure ESM (`"type": "module"`). Relative imports must carry explicit `.js` extensions even though sources are `.ts` (NodeNext resolution) — e.g. `import genAppTsx from "./genAppTsx.js"`.
- ESLint uses the legacy `.eslintrc.json` format (ESLint 8), not flat config.
- `.prettierrc.json` is `{}` (all defaults, 2-space) while `.editorconfig` asks for 4-space in `.ts` files, and existing sources use 4. Prettier wins on staged files via lint-staged, so don't fight it.
- Every template literal opens on the line before its content, so **all generated files begin with a blank line**. Preserve the pattern when editing existing generators.

## Publishing

There is no `files` field and no `.npmignore`, so `npm publish` ships everything not gitignored (`src/`, `bin/`, configs, `package-lock.json`). Version bumps are manual `npm version` commits — the git log is a series of bare version-number commit messages.
