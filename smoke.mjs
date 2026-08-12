#!/usr/bin/env node

// Scaffolds every template into a temp dir, installs, type-checks and builds
// it, then asserts on what landed on disk. No test framework - plain node, so
// it adds no dependency to a project whose whole pitch is dependency count.
//
// Run with: npm test

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(root, "bin", "index.js");

let failures = 0;

function check(label, ok, detail = "") {
    const mark = ok ? "ok  " : "FAIL";
    console.log(`${mark} ${label}${detail && !ok ? ` - ${detail}` : ""}`);
    if (!ok) {
        failures++;
    }
}

function run(cmd, args, cwd) {
    return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe" });
}

function scaffold(dir, args) {
    return execFileSync(process.execPath, [cli, ...args], {
        cwd: dir,
        encoding: "utf8",
        stdio: "pipe",
    });
}

function exitCodeOf(args, cwd) {
    try {
        execFileSync(process.execPath, [cli, ...args], { cwd, stdio: "pipe" });
        return 0;
    } catch (err) {
        return err.status;
    }
}

// like exitCodeOf, but keeps what the CLI said - the point of several of the
// --api checks is that a failure is a readable sentence, not a stack trace
function runCli(args, cwd) {
    try {
        const stdout = execFileSync(process.execPath, [cli, ...args], {
            cwd,
            encoding: "utf8",
            stdio: "pipe",
        });
        return { status: 0, output: stdout };
    } catch (err) {
        return {
            status: err.status,
            output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
        };
    }
}

// The fixture API the --api section samples against.
//
// It runs in its own process, and it has to: every scaffold below goes through
// execFileSync, which blocks this process's event loop, so an in-process
// http.Server would never get to accept the connection and every request would
// sit there until the sampler's timeout. It binds port 0 and reports what it
// got, so two copies of this suite can run at once.
const FIXTURE_API = `
import http from "node:http";

const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://fixture");
    const json = (status, body) => {
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(body));
    };

    if (url.pathname === "/users" && req.method === "GET") {
        // the second element deliberately omits "nickname" and nulls "email",
        // which is what drives the optional and the union in the inferred
        // type. "tags" is empty in one and populated in the other, which is
        // what widens it to string[] rather than never[].
        return json(200, [
            { id: 1, name: "ada", email: "a@x", nickname: "countess", tags: [] },
            { id: 2, name: "bob", email: null, tags: ["admin"] },
        ]);
    }
    if (url.pathname === "/users" && req.method === "POST") {
        return json(201, { id: 3 });
    }
    if (/^\\/users\\/[^/]+$/.test(url.pathname)) {
        return json(200, { id: 1, name: "ada", meta: { seen: 3 } });
    }
    return json(404, { error: "not found" });
});

server.listen(0, "127.0.0.1", () => console.log("PORT=" + server.address().port));
`;

