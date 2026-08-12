import fs from "fs";
import path from "path";

import { SAMPLE_MODES } from "./bruno/spec.js";
import type { ApiSpec, SampleMode } from "./bruno/spec.js";

//the array is the source of truth and Template is derived from it, so the
//two cannot drift - and --help renders from the same array
export const TEMPLATES = ["react", "extension", "pwa", "expo"] as const;

export type Template = typeof TEMPLATES[number];

//expo builds with metro, not esbuild, so anything keyed on esbuild output
//deliberately excludes it - see OUTPUT in genGitIgnore.ts
export type BrowserTemplate = Exclude<Template, "expo">;

//one line each, rendered into --help so the list cannot drift from TEMPLATES
export const DESCRIPTIONS: Record<Template, string> = {
    react: "browser app, esbuild dev server with live reload",
    extension: "Chrome MV3 extension: popup + content script + background",
    pwa: "installable offline app: manifest + service worker",
    expo: "React Native app on Expo SDK 57 (metro, not esbuild)",
};

//what a preset returns: relative path -> contents. Almost everything is a
//string; a Buffer is the escape hatch for the pwa's png icons, which cannot
//be expressed as text and are generated rather than checked in.
export type Files = Record<string, string | Buffer>;

//everything a preset needs. generators that only depend on the app name keep
//taking a plain string; only the ones that actually branch take Opts.
export type Opts = {
    name: string;
    template: Template;
    tailwind: boolean;
    daisyui: boolean;
    //the parsed and sampled Bruno collection, absent unless --api was given.
    //Hanging it here rather than passing it alongside Opts is what lets every
    //genApi* module keep the one-argument signature the other generators use.
    api?: ApiSpec;
};

//everything --api needs, kept separate from Opts because parseArgs stays
//synchronous and pure: it records what was asked for, and index.ts does the
//reading and the network
export type ApiArgs = {
    //the collection directory, as given on the command line
    dir: string;
    env?: string;
    mode: SampleMode;
    refresh: boolean;
};

export type Parsed =
    | { kind: "usage" }
    | { kind: "help" }
    | { kind: "version" }
    | { kind: "create"; dir: string; opts: Opts; api?: ApiArgs }
    //"create-tsreact api" run inside an app that already exists: regenerate
    //src/api/ from the collection recorded in its package.json
    | {
          kind: "api";
          dir: string;
          env?: string;
          mode: SampleMode;
          refresh: boolean;
      };

//user-facing failure: index.ts prints the message and exits 1
export class CliError extends Error {}

//the bundle lives at bin/index.js, so ../package.json is the package root.
//npm always ships package.json regardless of the "files" field.
export function readVersion() {
    const url = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(fs.readFileSync(url, "utf8"));
    return pkg.version as string;
}

//deliberately not the full npm ruleset (214 chars, url-safety, core module
//names) - that is 40 lines or a dependency for failures nobody hits. this
//covers the ones that actually break: path escapes and unquotable names.
export function validateName(name: string) {
    if (!name) {
        throw new CliError("App name must not be empty");
    }
    if (name.includes("..")) {
        throw new CliError(`App name must not contain "..": ${name}`);
    }
    if (/[/\\]/.test(name)) {
        throw new CliError(
            `App name must not contain a path separator: ${name}`
        );
    }
    if (/^[._]/.test(name)) {
        throw new CliError(`App name must not start with "." or "_": ${name}`);
    }
    if (/["\\\p{Cc}]/u.test(name)) {
        throw new CliError(
            `App name contains an unsupported character: ${name}`
        );
    }
    return name;
}

//the target must be missing or empty. a bare .git is tolerated so that
//"create-tsreact ." works inside a freshly cloned repo.
export function assertTargetUsable(dir: string) {
    if (!fs.existsSync(dir)) {
        return;
    }
    if (!fs.statSync(dir).isDirectory()) {
        throw new CliError(`Not a directory: ${dir}`);
    }
    const entries = fs.readdirSync(dir).filter((e) => e !== ".git");
    if (entries.length > 0) {
        throw new CliError(`Directory is not empty: ${dir}`);
    }
}

//"tsreact": { "api": "api" } is written into the generated package.json by
//genPackageJson, and is the only marker that says where a scaffolded app's
//Bruno collection lives. Absent for apps scaffolded without --api.
export function recordedCollection(dir: string) {
    const file = path.join(dir, "package.json");

    if (!fs.existsSync(file)) {
        return undefined;
    }

    try {
        const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
        const recorded = pkg?.tsreact?.api;
        return typeof recorded === "string" ? recorded : undefined;
    } catch {
        //a package.json we cannot read is not a tsreact app as far as this
        //check is concerned; the create path will report it properly
        return undefined;
    }
}

function parseTemplate(value: string | undefined): Template {
    if (!value) {
        throw new CliError(
            "--template needs a value: " + TEMPLATES.join(" | ")
        );
    }
    if (!(TEMPLATES as readonly string[]).includes(value)) {
        throw new CliError(
            `Unknown template "${value}". Expected: ${TEMPLATES.join(" | ")}`
        );
    }
    return value as Template;
}

function parseMode(value: string | undefined): SampleMode {
    if (!value || !(SAMPLE_MODES as readonly string[]).includes(value)) {
        throw new CliError(
            `--api-sample expects one of: ${SAMPLE_MODES.join(" | ")}`
        );
    }

    return value as SampleMode;
}

//a flag that takes a value, in either "--flag value" or "--flag=value" form.
//Returns the value and how many argv entries it consumed.
function value(argv: string[], i: number, flag: string) {
    const arg = argv[i];

    if (arg === flag) {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("-")) {
            throw new CliError(`${flag} needs a value`);
        }
        return { value: next, skip: 1 };
    }

    return { value: arg.slice(flag.length + 1), skip: 0 };
}

