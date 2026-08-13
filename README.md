### TS/React Scaffolder

Scaffolds a TypeScript/React project in one of two lanes.

The **esbuild lane** — `react`, `extension`, `pwa` — is the original idea: the
entire build is a single `esbuild` command you can read in one line. No config
file, no plugin system, no abstraction to learn before you can change how your
code is compiled.

The **oxc lane** — `vite-spa`, `next-drizzle`, `fastify-react` — is for when
you want the ecosystem rather than the minimalism: Vite 8 (rolldown under it),
Next 16 and Tailwind 4 on by default. This is not an attempt to out-do
`create-vite`; it is Vite as one target among several, so that one command
scaffolds whichever of these you need next.

Both lanes generate TypeScript 7 and React 19, both compose with `--api`, and
**every** template — `expo` included — lints and formats with `oxlint` and
`oxfmt`. No ESLint, no Prettier anywhere. A freshly scaffolded app passes its
own `lint` and `format:check` on the first run; the smoke suite asserts it for
every template.

### Use

```sh
pnpm create tsreact <appname>
cd <appname>
pnpm install
pnpm dev
```

`pnpm dev` starts esbuild's dev server on http://localhost:3000 with live
reload — edit a `.tsx` file and the page reloads itself; edit a `.css` file and
the stylesheet is swapped in place without losing page state.

Generated apps are pnpm workspaces: a private root that holds the lockfile and
the scripts, and one directory per app under `apps/`. The `react` template above
puts everything in `apps/web/`.

```
myapp/
  pnpm-workspace.yaml
  package.json          private root — dev / build / typecheck fan out
  apps/web/             the app
```

npm and bun still work — the CLI reads `npm_config_user_agent` and prints the
commands for whichever one you launched it with, so `npm create tsreact myapp`
tells you to run `npm install` and `npm run dev` instead.

### Templates

| Template          | What you get                                                    |
| ----------------- | --------------------------------------------------------------- |
| `react` (default) | Browser app, dev server with live reload                        |
| `extension`       | Chrome MV3 extension: React popup + content script + worker     |
| `pwa`             | Installable offline app: web manifest + service worker          |
| `expo`            | React Native app on Expo SDK 57 (bundled by metro, not esbuild) |
| `vite-spa`        | React SPA on Vite 8, Tailwind 4, oxlint + oxfmt                 |
| `next-drizzle`    | Next 16 on Turbopack + Drizzle ORM on SQLite/libsql             |
| `fastify-react`   | Workspaces monorepo: Fastify API (rolldown) + React on Vite     |

[`supported-stacks.md`](./supported-stacks.md) has the per-template detail —
which bundler runs, what the dev and build commands are, where the output lands,
and how Tailwind is compiled in each lane.

Two flags add styling to any of the browser templates:

| Flag         | What it does                                             |
| ------------ | -------------------------------------------------------- |
| `--tailwind` | Tailwind CSS v4, compiled by `@tailwindcss/cli`          |
| `--daisyui`  | DaisyUI 5 components on top of it (implies `--tailwind`) |

The last three templates have Tailwind 4 already — their bundler compiles it,
so there is no separate CSS watcher. `--tailwind` is accepted there as a no-op,
and `--daisyui` still adds the plugin on top.

And two more work with any template:

| Flag          | What it does                                                 |
| ------------- | ------------------------------------------------------------ |
| `--api <dir>` | Generates a typed client from a Bruno collection — see below |
| `--husky`     | Adds a pre-commit hook: format staged files, then lint       |

`--husky` writes `.husky/pre-commit` and `.lintstagedrc.json`, and adds a
`prepare` script. Husky installs the hook from that script, so **run `git init`
before installing** — outside a repository husky exits quietly and you get a
hook file that never runs. If you have already installed, `pnpm run prepare`
fixes it.

