#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';

import genPkgJson from './genPackageJson.js';
import genIndexHtml from './genIndexHtml.js';
import genAppTsx from './genAppTsx.js';
import genTsConfig from './genTsConfig.js';
import genGitIgnore from './genGitIgnore.js'
import genAppCss from './genAppCss.js';

import {usage, steps} from './help.js';

if (process.argv.length < 3) {
    usage();
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

let content = '';
content = genPkgJson(appname);
fs.writeFileSync(`${appname}/package.json`, content);

content = genIndexHtml(appname);
fs.writeFileSync(`${appname}/public/index.html`, content);

content = genAppTsx(appname);
fs.writeFileSync(`${appname}/src/app.tsx`, content);

content = genTsConfig();
fs.writeFileSync(`${appname}/tsconfig.json`, content);

content = genGitIgnore();
fs.writeFileSync(`${appname}/.gitignore`, content);

content = genAppCss();
fs.writeFileSync(`${appname}/public/app.css`, content);


//provide instructions:
steps(appname);