async function startFixtureApi(dir) {
    const file = path.join(dir, "fixture-api.mjs");
    fs.writeFileSync(file, FIXTURE_API);

    const proc = spawn(process.execPath, [file], {
        stdio: ["ignore", "pipe", "inherit"],
    });

    const port = await new Promise((resolve, reject) => {
        let buffered = "";
        proc.stdout.on("data", (chunk) => {
            buffered += chunk;
            const match = buffered.match(/PORT=(\d+)/);
            if (match) {
                resolve(Number(match[1]));
            }
        });
        proc.on("exit", (code) =>
            reject(new Error(`fixture api exited with ${code}`))
        );
    });

    return { proc, port };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tsreact-smoke-"));

// hoisted so the finally below can reap it even if a check above throws -
// otherwise a failed run leaves a node process holding a port
let fixture = null;

try {
    // --- argument handling -------------------------------------------------
    console.log("\n# cli");

    check("no args exits 1", exitCodeOf([], tmp) === 1);
    check("--help exits 0", exitCodeOf(["--help"], tmp) === 0);
    check(
        "--help does not create a directory",
        !fs.existsSync(path.join(tmp, "--help"))
    );
    check(
        "unknown template exits 1",
        exitCodeOf(["x", "-t", "svelte"], tmp) === 1
    );
    check("unquotable name is rejected", exitCodeOf(['a"b'], tmp) === 1);
    check(
        "--version prints the package version",
        scaffold(tmp, ["--version"]).trim() ===
            JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
                .version
    );

    // --- templates ---------------------------------------------------------
    const templates = [
        {
            name: "react",
            args: [],
            files: [
                "package.json",
                "public/index.html",
                "src/app.tsx",
                "src/app.css",
                "src/env.d.ts",
            ],
            outputs: ["app.js", "app.css"],
        },
        {
            name: "extension",
            args: ["--template", "extension"],
            files: [
                "package.json",
                "public/manifest.json",
                "public/popup.html",
                "src/popup.tsx",
                "src/content.ts",
                "src/background.ts",
                "src/env.d.ts",
            ],
            outputs: ["popup.js", "popup.css", "content.js", "background.js"],
        },
        {
            name: "pwa",
            args: ["--template", "pwa"],
            files: [
                "package.json",
                "tsconfig.sw.json",
                "public/index.html",
                "public/manifest.webmanifest",
                "public/icon.svg",
                "public/icon-192.png",
                "public/icon-512.png",
                "public/icon-maskable-512.png",
                "src/app.tsx",
                "src/sw.ts",
            ],
            outputs: ["app.js", "app.css", "sw.js"],
        },
        {
            // the flags are meant to compose with a template rather than be
            // one, so this row exercises the react template with both on
            name: "tailwind",
            args: ["--tailwind", "--daisyui"],
            files: ["package.json", "src/styles.css", "src/app.css"],
            outputs: ["app.js", "app.css"],
        },
        {
            // expo bundles with metro and has no build or typecheck script,
            // and a real install is huge and slow. --package-lock-only still
            // does full registry + peer resolution, which is the failure mode
            // a handwritten pin table actually has, so that runs; everything
            // else here is a file/JSON assertion. NOT a full build check.
            name: "expo",
            args: ["--template", "expo"],
            files: [
                "package.json",
                "app.json",
                "tsconfig.json",
                "index.ts",
                "App.tsx",
                ".gitignore",
            ],
            outputs: [],
            resolveOnly: true,
        },
    ];

    for (const t of templates) {
        console.log(`\n# ${t.name}`);
        const app = path.join(tmp, t.name);
        scaffold(tmp, [t.name, ...t.args]);

        for (const f of t.files) {
            check(`emits ${f}`, fs.existsSync(path.join(app, f)));
        }

        for (const f of fs
            .readdirSync(app)
            .filter((f) => f.endsWith(".json"))) {
            try {
                JSON.parse(fs.readFileSync(path.join(app, f), "utf8"));
                check(`${f} is valid json`, true);
            } catch (err) {
                check(`${f} is valid json`, false, err.message);
            }
        }

        // expo: prove the pinned versions still resolve against each other,
        // then stop - there is nothing here esbuild can build.
        if (t.resolveOnly) {
            check(
                "pinned versions resolve",
                (() => {
                    try {
                        run(
                            "npm",
                            [
                                "install",
                                "--package-lock-only",
                                "--no-audit",
                                "--no-fund",
                            ],
                            app
                        );
                        return true;
                    } catch (err) {
                        console.log(err.stdout || err.message);
                        return false;
                    }
                })()
            );

            const pkg = JSON.parse(
                fs.readFileSync(path.join(app, "package.json"), "utf8")
            );
            check("main points at index.ts", pkg.main === "index.ts");
            check("expo is a dependency", pkg.dependencies.expo !== undefined);

            // the template ships no binary assets, so app.json must not
            // reference any - expo falls back to its own defaults
            const appJson = fs.readFileSync(path.join(app, "app.json"), "utf8");
            check(
                "app.json references no image assets",
                !/icon|splash|favicon/i.test(appJson)
            );

            const tsconfig = JSON.parse(
                fs.readFileSync(path.join(app, "tsconfig.json"), "utf8")
            );
            check(
                "tsconfig extends expo's base",
                tsconfig.extends === "expo/tsconfig.base"
            );
            continue;
        }

        run("npm", ["install", "--no-audit", "--no-fund"], app);
        check(
            "typecheck passes",
            (() => {
                try {
                    run("npm", ["run", "typecheck"], app);
                    return true;
                } catch (err) {
                    console.log(err.stdout || err.message);
                    return false;
                }
            })()
        );

        run("npm", ["run", "build"], app);
        for (const out of t.outputs) {
            check(
                `builds public/${out}`,
                fs.existsSync(path.join(app, "public", out))
            );
        }

        // --minify is what makes esbuild define NODE_ENV as "production";
        // without it the bundle ships React's development build.
        if (t.name === "react") {
            const bundle = fs.readFileSync(
                path.join(app, "public", "app.js"),
                "utf8"
            );
            check(
                "ships production react",
                !bundle.includes("react-dom.development")
            );
        }

        // a module service worker has to be registered with {type:"module"},
        // which is not supported everywhere, so sw.js must stay classic
        if (t.name === "pwa") {
            const sw = fs.readFileSync(
                path.join(app, "public", "sw.js"),
                "utf8"
            );
            check(
                "sw.js is not an es module",
                !/^\s*(import|export)[ {]/m.test(sw)
            );

            const manifest = JSON.parse(
                fs.readFileSync(
                    path.join(app, "public", "manifest.webmanifest"),
                    "utf8"
                )
            );
            for (const key of ["name", "start_url", "display", "icons"]) {
                check(`manifest has ${key}`, manifest[key] !== undefined);
            }

            const html = fs.readFileSync(
                path.join(app, "public", "index.html"),
                "utf8"
            );
            check(
                "index.html links the manifest",
                html.includes('rel="manifest"')
            );

            // Chrome will not offer to install without raster icons, so the
            // pngs are generated rather than left to the user. Parse the
            // IHDR back out: a truncated or mis-encoded png would still
            // "exist", and nothing else in the pipeline would notice.
            for (const [file, expected] of [
                ["icon-192.png", 192],
                ["icon-512.png", 512],
                ["icon-maskable-512.png", 512],
            ]) {
                const png = fs.readFileSync(path.join(app, "public", file));
                const signature = Buffer.from([
                    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
                ]);

                check(`${file} is a png`, png.subarray(0, 8).equals(signature));
                check(
                    `${file} is ${expected}x${expected}`,
                    png.readUInt32BE(16) === expected &&
                        png.readUInt32BE(20) === expected
                );
            }

            const icons = manifest.icons.map((i) => i.src);
            check(
                "manifest lists the raster icons",
                icons.includes("icon-192.png") && icons.includes("icon-512.png")
            );
            check(
                "manifest has a maskable icon",
                manifest.icons.some((i) => i.purpose === "maskable")
            );
        }

        // tailwind compiles into src/app.css, which app.tsx imports - that is
        // what keeps the generated css inside esbuild's import graph, and so
        // out of public/ where it would break the live-reload swap. daisyui
        // is tree-shaken, so .btn only lands here if the markup drove it.
        if (t.name === "tailwind") {
            const css = fs.readFileSync(
                path.join(app, "public", "app.css"),
                "utf8"
            );
            check(
                "tailwind output reaches public/app.css",
                css.includes("tailwindcss")
            );
            check("daisyui components are compiled in", css.includes(".btn"));
        }

        // content scripts and MV3 service workers must be classic scripts
        if (t.name === "extension") {
            for (const out of ["content.js", "background.js", "popup.js"]) {
                const js = fs.readFileSync(
                    path.join(app, "public", out),
                    "utf8"
                );
                check(
                    `${out} is not an es module`,
                    !/^\s*(import|export)[ {]/m.test(js)
                );
            }
            const manifest = JSON.parse(
                fs.readFileSync(
                    path.join(app, "public", "manifest.json"),
                    "utf8"
                )
            );
            for (const key of ["manifest_version", "name", "version"]) {
                check(`manifest has ${key}`, manifest[key] !== undefined);
            }
        }

        // build output must not be committed
        run("git", ["init", "-q", "."], app);
        run("git", ["add", "-A"], app);
        const staged = run("git", ["diff", "--cached", "--name-only"], app);
        const leaked = t.outputs.filter((o) => staged.includes(`public/${o}`));
        check(
            "build output is gitignored",
            leaked.length === 0,
            leaked.join(", ")
        );

        // with --tailwind the stylesheet stops being a source file, so it has
        // to be ignored too or every user commits build output
        if (t.name === "tailwind") {
            check(
                "generated src/app.css is gitignored",
                !staged.includes("src/app.css")
            );
        }
    }

    // --- --api ---------------------------------------------------------------
    //
    // Hermetic on purpose: the fixture API is a node:http server started here,
    // on an ephemeral port, so this section needs no network and no external
    // service. That matters more than usual because the whole feature is
    // *about* executing real requests - a test that reached out to the
    // internet would fail for reasons that have nothing to do with the code.
    console.log("\n# api");

    const started = await startFixtureApi(tmp);
    fixture = started.proc;
    const port = started.port;

    const collection = path.join(tmp, "collection");
    const write = (rel, body) => {
        const file = path.join(collection, rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, body);
    };

    write(
        "bruno.json",
        '{ "version": "1", "name": "fixture", "type": "collection" }'
    );
    write(
        "environments/local.bru",
        `vars {\n  baseUrl: http://127.0.0.1:${port}\n}\n\nvars:secret [\n  apiToken\n]\n`
    );
    // a disabled query param, a disabled header holding an apostrophe (which
    // would break a naive scanner), and a url query string that has to merge
    // with params:query without being sent twice
    write(
        "users/list.bru",
        `meta {\n  name: List users\n  seq: 1\n}\n\nget {\n  url: {{baseUrl}}/users?page=1\n  auth: bearer\n}\n\nparams:query {\n  page: 1\n  ~verbose: true\n}\n\nheaders {\n  Accept: application/json\n  Authorization: Bearer {{apiToken}}\n  ~X-Note: don't send this\n}\n`
    );
    write(
        "users/get.bru",
        `meta {\n  name: Get user\n  seq: 2\n}\n\nget {\n  url: {{baseUrl}}/users/:id\n}\n\nparams:path {\n  id: 1\n}\n`
    );
    // a body:json template with a {{var}} in it, followed by a tests block
    // full of braces and quotes - both have to survive the block scanner
    write(
        "users/create.bru",
        `meta {\n  name: Create user\n  seq: 3\n}\n\npost {\n  url: {{baseUrl}}/users\n  body: json\n}\n\nbody:json {\n  {\n    "name": "{{newName}}",\n    "admin": false\n  }\n}\n\ntests {\n  test("created", function() { expect(res.status).to.equal(201); });\n}\n`
    );

    const app = path.join(tmp, "apiapp");
    scaffold(tmp, ["apiapp", "--api", collection]);

    for (const f of [
        "src/api/types.ts",
        "src/api/client.ts",
        "src/api/config.ts",
        "src/api/keys.ts",
        "src/api/queries.ts",
        "src/api/mutations.ts",
        "src/api/index.ts",
        "api/samples.json",
        "api/bruno.json",
        "api/users/list.bru",
    ]) {
        check(`emits ${f}`, fs.existsSync(path.join(app, f)));
    }

    const types = fs.readFileSync(path.join(app, "src/api/types.ts"), "utf8");

    // the inference claims to describe what the server really returned, so
    // assert on the parts a declared-types approach could not have known
    check("infers a field the server returned", /\bname: string;/.test(types));
    check(
        "a key absent from one element is optional",
        /\bnickname\?: string;/.test(types)
    );
    check(
        "a null observed once becomes a union",
        /\bemail: string \| null;/.test(types)
    );
    check(
        "an empty array merges with a populated one",
        /\btags: string\[\];/.test(types)
    );
    check("nested objects are inlined", /\bseen: number;/.test(types));

    // mutations are not executed by default: scaffolding must not POST to a
    // real API. The type is therefore unknown, and says why.
    check(
        "an unsampled mutation is typed unknown",
        /export type CreateUserResponse = unknown;/.test(types)
    );
    check(
        "the request body type comes from the body:json template",
        /export type CreateUserBody = \{[^}]*\bname: string;[^}]*\badmin: boolean;/s.test(
            types
        )
    );

    const samples = JSON.parse(
        fs.readFileSync(path.join(app, "api/samples.json"), "utf8")
    );
    check(
        "samples.json records the sampled endpoints",
        samples.endpoints.listUsers.status === 200
    );
    check(
        "samples.json says why a skip was skipped",
        typeof samples.endpoints.createUser?.skipped === "string"
    );

    // a disabled header must not reach the generated client, and neither may
    // Authorization - that belongs in config.ts, which is not committed-safe
    const queriesSrc = fs.readFileSync(
        path.join(app, "src/api/queries.ts"),
        "utf8"
    );
    check("a ~disabled header is dropped", !queriesSrc.includes("X-Note"));
    check(
        "Authorization never reaches the client",
        !/Authorization/i.test(queriesSrc)
    );
    check(
        "a path parameter is url-encoded",
        queriesSrc.includes("segment(params.id)")
    );

    const apiPkg = JSON.parse(
        fs.readFileSync(path.join(app, "package.json"), "utf8")
    );
    check(
        "tanstack query is a dependency",
        Boolean(apiPkg.dependencies["@tanstack/react-query"])
    );
    check("the collection path is recorded", apiPkg.tsreact?.api === "api");
    check("an api:gen script is emitted", Boolean(apiPkg.scripts["api:gen"]));

    // the real proof: the emitted code has to satisfy tsc --strict against
    // TanStack Query's own types, not merely look plausible
    run("npm", ["install", "--no-audit", "--no-fund"], app);
    check(
        "typecheck passes",
        (() => {
            try {
                run("npm", ["run", "typecheck"], app);
                return true;
            } catch (err) {
                console.log(err.stdout || err.message);
                return false;
            }
        })()
    );
    run("npm", ["run", "build"], app);
    check(
        "builds public/app.js",
        fs.existsSync(path.join(app, "public", "app.js"))
    );

    // MV3 blocks a cross-origin fetch that is not declared, and it fails as an
    // opaque network error rather than a CORS message. File assertions only -
    // a second full install here would double this section's runtime.
    const ext = path.join(tmp, "apiext");
    scaffold(tmp, ["apiext", "--template", "extension", "--api", collection]);
    const extManifest = JSON.parse(
        fs.readFileSync(path.join(ext, "public/manifest.json"), "utf8")
    );
    check(
        "the extension declares host_permissions for the api",
        (extManifest.host_permissions ?? []).some((h) => h.includes(`:${port}`))
    );

    // Everything below runs with the fixture API switched off. This is the
    // check that committing api/samples.json actually bought determinism:
    // regeneration has to work offline and produce the same bytes.
    fixture.kill();
    await new Promise((resolve) => fixture.on("exit", resolve));

    const before = fs.readFileSync(path.join(app, "src/api/types.ts"), "utf8");
    const configPath = path.join(app, "src/api/config.ts");
    fs.writeFileSync(
        configPath,
        fs
            .readFileSync(configPath, "utf8")
            .replace("token: undefined", "token: 'kept'")
    );
    fs.rmSync(path.join(app, "src/api/types.ts"));
    fs.rmSync(path.join(app, "src/api/queries.ts"));

    const regen = runCli(["api"], app);
    check("api regenerates offline", regen.status === 0, regen.output);
    check(
        "regenerated types are byte-identical",
        fs.readFileSync(path.join(app, "src/api/types.ts"), "utf8") === before
    );
    // config.ts holds the base url and the token the user typed in. It is the
    // one file regeneration must never clobber.
    check(
        "a hand-edited config.ts survives regeneration",
        fs.readFileSync(configPath, "utf8").includes("token: 'kept'")
    );

    // --refresh is an explicit "go and ask the API again", so with the API
    // gone it has to fail - but as a sentence, not a stack trace
    const refreshed = runCli(["api", "--refresh"], app);
    check(
        "--refresh against a dead api exits non-zero",
        refreshed.status === 1
    );
    check(
        "--refresh failure names the cause",
        refreshed.output.includes("Could not sample any endpoint"),
        refreshed.output
    );
    check(
        "--refresh failure suggests a way forward",
        refreshed.output.includes("--api-sample=none"),
        refreshed.output
    );

    // --api-sample=none must not touch the network at all, which is the only
    // reason this can run with the server already closed
    const offline = path.join(tmp, "apinone");
    const none = runCli(
        ["apinone", "--api", collection, "--api-sample=none"],
        tmp
    );
    check(
        "--api-sample=none scaffolds with no network",
        none.status === 0,
        none.output
    );
    check(
        "every response is unknown without samples",
        !/export type \w+Response = \{/.test(
            fs.readFileSync(path.join(offline, "src/api/types.ts"), "utf8")
        )
    );

    // "api" is a legal app name; only a directory this CLI generated with
    // --api may be regenerated in place
    check(
        "a bad collection path exits 1",
        exitCodeOf(
            ["broken", "--api", path.join(tmp, "no-such-collection")],
            tmp
        ) === 1
    );
    check(
        "no directory is left behind when sampling fails",
        !fs.existsSync(path.join(tmp, "broken"))
    );
    check(
        "--refresh without --api exits 1",
        exitCodeOf(["x", "--refresh"], tmp) === 1
    );
} finally {
    fixture?.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(
    failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`
);
process.exit(failures === 0 ? 0 : 1);
