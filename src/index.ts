#!/usr/bin/env node


if (process.argv.length < 3) {
    console.log("\n");
    console.log("\tPlease provide appname")
    console.log("\tUsage:");
    console.log("\tnpm create tsreact <appname>");
    console.log("\tnpm init tsreact   <appname>");
    console.log("\tnpx create-tsreact <appname>");
    console.log("\n");
    process.exit(0);
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
