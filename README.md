### TS/React Scaffolder using esbuild compiler/bundler

Scaffolds a TypeScript/React project whose entire build is a single `esbuild`
command you can read in one line. No config file, no plugin system, no
abstraction to learn before you can change how your code is compiled.

### Use

```sh
npm create tsreact@latest <appname>
cd <appname>
npm install
npm run dev
```

`npm run dev` starts esbuild's dev server on http://localhost:3000 with live
reload — edit a `.tsx` file and the page reloads itself; edit a `.css` file and
the stylesheet is swapped in place without losing page state.

### Templates

| Template          | What you get                                                    |
| ----------------- | --------------------------------------------------------------- |
| `react` (default) | Browser app, dev server with live reload                        |
| `extension`       | Chrome MV3 extension: React popup + content script + worker     |
| `pwa`             | Installable offline app: web manifest + service worker          |
| `expo`            | React Native app on Expo SDK 57 (bundled by metro, not esbuild) |

Two flags add styling to any of the browser templates:

| Flag         | What it does                                             |
| ------------ | -------------------------------------------------------- |
| `--tailwind` | Tailwind CSS v4, compiled by `@tailwindcss/cli`          |
| `--daisyui`  | DaisyUI 5 components on top of it (implies `--tailwind`) |

And one adds a typed backend client to any template:

| Flag          | What it does                                                 |
| ------------- | ------------------------------------------------------------ |
| `--api <dir>` | Generates a typed client from a Bruno collection — see below |

```sh
npx create-tsreact myapp
npx create-tsreact myext --template extension
npx create-tsreact myapp --template pwa --daisyui
npx create-tsreact myapp --api ./bruno --api-env local
npx create-tsreact .                            # scaffold into the current dir
```

Without a flag nothing changes: the default output is still plain CSS and the
same eleven packages.

**Careful with `npm create`:** npm swallows flags it doesn't recognise, so
options have to go after a `--` separator. With `npx` they don't.

```sh
npm create tsreact@latest myext -- --template extension   # note the --
npx create-tsreact myext --template extension             # no -- needed
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

`public/` is the extension root — that is the folder to pick in
`chrome://extensions` → Developer mode → Load unpacked, not the project root.

There is no dev server for extensions; `npm run dev` watches and rebuilds, and
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
`tsconfig.sw.json` instead, which is why `npm run typecheck` runs `tsc` twice.
The reason is a lib clash: `ServiceWorkerGlobalScope`, `FetchEvent` and
`ExtendableEvent` live in `lib.webworker.d.ts`, which TypeScript will not load
alongside `DOM` — and `app.tsx` needs `DOM`.

The worker is deliberately **not registered on localhost**. It caches
cache-first, so in dev it would serve a stale bundle and fight esbuild's live
reload. To exercise it, run `npm run build` and serve `public/` over https.

**About the icons.** Chrome will not offer to install a PWA without raster
icons, so the template ships four: `icon.svg`, `icon-192.png`, `icon-512.png`
and a maskable `icon-maskable-512.png` for Android launchers that crop to a
shape. That is everything Chrome's installability check asks for.

The PNGs are _generated_, not copied — `src/png.ts` is a ~60-line PNG encoder
built on `node:zlib`, and `src/genIconPng.ts` draws a mirrored identicon whose
colour and pattern come from a hash of the app name. So every app gets a
distinct icon, the same name always produces the same icon, and the repo still
contains no binary assets. Replace them with real artwork when you have some.

Chrome's _richer_ install dialog additionally wants `screenshots`, which are
photographs of your app and so cannot be generated here.

### Styling with Tailwind

`--tailwind` and `--daisyui` work with `react`, `pwa` and `extension`. Tailwind
v4 is configured in CSS, so there is no `tailwind.config.js` — you edit
`src/styles.css`, which starts as `@import "tailwindcss";`.

The compiled stylesheet is chained _through_ esbuild rather than written
straight into `public/`:

```
src/styles.css  --tailwindcss-->  src/app.css  --imported by app.tsx-->  esbuild  -->  public/app.css
```

That ordering is deliberate. esbuild's `/esbuild` event stream only reports its
own build outputs, so a `public/app.css` written behind its back would never
fire a `change` event and the live-reload stylesheet swap would silently stop
working. Routing through `src/app.css` keeps the CSS inside esbuild's import
graph, and leaves `app.tsx`, `index.html` and the esbuild command untouched.