```sh
pnpm create tsreact myapp
pnpm create tsreact myext --template extension
pnpm create tsreact myapp --template pwa --daisyui
pnpm create tsreact myapp --api ./bruno --api-env local
pnpm create tsreact myapp --template vite-spa
pnpm create tsreact myapp --template next-drizzle
pnpm create tsreact myapp --template fastify-react
pnpm create tsreact .                            # scaffold into the current dir
```

Without a flag nothing changes: the default template's output is still plain
CSS and the same eleven packages.

**Careful with `npm create`:** npm swallows flags it doesn't recognise, so
options have to go after a `--` separator. `pnpm create`, `pnpm dlx` and `npx`
forward them as-is and need no separator.

```sh
npm create tsreact@latest myext -- --template extension   # note the --
pnpm create tsreact myext --template extension            # no -- needed
npx create-tsreact myext --template extension             # no -- needed
```

To see the templates without the rest of `--help`:

```sh
pnpm create tsreact --list-templates
pnpm create tsreact --list-templates --json   # machine-readable
```

Other options: `--help` / `-h`, `--version` / `-v`.

### The extension template

This is the one case where the "just an esbuild command" approach beats a
general-purpose bundler outright. All three entry points build in a single
command:

```sh
esbuild src/popup.tsx src/content.ts src/background.ts --bundle --outdir=public \
    --format=iife --platform=browser --target=es2022 --minify
```

`--format=iife` rather than `esm`, because MV3 content scripts cannot be ES
modules at all. Two things follow from that: top-level await is rejected by
esbuild, and code is not shared between the three bundles (`--splitting` is
esm-only).

`apps/extension/public/` is the extension root — that is the folder to pick in
`chrome://extensions` → Developer mode → Load unpacked, not the project root.

There is no dev server for extensions; `pnpm dev` watches and rebuilds, and
you press the reload button on `chrome://extensions` to pick changes up.

### The pwa template

The react template plus the four files that make a web app installable: a web
manifest, an icon, a service worker, and a second `tsconfig.json` for it.

The worker is a second esbuild entry point, built as a classic script:

```sh
esbuild src/sw.ts --bundle --outfile=public/sw.js --format=iife \
    --platform=browser --target=es2022 --minify
```

`--format=iife` rather than `esm` because a module service worker has to be
registered with `{ type: "module" }`, which is not supported everywhere.

`src/sw.ts` is excluded from `tsconfig.json` and type-checked by
`tsconfig.sw.json` instead, which is why `pnpm typecheck` runs `tsc` twice.
The reason is a lib clash: `ServiceWorkerGlobalScope`, `FetchEvent` and
`ExtendableEvent` live in `lib.webworker.d.ts`, which TypeScript will not load
alongside `DOM` — and `app.tsx` needs `DOM`.

The worker is deliberately **not registered on localhost**. It caches
cache-first, so in dev it would serve a stale bundle and fight esbuild's live
reload. To exercise it, run `pnpm build` and serve `apps/web/public/` over https.

**About the icons.** Chrome will not offer to install a PWA without raster
icons, so the template ships four: `icon.svg`, `icon-192.png`, `icon-512.png`
and a maskable `icon-maskable-512.png` for Android launchers that crop to a
shape. That is everything Chrome's installability check asks for.

The PNGs are _generated_, not copied — `packages/png/src/png.ts` is a ~60-line
PNG encoder built on `node:zlib`, and `icon.ts` beside it draws an identicon whose
colour and pattern come from a hash of the app name. So every app gets a
distinct icon, the same name always produces the same icon, and the repo still
contains no binary assets. Replace them with real artwork when you have some.

Chrome's _richer_ install dialog additionally wants `screenshots`, which are
photographs of your app and so cannot be generated here.

### Styling with Tailwind

`--tailwind` and `--daisyui` work with `react`, `pwa` and `extension`. Tailwind
v4 is configured in CSS, so there is no `tailwind.config.js` — you edit
`apps/web/src/styles.css` (or `apps/extension/src/styles.css`), which starts
as `@import "tailwindcss";`.

