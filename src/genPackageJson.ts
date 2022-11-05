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
        "build-watch": "esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2017 --watch",
        "build": "esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2017",
        "dev": "esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2017  --serve=localhost:3000 --servedir=public",
        "serve": "esbuild --serve=localhost:3000 --servedir=public"
    },
    "keywords": [
        "created by tsreact"
    ],
    "author": "",
    "license": "MIT",
    "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    },
    "devDependencies": {
        "esbuild": "^0.15.12",
        "@types/react": "^18.0.22",
        "@types/react-dom": "^18.0.7",
        "prettier": "^2.7.1"
    }
}
`;

    return tpl;
}
