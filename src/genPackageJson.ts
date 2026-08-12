import type { Opts } from "./cli.js";

const APP =
    "esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2022";

//the service worker is a second entry point, and a classic script rather than
//an esm one: a module worker has to be registered with {type: "module"},
//which is not supported everywhere. Same reasoning as the extension's iife.
const SW =
    "esbuild src/sw.ts --bundle --outfile=public/sw.js --format=iife --platform=browser --target=es2022";

const TW = "tailwindcss -i src/styles.css -o src/app.css";

//NOTE on --minify: with platform=browser, esbuild defines
//process.env.NODE_ENV as "production" only when *all* minify options are
//enabled, and "development" otherwise. Without --minify the build below
//would ship React's development bundle. It is all-or-nothing: passing only
//--minify-syntax leaves NODE_ENV at "development".
//
//--watch is required alongside --serve for live reload: the /esbuild event
//stream only emits "change" when a watch rebuild changes the output.
export default function genPkgJson(o: Opts) {
    const pwa = o.template === "pwa";

    //tailwind compiles src/styles.css into src/app.css, which app.tsx imports.
    //Feeding esbuild rather than writing public/app.css directly is what keeps
    //the live-reload css swap working - the /esbuild stream only reports
    //esbuild's own outputs.
    const build =
        (o.tailwind ? `${TW} --minify && ` : "") +
        `${APP} --minify --sourcemap` +
        (pwa ? ` && ${SW} --minify` : "");

    //sw.ts needs the WebWorker lib, which cannot coexist with DOM, so it gets
    //its own tsconfig - see genSwTsConfig.ts
    const typecheck = pwa
        ? "tsc --noEmit && tsc --noEmit -p tsconfig.sw.json"
        : "tsc --noEmit";

    //no dependency-free, windows-portable way to run two watchers from one
    //script, so the css watcher stays a separate command in its own terminal.
    //predev compiles the stylesheet once beforehand (npm still runs pre<name>
    //for arbitrary scripts) so that "npm run dev" on its own shows a styled
    //page rather than an unstyled one, while leaving "dev" itself untouched.
    const tw = o.tailwind
        ? `\n        "tw": "${TW} --watch",\n        "predev": "${TW}",`
        : "";

    //regenerating goes through npx rather than a devDependency on this CLI:
    //the collection is copied into the app, so there is nothing to keep
    //installed between the rare occasions the API changes.
    const api = o.api
        ? `\n        "api:gen": "npx create-tsreact@latest api",`
        : "";

    const dev = [
        `"esbuild": "^0.28.2"`,
        `"@types/react": "^19.2.18"`,
        `"@types/react-dom": "^19.2.4"`,
        `"prettier": "^3.9.6"`,
        `"typescript": "^7.0.2"`,
    ];

    //the cli lives in its own package - the tailwindcss package has no bin at
    //all. Both are listed so editors still resolve "tailwindcss" itself.
    if (o.tailwind) {
        dev.push(`"tailwindcss": "^4.3.3"`, `"@tailwindcss/cli": "^4.3.3"`);
    }
    if (o.daisyui) {
        dev.push(`"daisyui": "^5.7.16"`);
    }

    const description = pwa
        ? "Installable Typescript/React PWA"
        : "Typescript/React application";

    const deps = [`"react": "^19.2.8"`, `"react-dom": "^19.2.8"`];

    if (o.api) {
        deps.unshift(`"@tanstack/react-query": "^5.90.5"`);
    }

    //where the Bruno collection lives, relative to this file. It is also the
    //marker that tells "create-tsreact api" this is an app it may regenerate.
    const marker = o.api
        ? `\n    "tsreact": {\n        "api": "${o.api.dir}"\n    },`
        : "";

    const tpl = `
{
    "name": "${o.name}",
    "version": "0.0.1",
    "description": "${description}",
    "private": true,
    "type": "module",${marker}
    "scripts": {
        "format:check": "prettier src --check",
        "format:fix": "prettier src --write",
        "typecheck": "${typecheck}",
        "test": "echo 'Error: no test specified' && exit 1",${tw}${api}
        "build-watch": "${APP} --sourcemap --watch",
        "build": "${build}",
        "dev": "${APP} --sourcemap --watch --serve=localhost:3000 --servedir=public",
        "serve": "esbuild --serve=localhost:3000 --servedir=public"
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