The compiled stylesheet is chained _through_ esbuild rather than written
straight into `public/`:

```
src/styles.css  --tailwindcss-->  src/app.css  --imported by app.tsx-->  esbuild  -->  public/app.css
```

(all four paths relative to the app, so `apps/web/` for react and pwa.)

That ordering is deliberate. esbuild's `/esbuild` event stream only reports its
own build outputs, so a `public/app.css` written behind its back would never
fire a `change` event and the live-reload stylesheet swap would silently stop
working. Routing through `src/app.css` keeps the CSS inside esbuild's import
graph, and leaves `app.tsx`, `index.html` and the esbuild command untouched.

The consequence is that **`src/app.css` is generated, and gitignored** — edit
`src/styles.css` instead.

Tailwind runs as its own watcher, so development takes two terminals:

```sh
pnpm tw     # terminal 1: src/styles.css -> src/app.css
pnpm dev    # terminal 2: the esbuild dev server
```

There is no dependency-free, cross-platform way to run two watchers from one
pnpm script, and adding `concurrently` to a project whose pitch is its
dependency count seemed like the wrong trade. `pnpm build` needs no second
terminal — it runs both in sequence. (`pnpm dev` on its own still works: a
`predev` script compiles the stylesheet once first — which is what the
generated `.npmrc` is for, since pnpm 10 skips `pre<name>` hooks by default.)

### The expo template

The odd one out: no esbuild anywhere. Expo bundles with metro, so this template
exists because a React Native app is a shape Vite does not cover either — not
because esbuild helps.

It mirrors the published `expo-template-blank-typescript`, which is what
`npx create-expo-app --template blank-typescript` writes: `package.json`,
`app.json`, `tsconfig.json`, `index.ts`, `App.tsx` and a `.gitignore`. As of
SDK 57 neither `babel.config.js` nor `metro.config.js` is needed.

```sh
pnpm install
pnpm start
```

Two things are intentionally different from the other templates. The
dependency versions are **exact pins, not caret ranges** — Expo ties `react`
and `react-native` to the SDK, and `react-native@latest` is already ahead of
what SDK 57 accepts, so a range would produce an install metro refuses to
bundle. And `typescript` is `~6.0.3` rather than `^7`, matching what
`expo/tsconfig.base` is written against.

Those pins have a shelf life. After an SDK release, run:

```sh
pnpm --filter './apps/mobile' exec expo install --fix
```

The template also ships no images, since this scaffolder writes only text —
`app.json` therefore omits `icon`, `splash` and `adaptiveIcon`, and Expo falls
back to its own defaults.

### The vite-spa template

A React single-page app on Vite 8.

```sh
pnpm create tsreact myapp --template vite-spa
cd myapp && pnpm install && pnpm dev
```

Vite 8 depends on Rolldown directly, so there is nothing to opt into — no
`"vite": "npm:rolldown-vite@..."` alias, which is the Vite 7 recipe and would
now downgrade the bundler. For the same reason the React plugin is
`@vitejs/plugin-react`, not `@vitejs/plugin-react-oxc`: oxc is already Vite 8's
transform, and the `-oxc` package peers on Vite 6/7 only.

Differences from the `react` template beyond the bundler:

- `index.html` sits at the project root, not in `public/`. Vite treats it as a
  build input and rewrites the script tag; anything in `public/` is copied
  through untouched.
- The entry is split into `src/main.tsx` (mounts) and `src/App.tsx` (renders).
  Vite's Fast Refresh only swaps a module that exports components and nothing
  else, so a file that also calls `createRoot` would force a full reload on
  every edit.
- Tailwind is compiled by `@tailwindcss/vite` in-process. There is no `pnpm tw`
  watcher and no `postcss.config.*`.
- `pnpm build` runs `tsc --noEmit` first. Vite transpiles with oxc and never
  type-checks, so without that the only thing between a type error and
  production is your editor.
