#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';

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

//mkdir appname
//mkdir appname/src
//mkdir appname/public

if (fs.existsSync(appname)) {
    const msg = chalk.red(`Directory exists: ${appname}`);
    console.log(msg);
    process.exit(0);
}
else {
    fs.mkdirSync(appname, { recursive: true });
    fs.mkdirSync(`${appname}/src`, { recursive: true });
    fs.mkdirSync(`${appname}/public`, { recursive: true });
}

//create appname/package.json
//create appname/src/app.tsx
//create appname/public/index.html


//provide instructions:
//cd appname
//npm install
//npm run dev

