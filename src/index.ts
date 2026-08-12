#!/usr/bin/env node

import chalk from "chalk";
import fs from "fs";
import path from "path";

import apiFiles, { PRESERVED } from "./apiFiles.js";
import { collectionFiles, readCollection } from "./bruno/collection.js";
import { collect, deserialise } from "./bruno/sample.js";
import { CliError, parseArgs, readVersion, recordedCollection } from "./cli.js";
import type { ApiArgs, Files, Opts, Template } from "./cli.js";
import type { ApiSpec, Samples } from "./bruno/spec.js";
import { help, steps, usage } from "./help.js";

import expo from "./presets/expo.js";
import extension from "./presets/extension.js";
import pwa from "./presets/pwa.js";
import react from "./presets/react.js";

const PRESETS: Record<Template, (o: Opts) => Files> = {
    react,
    extension,
    pwa,
    expo,
};

//where the collection is copied to inside the scaffolded app, and where the
//captured responses go. Fixed rather than derived from --api so that
//"npm run api:gen" has one place to look no matter where the collection came
//from originally.
const API_DIR = "api";
const SAMPLES = "api/samples.json";

//every generator's template literal opens on the line before its content, so
//trim the ends here and give each file exactly one trailing newline.
//Buffers (the pwa's png icons) are written through byte for byte instead.
function writeTree(dir: string, files: Files) {
    for (const [rel, contents] of Object.entries(files)) {
        const target = path.join(dir, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(
            target,
            Buffer.isBuffer(contents) ? contents : contents.trim() + "\n"
        );
    }
}

//absent on a fresh scaffold, which is exactly the case that has to hit the
//network - there is nothing to replay yet
function readSamples(file: string | undefined): Samples {
    if (!file || !fs.existsSync(file)) {
        return {};
    }

    return deserialise(fs.readFileSync(file, "utf8"), file);
}

//Parse the collection, replay or capture its responses, and hand back a spec
//the emitters can use. Separated from both callers because scaffolding and
//regenerating differ only in where the collection and the samples are read
//from.
async function loadSpec(
    collectionDir: string,
    samplesFile: string | undefined,
    args: Pick<ApiArgs, "env" | "mode" | "refresh">,
    recordedAs: string
): Promise<ApiSpec> {
    const base = readCollection(collectionDir, args.env);

    const samples = await collect(base, {
        mode: args.mode,
        previous: readSamples(samplesFile),
        refresh: args.refresh,
    });

    return { ...base, dir: recordedAs, samples };
}

async function create(dir: string, opts: Opts, args: ApiArgs | undefined) {
    const extra: Files = {};

    if (args) {
        //sampling happens before the directory is created, so a collection
        //that cannot be reached leaves nothing behind to clean up
        opts.api = await loadSpec(args.dir, undefined, args, API_DIR);

        //the app gets its own copy of the collection, so api:gen keeps
        //working even if the directory --api pointed at moves away
        for (const [rel, contents] of Object.entries(
            collectionFiles(args.dir)
        )) {
            extra[`${API_DIR}/${rel}`] = contents;
        }
    }

    fs.mkdirSync(dir, { recursive: true });
    writeTree(dir, { ...PRESETS[opts.template](opts), ...extra });

    steps(path.relative(process.cwd(), dir) || ".", opts);
}

//"create-tsreact api": rewrite src/api/ from the collection this app already
//carries. config.ts is left alone - it holds the base url and credentials the
//user edited by hand, and clobbering those is the one thing regeneration must
//never do.
async function regenerate(parsed: {
    dir: string;
    env?: string;
    mode: ApiArgs["mode"];
    refresh: boolean;
}) {
    const recorded = recordedCollection(parsed.dir);

    if (!recorded) {
        throw new CliError(
            'No "tsreact" entry in package.json - this is not an app scaffolded with --api'
        );
    }

    const pkg = JSON.parse(
        fs.readFileSync(path.join(parsed.dir, "package.json"), "utf8")
    );

    const spec = await loadSpec(
        path.join(parsed.dir, recorded),
        path.join(parsed.dir, SAMPLES),
        parsed,
        recorded
    );

    //the template and flags do not change what lands in src/api/, but Opts is
    //what every generator takes, so it is rebuilt from the manifest
    const opts: Opts = {
        name: pkg.name ?? "app",
        template: "react",
        tailwind: false,
        daisyui: false,
        api: spec,
    };

    const files = apiFiles(opts);

    if (fs.existsSync(path.join(parsed.dir, PRESERVED))) {
        delete files[PRESERVED];
    }

    writeTree(parsed.dir, files);

    console.log(
        chalk.greenBright(
            `\nRegenerated ${
                Object.keys(files).length
            } file(s) from ${recorded}/\n`
        )
    );
}

async function main() {
    const parsed = parseArgs(process.argv.slice(2));

    if (parsed.kind === "usage") {
        usage();
        process.exit(1);
    }

    if (parsed.kind === "help") {
        help(readVersion());
        return;
    }

    if (parsed.kind === "version") {
        console.log(readVersion());
        return;
    }

    if (parsed.kind === "api") {
        await regenerate(parsed);
        return;
    }

    await create(parsed.dir, parsed.opts, parsed.api);
}

main().catch((err) => {
    if (err instanceof CliError) {
        console.log(chalk.red(err.message));
        process.exit(1);
    }
    throw err;
});