- Linting and formatting are `oxlint` and `oxfmt` — as they are in every
  template now, not just this lane.

### The next-drizzle template

Next.js 16 with a real database layer.

```sh
pnpm create tsreact myapp --template next-drizzle
cd myapp && pnpm install && pnpm db:push && pnpm dev
```

`db:push` creates `local.db` from `src/db/schema.ts`, and the home page is an
async server component that reads it. Nothing else is required to get a running
app — `src/db/index.ts` and `drizzle.config.ts` both fall back to
`file:./local.db` when `DB_FILE_NAME` is unset, so there is no `.env` to write
first. `.env.example` documents pointing the same variables at Turso.

| Script                          | What it does                       |
| ------------------------------- | ---------------------------------- |
| `db:push`                       | schema straight into the database  |
| `db:generate` then `db:migrate` | versioned migrations in `drizzle/` |
| `db:studio`                     | Drizzle's browser UI               |

Turbopack is the default for both `next dev` and `next build` in Next 16, so
there is no `--turbopack` flag in the scripts. Two consequences worth knowing:

- **Do not add a `webpack` key to `next.config.ts`.** Next refuses to build
  rather than silently ignoring a config it cannot honour. Turbopack's own
  escape hatch is the `turbopack` key.
- Tailwind goes through `@tailwindcss/postcss`, not `@tailwindcss/vite` — there
  is no Turbopack equivalent of the Vite plugin.

The generated `tsconfig.json` is already the version Next settles on, so the
first `next dev` reports no changes and leaves no diff. (Next does write an
`AGENTS.md` and `CLAUDE.md` on first run; that is its own default, and
`agentRules: false` in `next.config.ts` turns it off.)

### The fastify-react template

A Fastify API and a React client in one npm-workspaces repository.

```sh
pnpm create tsreact myapp --template fastify-react
cd myapp && pnpm install && pnpm dev
```

```
myapp/
  package.json        workspaces, shared lockfile, oxlint + oxfmt
  apps/server/        Fastify 5, bundled by rolldown
  apps/web/           the vite-spa template, as a workspace
```

`pnpm dev` starts both — the web app on :3000 and the API on :3001 — with
`pnpm -r --parallel run dev`, which prefixes each line with the package it came
from. There is no `concurrently` dependency: npm needed one because it runs
workspace scripts _serially_, so a fan-out would start the API and never reach
the client. Vite proxies `/api` to the second process, so the browser only ever
talks to :3000.

Install at the root, not inside `apps/` — the workspace shares one lockfile.

The server builds to a single `apps/server/dist/index.js` with its runtime
dependencies left **external**. That is deliberate: Fastify resolves plugin
metadata by identity at registration time, and inlining it produces failures at
runtime rather than at build.

With `--api`, the generated client lands in `apps/web/src/api/` rather than in
the server workspace — it is consumed by the browser half. The collection and
`api/samples.json` stay at the workspace root, and `pnpm api:gen` works from
there.

### Typed API clients from a Bruno collection

