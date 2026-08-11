export default function genPkgJson(name: string) {
    const tpl = `
{
    "name": "${name}",
    "version": "0.0.1",
    "description": "Typescript/React application",
    "main": "index.js",
    "scripts": {
        "format:check": "npx prettier src --check",
        "format:fix": "npx prettier src --write",
        "test": "echo 'Error: no test specified' && exit 1",
        "build-watch": "npx esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2022 --watch",
        "build": "npx esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2022",
        "dev": "npx esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2022  --serve=localhost:3000 --servedir=public",
        "serve": "npx esbuild --serve=localhost:3000 --servedir=public"
    },
    "keywords": [
        "created by tsreact"
    ],
    "author": "",
    "license": "MIT",
    "dependencies": {
        "react": "^19.2.8",
        "react-dom": "^19.2.8"
    },
    "devDependencies": {
        "esbuild": "^0.28.2",
        "@types/react": "^19.2.18",
        "@types/react-dom": "^19.2.4",
        "prettier": "^3.9.6"
    }
}
`;

    return tpl;
}
