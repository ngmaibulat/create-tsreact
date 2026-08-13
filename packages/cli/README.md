### TS/React Scaffolder

Scaffolds a TypeScript/React project in one of two lanes.

The **esbuild lane** — `react`, `extension`, `pwa` — is the original idea: the
entire build is a single `esbuild` command you can read in one line. No config
file, no plugin system, no abstraction to learn before you can change how your
code is compiled.

The **oxc lane** — `vite-spa`, `next-drizzle`, `fastify-react` — is for when
you want the ecosystem rather than the minimalism: Vite 8, Next 16, Tailwind 4
on by default, and oxlint + oxfmt instead of ESLint + Prettier.

Both lanes generate TypeScript 7 and React 19, and both compose with `--api`.

### Use

```sh
pnpm create tsreact <appname>
cd <appname>
pnpm install
pnpm dev
```

Generated apps are pnpm workspaces: a private root that holds the lockfile and
the scripts, and one directory per app under `apps/`. npm and bun work too —
the CLI reads `npm_config_user_agent` and prints the commands for whichever one
you launched it with.

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

Two flags add styling to any of the browser templates:

| Flag         | What it does                                             |
| ------------ | -------------------------------------------------------- |
| `--tailwind` | Tailwind CSS v4, compiled by `@tailwindcss/cli`          |
| `--daisyui`  | DaisyUI 5 components on top of it (implies `--tailwind`) |

The last three templates have Tailwind 4 already — their bundler compiles it,
so there is no separate CSS watcher. `--tailwind` is accepted there as a no-op,
and `--daisyui` still adds the plugin on top.

And one adds a typed backend client to any template:

| Flag          | What it does                                                 |
| ------------- | ------------------------------------------------------------ |
| `--api <dir>` | Generates a typed client from a Bruno collection — see below |

`--api` reads a [Bruno](https://www.usebruno.com/) collection, executes its safe
requests once, infers TypeScript types from the real responses, and emits a
TanStack Query client. The samples are committed, so regeneration is
deterministic and works offline.

```sh
pnpm create tsreact myapp
pnpm create tsreact myext --template extension
pnpm create tsreact myapp --template pwa --daisyui
pnpm create tsreact myapp --api ./bruno --api-env local
pnpm create tsreact myapp --template vite-spa
pnpm create tsreact .                            # scaffold into the current dir
```

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

### Full documentation

Per-template details, the `--api` pipeline and the build commands are in the
[GitHub README](https://github.com/ngmaibulat/create-tsreact#readme).

MIT © Aibulat