Most projects already describe their backend somewhere machine-readable, and for
a lot of teams that somewhere is a [Bruno](https://usebruno.com) collection: plain
text, in the repo, in version control. Unlike an OpenAPI document, it is
_executable_ — so it can be used to find out what the API really returns rather
than what someone wrote down.

```sh
pnpm create tsreact myapp --api ./bruno --api-env local
```

That reads the collection, runs its requests once, and infers TypeScript types
from the actual responses:

```
myapp/
  api/
    bruno.json              copied from your collection
    users/list.bru
    samples.json            the responses that were captured
  apps/web/src/api/         (the app that consumes it; apps/mobile for expo)
    types.ts                inferred from samples.json
    client.ts               fetch, error handling
    keys.ts                 query keys
    queries.ts              queryOptions per GET
    mutations.ts            hooks per POST/PUT/PATCH/DELETE
    config.ts               base url + token — yours to edit
```

```tsx
import { useQuery } from "@tanstack/react-query";
import { listUsersQuery, useCreateUser } from "./api";

const { data, isPending, error } = useQuery(listUsersQuery({ page: 1 }));
const createUser = useCreateUser();
```

`data` is typed from what the server sent. A key that was missing from one array
element comes out optional, a field that was once `null` comes out as a union,
and an endpoint that wasn't sampled is honestly typed `unknown` rather than
guessed at.

**Only `GET` and `HEAD` are executed.** Scaffolding an app must not POST to a
real API as a side effect. Pass `--api-sample=all` to sample mutations too, or
`--api-sample=none` to skip the network entirely.

**Regenerating.** The collection travels with the app, so when the API changes:

```sh
pnpm api:gen            # replays api/samples.json — works offline
pnpm api:gen --refresh  # re-runs the requests against the live API
```

(pnpm 11 refuses packages published in the last week by default, so
`pnpm dlx create-tsreact@latest` can fail right after a release. `--config
.minimumReleaseAge=0` overrides it if you need the newest build immediately.)

Because the captured responses are committed, regeneration is deterministic and
reviewable: a teammate with no credentials gets byte-identical output, and a
change in the API shows up as a diff in `samples.json` next to the diff in
`types.ts`. `config.ts` is the one file regeneration leaves alone — it
holds your base URL and token.

**Two things worth knowing.** `api/samples.json` contains real response bodies;
read it before committing if the endpoint returns personal data. And nothing
that could be a credential is ever written into the generated code — Bruno keeps
secret _values_ outside the `.bru` files, `Authorization` headers are stripped
from the emitted client, and the sampler resolves secrets from the environment
at generation time and drops them.

With the `extension` template the collection's origins are also added to
`manifest.json` as `host_permissions`, without which MV3 blocks the fetch and
reports it as an opaque network error.

### Motivation

Some scaffolders/generators create quite a lot of files, both project files and
dependencies. Look at the size of `node_modules` after using some of the popular
ones... While that potentially expands available functionality, it makes it
harder for people to learn/understand things and focus on the technology.

So, I wanted a scaffolder for React/TypeScript projects with an absolute minimum
of code/files/dependencies and a fast bundler (`esbuild`). As learning goes on,
people can add complexity themselves.

This scaffolder should be:

- fast to run itself
- fast for `pnpm install` — the react template installs 11 packages
- easy to review/understand created files
- fast to compile/bundle, because esbuild is

Generated projects depend on `react`, `react-dom`, `esbuild`, `typescript` and
the matching `@types` packages, plus `oxlint` and `oxfmt` at the workspace root.
`typescript` is the largest of them; it is there because a `tsconfig.json` with
no compiler to run it is not much of a TypeScript setup — `pnpm typecheck` runs
`tsc --noEmit`.

For Visual Studio Code, the oxc extension covers both:
https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode

From the CLI:

- `pnpm lint`
- `pnpm format:check`
- `pnpm format:fix`

While being light-weight, it still gives you a working environment for
React/TypeScript!

Feel free to report any issues or ask for features at Github Issues:
https://github.com/ngmaibulat/create-tsreact/issues

### Building

This section is about the esbuild lane. The `vite-spa`, `next-drizzle` and
`fastify-react` templates build with Vite, Turbopack and rolldown respectively —
see their sections above.

Building is done via `esbuild`. Here is the command behind `pnpm build` in a
generated react app — it lives in `apps/web/package.json`, and the root `build`
script just fans out to it with `pnpm -r run build`. As you see, it targets
`es2022`, so you can use all the modern stuff like top-level await. If required,
adjust the options in the scripts section of `apps/web/package.json`.

```sh
esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser \
    --target=es2022 --minify --sourcemap
```

`--minify` matters for more than file size: esbuild only defines
`process.env.NODE_ENV` as `"production"` when every minify option is on, so
dropping it means shipping React's development build. `pnpm dev` uses the
same command with `--sourcemap --watch --serve` instead.
