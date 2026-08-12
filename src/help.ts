import chalk from "chalk";

import { DESCRIPTIONS, TEMPLATES } from "./cli.js";
import type { Opts } from "./cli.js";

//error path: no app name was given
export function usage() {
    console.log("\n");
    console.log(chalk.redBright("Please provide appname\n"));
    console.log(chalk.yellowBright("Usage:"));
    console.log(chalk.yellowBright("\tnpm create tsreact <appname>"));
    console.log(chalk.yellowBright("\tnpm init tsreact   <appname>"));
    console.log(chalk.yellowBright("\tnpx create-tsreact <appname>"));
    console.log(chalk.yellowBright("\nRun with --help for options"));
    console.log("\n");
}

export function help(version: string) {
    //rendered from TEMPLATES so the list cannot drift as templates are added
    const names = TEMPLATES.map((t) => (t === "react" ? `${t} (default)` : t));
    const list = TEMPLATES.map(
        (t) => `    ${t.padEnd(11)} ${DESCRIPTIONS[t]}`
    ).join("\n");

    const msg =
        chalk.yellowBright(`\ncreate-tsreact ${version}\n`) +
        chalk.greenBright(`
Scaffold a TypeScript/React app built by a single esbuild command.

Usage:
    npx create-tsreact <appname> [options]
    npx create-tsreact api                  (inside a generated app)

Options:
    -t, --template <name>   ${names.join(" | ")}
        --tailwind          add Tailwind CSS v4
        --daisyui           add DaisyUI components (implies --tailwind)
        --api <dir>         generate a typed client from a Bruno collection
        --api-env <name>    which environments/<name>.bru to resolve vars from
        --api-sample <how>  safe (default) | all | none - see below
        --refresh           re-run the requests instead of replaying samples
    -h, --help              show this help
    -v, --version           show the version

Templates:
${list}

The --api flag reads a Bruno collection, runs its requests once, and infers
TypeScript types from what the API actually returned. You get a typed client,
TanStack Query options and mutation hooks under src/api/, and the captured
responses in api/samples.json. The collection is copied into the app, so
"npm run api:gen" can regenerate later without the network.

Only GET and HEAD are executed by default: scaffolding an app must not POST to
a real API. Pass --api-sample=all to sample mutations too, or =none to skip the
network entirely and type every response as unknown.

Examples:
    npx create-tsreact myapp
    npx create-tsreact myext --template extension
    npx create-tsreact myapp --template pwa --daisyui
    npx create-tsreact myapp --api ./bruno --api-env local
    npx create-tsreact .

npm swallows unknown flags, so with "npm create" / "npm init" the options
must go after a "--" separator:

    npm create tsreact@latest myext -- --template extension
`);

    console.log(msg);
}

//with --tailwind the stylesheet is compiled by a second watcher, which has to
//run in its own terminal - there is no dependency-free, windows-portable way
//to start two watchers from one npm script
function tailwindNote(o: Opts) {
    if (!o.tailwind) {
        return "";
    }

    return (
        chalk.yellowBright(`\nTailwind runs as a second watcher:`) +
        chalk.greenBright(`
    npm run tw      (leave this running in its own terminal)
    `)
    );
}

//api/samples.json holds real response bodies. That is the point - it is what
//makes regeneration deterministic and reviewable - but it also means anyone
//sampling a production endpoint has just written live data into a file headed
//for git, and they should hear that once, loudly, rather than find out later.
function apiNote(o: Opts) {
    if (!o.api) {
        return "";
    }

    const sampled = Object.values(o.api.samples).filter(
        (s) => !("skipped" in s)
    ).length;
    const total = o.api.endpoints.length;

    return (
        chalk.yellowBright(`\nAPI client:`) +
        chalk.greenBright(`
    ${total} endpoint(s) from ${o.api.collection}, ${sampled} sampled
    src/api/       generated - "npm run api:gen" rewrites it
    src/api/config.ts  base url and token, yours to edit and kept on regen
    `) +
        chalk.yellowBright(
            `\nNote: api/samples.json contains real response bodies captured from the\nAPI. Read it before committing if that endpoint returns personal data.\n`
        )
    );
}

export function steps(name: string, o: Opts) {
    //name is the path relative to cwd, so "." means we scaffolded in place
    const cd = name === "." ? "" : `\n    cd ${name}`;
    const dir = name === "." ? "public" : `${name}/public`;

    if (o.template === "extension") {
        const msg =
            chalk.yellowBright(`\nFurther steps:`) +
            chalk.greenBright(`${cd}
    npm install
    npm run build
    `) +
            tailwindNote(o) +
            apiNote(o) +
            chalk.yellowBright(`\nThen load it in Chrome:`) +
            chalk.greenBright(`
    1. open chrome://extensions
    2. enable Developer mode
    3. "Load unpacked" and select ${dir}
    `) +
            chalk.yellowBright(
                `\nNote: select the public/ folder, not the project root - the manifest lives there.\n`
            );

        console.log(msg);
        return;
    }

    if (o.template === "expo") {
        const msg =
            chalk.yellowBright(`\nFurther steps:`) +
            chalk.greenBright(`${cd}
    npm install
    npx expo start
    `) +
            apiNote(o) +
            chalk.yellowBright(
                `\nNote: the dependency versions are pinned to Expo SDK 57. After an SDK\nbump, run "npx expo install --fix" to realign them.\n`
            );

        console.log(msg);
        return;
    }

    if (o.template === "pwa") {
        const msg =
            chalk.yellowBright(`\nFurther steps:`) +
            chalk.greenBright(`${cd}
    npm install
    npm run dev
    `) +
            tailwindNote(o) +
            apiNote(o) +
            chalk.yellowBright(`\nNote on the service worker:`) +
            chalk.greenBright(`
    it is not registered on localhost, where it would serve a stale bundle
    and fight live reload. Run "npm run build" and serve public/ over https
    to exercise it.
    `) +
            chalk.yellowBright(
                `\nThe icons in public/ are generated from the app name - replace them\nwith your own artwork when you have some.\n`
            );

        console.log(msg);
        return;
    }

    const msg =
        chalk.yellowBright(`\nFurther steps:`) +
        chalk.greenBright(`${cd}
    npm install
    npm run dev
    `) +
        tailwindNote(o) +
        apiNote(o);

    console.log(msg);
}