The consequence is that **`src/app.css` is generated, and gitignored** — edit
`src/styles.css` instead.

Tailwind runs as its own watcher, so development takes two terminals:

```sh
npm run tw     # terminal 1: src/styles.css -> src/app.css
npm run dev    # terminal 2: the esbuild dev server
```

There is no dependency-free, cross-platform way to run two watchers from one
npm script, and adding `concurrently` to a project whose pitch is its
dependency count seemed like the wrong trade. `npm run build` needs no second
terminal — it runs both in sequence. (`npm run dev` on its own still works: a
`predev` script compiles the stylesheet once first.)

### The expo template

The odd one out: no esbuild anywhere. Expo bundles with metro, so this template
exists because a React Native app is a shape Vite does not cover either — not
because esbuild helps.

It mirrors the published `expo-template-blank-typescript`, which is what
`npx create-expo-app --template blank-typescript` writes: `package.json`,
`app.json`, `tsconfig.json`, `index.ts`, `App.tsx` and a `.gitignore`. As of
SDK 57 neither `babel.config.js` nor `metro.config.js` is needed.

```sh
npm install
npx expo start
```

Two things are intentionally different from the other templates. The
dependency versions are **exact pins, not caret ranges** — Expo ties `react`
and `react-native` to the SDK, and `react-native@latest` is already ahead of
what SDK 57 accepts, so a range would produce an install metro refuses to
bundle. And `typescript` is `~6.0.3` rather than `^7`, matching what
`expo/tsconfig.base` is written against.

Those pins have a shelf life. After an SDK release, run:

```sh
npx expo install --fix
```

The template also ships no images, since this scaffolder writes only text —
`app.json` therefore omits `icon`, `splash` and `adaptiveIcon`, and Expo falls
back to its own defaults.

### Typed API clients from a Bruno collection

Most projects already describe their backend somewhere machine-readable, and for
a lot of teams that somewhere is a [Bruno](https://usebruno.com) collection: plain
text, in the repo, in version control. Unlike an OpenAPI document, it is
_executable_ — so it can be used to find out what the API really returns rather
than what someone wrote down.

```sh
npx create-tsreact myapp --api ./bruno --api-env local
```

That reads the collection, runs its requests once, and infers TypeScript types
from the actual responses:

```
myapp/
  api/
    bruno.json              copied from your collection
    users/list.bru
    samples.json            the responses that were captured
  src/api/
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
npm run api:gen              # replays api/samples.json — works offline
npm run api:gen -- --refresh # re-runs the requests against the live API
```

Because the captured responses are committed, regeneration is deterministic and
reviewable: a teammate with no credentials gets byte-identical output, and a
change in the API shows up as a diff in `samples.json` next to the diff in
`types.ts`. `src/api/config.ts` is the one file regeneration leaves alone — it
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
- fast for `npm install` — the react template installs 11 packages
- easy to review/understand created files
- fast to compile/bundle, because esbuild is

Generated projects depend on `react`, `react-dom`, `esbuild`, `typescript`,
`prettier` and the matching `@types` packages. `typescript` is the largest of
them; it is there because a `tsconfig.json` with no compiler to run it is not
much of a TypeScript setup — `npm run typecheck` runs `tsc --noEmit`.

For Visual Studio Code, the Prettier extension is recommended:
https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode

You can also use prettier from the CLI:

- `npm run format:check`
- `npm run format:fix`

While being light-weight, it still gives you a working environment for
React/TypeScript!

Feel free to report any issues or ask for features at Github Issues:
https://github.com/ngmaibulat/create-tsreact/issues

### Building

Building is done via `esbuild`. Here is the command behind `npm run build` in a
generated react app. As you see, it targets `es2022`, so you can use all the
modern stuff like top-level await. If required, adjust the options in the
scripts section of `package.json`.

```sh
esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser \
    --target=es2022 --minify --sourcemap
```

`--minify` matters for more than file size: esbuild only defines
`process.env.NODE_ENV` as `"production"` when every minify option is on, so
dropping it means shipping React's development build. `npm run dev` uses the
same command with `--sourcemap --watch --serve` instead.
