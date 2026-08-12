import type { Opts } from "./cli.js";

//All three entry points build in one command. --format=iife rather than esm
//because MV3 content scripts cannot be ES modules at all; a background
//service worker can be, but only if the manifest declares "type": "module",
//and keeping every entry classic avoids splitting this into two commands.
//
//Two consequences of iife: top-level await is rejected outright by esbuild,
//and --splitting is esm-only, so the three bundles share no code.
//
//No --serve here: an extension is loaded from disk by Chrome, so there is
//nothing for a dev server to serve. "npm run dev" watches and rebuilds; use
//the reload button on chrome://extensions to pick the changes up.
export default function genExtPkgJson(o: Opts) {
    const entries = "src/popup.tsx src/content.ts src/background.ts";
    const flags =
        "--bundle --outdir=public --format=iife --platform=browser --target=es2022";

    //popup.css is what popup.tsx imports, so tailwind compiles into it and
    //esbuild picks it up from there - same chaining as the react template
    const tw = "tailwindcss -i src/styles.css -o src/popup.css";
    const twBuild = o.tailwind ? `${tw} --minify && ` : "";
    //predev compiles the stylesheet once so "npm run dev" alone still
    //produces a styled popup - see genPackageJson.ts
    const twScript = o.tailwind
        ? `\n        "tw": "${tw} --watch",\n        "predev": "${tw}",`
        : "";

    //see genPackageJson.ts - the collection travels with the app, so
    //regenerating goes through npx rather than a devDependency
    const api = o.api
        ? `\n        "api:gen": "npx create-tsreact@latest api",`
        : "";

    const deps = [`"react": "^19.2.8"`, `"react-dom": "^19.2.8"`];

    if (o.api) {
        deps.unshift(`"@tanstack/react-query": "^5.90.5"`);
    }

    const marker = o.api
        ? `\n    "tsreact": {\n        "api": "${o.api.dir}"\n    },`
        : "";

    const dev = [
        `"esbuild": "^0.28.2"`,
        `"@types/chrome": "^0.2.5"`,
        `"@types/react": "^19.2.18"`,
        `"@types/react-dom": "^19.2.4"`,
        `"prettier": "^3.9.6"`,
        `"typescript": "^7.0.2"`,
    ];

    if (o.tailwind) {
        dev.push(`"tailwindcss": "^4.3.3"`, `"@tailwindcss/cli": "^4.3.3"`);
    }
    if (o.daisyui) {
        dev.push(`"daisyui": "^5.7.16"`);
    }

    const tpl = `
{
    "name": "${o.name}",
    "version": "0.0.1",
    "description": "Chrome MV3 extension in Typescript/React",
    "private": true,
    "type": "module",${marker}
    "scripts": {
        "format:check": "prettier src --check",
        "format:fix": "prettier src --write",
        "typecheck": "tsc --noEmit",
        "test": "echo 'Error: no test specified' && exit 1",${twScript}${api}
        "build": "${twBuild}esbuild ${entries} ${flags} --minify --sourcemap",
        "dev": "esbuild ${entries} ${flags} --sourcemap --watch"
    },
    "keywords": [
        "created by tsreact"
    ],
    "author": "",
    "license": "MIT",
    "dependencies": {
        ${deps.join(",\n        ")}
    },
    "devDependencies": {
        ${dev.join(",\n        ")}
    }
}
`;

    return tpl;
}
