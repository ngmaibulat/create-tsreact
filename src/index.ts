#!/usr/bin/env node


if (process.argv.length < 3) {
    console.log("Usage: npm create tsreact <appname>");
    process.exit(1);
}

const appname = process.argv[2];

console.log(appname);

//mkdir appname
//create package.json

//mkdir appname/src
//mkdir appname/public

//create appname/public/index.html
//create appname/src/app.tsx

//provide instructions:
//cd appname
//npm install
//npm run dev