export function parseArgs(argv: string[]): Parsed {
    let template: Template = "react";
    let tailwind = false;
    let daisyui = false;
    let target = "";
    let api = "";
    let env: string | undefined;
    let mode: SampleMode = "safe";
    let refresh = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--help" || arg === "-h") {
            return { kind: "help" };
        }
        if (arg === "--version" || arg === "-v") {
            return { kind: "version" };
        }
        if (arg === "--template" || arg === "-t") {
            template = parseTemplate(argv[++i]);
            continue;
        }
        if (arg.startsWith("--template=")) {
            template = parseTemplate(arg.slice("--template=".length));
            continue;
        }
        if (arg === "--tailwind") {
            tailwind = true;
            continue;
        }
        if (arg === "--daisyui") {
            daisyui = true;
            continue;
        }
        if (arg === "--api" || arg.startsWith("--api=")) {
            const got = value(argv, i, "--api");
            api = got.value;
            i += got.skip;
            continue;
        }
        if (arg === "--api-env" || arg.startsWith("--api-env=")) {
            const got = value(argv, i, "--api-env");
            env = got.value;
            i += got.skip;
            continue;
        }
        if (arg === "--api-sample" || arg.startsWith("--api-sample=")) {
            const got = value(argv, i, "--api-sample");
            mode = parseMode(got.value);
            i += got.skip;
            continue;
        }
        if (arg === "--refresh") {
            refresh = true;
            continue;
        }
        if (arg.startsWith("-")) {
            throw new CliError(`Unknown option: ${arg}`);
        }
        if (target) {
            throw new CliError(`Unexpected argument: ${arg}`);
        }
        target = arg;
    }

    //"create-tsreact api" regenerates in place. It is a subcommand rather
    //than a flag because it does the opposite of everything else here: it
    //requires a directory that already exists and is not empty.
    //
    //"api" is also a legal app name, so the two are told apart by looking at
    //the current directory: only an app this CLI generated with --api carries
    //a "tsreact" key in its package.json. Anywhere else, "api" is a name.
    if (target === "api" && recordedCollection(process.cwd())) {
        return { kind: "api", dir: process.cwd(), env, mode, refresh };
    }

    //daisyui is a tailwind plugin, so asking for it alone is a typo, not an
    //error worth stopping for
    if (daisyui) {
        tailwind = true;
    }

    //react native styles with StyleSheet objects - there is no CSS for the
    //tailwind CLI to compile. that is nativewind, a different project.
    if (tailwind && template === "expo") {
        throw new CliError(
            "--tailwind is not supported by the expo template: React Native has no CSS"
        );
    }

    //--refresh only means anything next to a collection, and silently doing
    //nothing is how a user ends up believing they re-sampled
    if (refresh && !api) {
        throw new CliError("--refresh only applies with --api");
    }

    if (!target) {
        return { kind: "usage" };
    }

    //"." and "./foo" are normalised before validation, so that "." means the
    //current directory and "./foo" does not trip the path-separator rule.
    const normalised = path.normalize(target);
    const dir = path.resolve(normalised);
    const name = validateName(path.basename(dir));

    assertTargetUsable(dir);

    return {
        kind: "create",
        dir,
        opts: { name, template, tailwind, daisyui },
        //resolved against the cwd, not the target: --api points at a
        //collection that already exists, while the target must be empty
        api: api ? { dir: path.resolve(api), env, mode, refresh } : undefined,
    };
}
