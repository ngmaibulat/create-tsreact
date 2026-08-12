import type { Opts } from "./cli.js";

//These versions mirror the published expo-template-blank-typescript, which is
//what "npx create-expo-app --template blank-typescript" writes. Do not
//loosen them: expo pins react and react-native exactly per SDK, and
//react-native@latest is already ahead of what SDK 57 accepts, so a caret
//range here would produce an install that metro refuses to bundle.
//
//typescript is ~6.0.3 rather than the ^7 the browser templates get, for the
//same reason - that is the version expo's own tsconfig.base is built against.
//
//"npx expo install --fix" realigns everything after an SDK bump.
//
//@tanstack/react-query is the one dependency here that expo does not pin, and
//it is caret-ranged like the browser templates: it is plain TypeScript with a
//react peer, so it has no SDK-specific build the way react-native does.
export default function genExpoPkgJson(o: Opts) {
    const deps = [
        `"expo": "~57.0.12"`,
        `"expo-status-bar": "~57.0.1"`,
        `"react": "19.2.3"`,
        `"react-native": "0.86.2"`,
    ];

    if (o.api) {
        deps.unshift(`"@tanstack/react-query": "^5.90.5"`);
    }

    const api = o.api
        ? `\n        "api:gen": "npx create-tsreact@latest api",`
        : "";

    const marker = o.api
        ? `\n    "tsreact": {\n        "api": "${o.api.dir}"\n    },`
        : "";

    const tpl = `
{
    "name": "${o.name}",
    "version": "1.0.0",
    "description": "React Native application on Expo",
    "private": true,
    "main": "index.ts",${marker}
    "scripts": {${api}
        "start": "expo start",
        "android": "expo start --android",
        "ios": "expo start --ios",
        "web": "expo start --web",
        "typecheck": "tsc --noEmit",
        "format:check": "prettier . --check",
        "format:fix": "prettier . --write"
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
        "@types/react": "~19.2.2",
        "prettier": "^3.9.6",
        "typescript": "~6.0.3"
    }
}
`;

    return tpl;
}
