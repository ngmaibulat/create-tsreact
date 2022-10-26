#!/usr/bin/env node

import chalk from 'chalk';

if (process.argv.length < 3) {
    console.log("\n");
    console.log(chalk.redBright("Please provide appname\n"))
    console.log(chalk.yellowBright("Usage:"));
    console.log(chalk.yellowBright("\tnpm create tsreact <appname>"));
    console.log(chalk.yellowBright("\tnpm init tsreact   <appname>"));
    console.log(chalk.yellowBright("\tnpx create-tsreact <appname>"));
    console.log("\n");
    process.exit(0);
}

const appname = process.argv[2];

console.log(chalk.blue(appname));

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
