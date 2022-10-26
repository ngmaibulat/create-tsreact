#!/usr/bin/env node


if (process.argv.length < 3) {
    console.log("\n\n");
    console.log("\tUsage: npm create tsreact <appname>");
    console.log("\n\n");
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
