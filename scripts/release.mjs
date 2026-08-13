#!/usr/bin/env node

// Bump, build, commit, tag, publish - in that order, from the workspace root.
//
// This lives here rather than as a `release` script inside packages/cli because
// npm decides whether it is in a git repo with stat(cwd + "/.git"). A workspace
// child has no .git, so `npm version patch` there skips the clean-tree check,
// the commit and the tag, and silently degrades to rewriting `version` - which
// leaves a dirty tree that `pnpm publish` then rejects.
//
// Run with: pnpm run release [patch|minor|major]

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = path.join(root, "packages", "cli");
const pkgJson = path.join(pkgDir, "package.json");

const BUMPS = ["patch", "minor", "major"];
const BRANCH = "main";

function die(message) {
    console.error(`release: ${message}`);
    process.exit(1);
}

// every step is fatal, and the child has already printed why - so report the
// command rather than a node stack trace
function run(cmd, args, cwd = root) {
    try {
        execFileSync(cmd, args, { cwd, stdio: "inherit" });
    } catch {
        die(`failed: ${cmd} ${args.join(" ")}`);
    }
}

function capture(cmd, args, cwd = root) {
    return execFileSync(cmd, args, {
        cwd,
        encoding: "utf8",
        stdio: "pipe",
    }).trim();
}

function version() {
    return JSON.parse(fs.readFileSync(pkgJson, "utf8")).version;
}

const args = process.argv.slice(2);
const anyBranch = args.includes("--any-branch");
const rest = args.filter((a) => a !== "--any-branch");

if (rest.length > 1) {
    die(`expected at most one bump type, got: ${rest.join(" ")}`);
}

const bump = rest[0] ?? "patch";

if (!BUMPS.includes(bump)) {
    die(`unknown bump type "${bump}" - expected one of ${BUMPS.join(", ")}`);
}

const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

if (branch !== BRANCH && !anyBranch) {
    die(
        `on branch "${branch}", expected "${BRANCH}" - pass --any-branch to override`
    );
}

// the check npm was supposed to do. Nothing has been modified yet, so failing
// here is free.
if (capture("git", ["status", "--porcelain"]) !== "") {
    die("unclean working tree - commit or stash changes first");
}

console.log(`release: ${version()} -> ${bump}`);

run("npm", ["version", bump, "--no-git-tag-version"], pkgDir);

const next = version();
const tag = `v${next}`;

// so the bundle that gets committed is the one being published. prepublishOnly
// builds again for the tarball; esbuild is fast and its output is deterministic.
run("pnpm", ["--filter", "create-tsreact", "run", "build"]);

run("git", ["add", pkgJson, path.join(pkgDir, "bin", "index.js")]);
run("git", ["commit", "-m", tag]);
run("git", ["tag", "-a", tag, "-m", tag]);

// the tree is clean again, so pnpm's own git-checks pass without --no-git-checks.
// Not run(): this one failure needs its own message, because the retry is not
// the command that just failed.
try {
    execFileSync("pnpm", ["--filter", "create-tsreact", "publish"], {
        cwd: root,
        stdio: "inherit",
    });
} catch {
    die(
        `publish failed. ${tag} is already committed and tagged, so retry with` +
            ` "pnpm --filter create-tsreact publish" - re-running release would bump again`
    );
}

console.log(`release: published ${next}. Push with: git push --follow-tags`);
