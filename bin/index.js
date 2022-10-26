#!/usr/bin/env node

// src/index.ts
if (process.argv.length < 3) {
  console.log("\n");
  console.log("	Please provide appname");
  console.log("	Usage:");
  console.log("	npm create tsreact <appname>");
  console.log("	npm init tsreact   <appname>");
  console.log("	npx create-tsreact <appname>");
  console.log("\n");
  process.exit(0);
}
var appname = process.argv[2];
console.log(appname);
