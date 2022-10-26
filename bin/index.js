#!/usr/bin/env node

// src/index.ts
if (process.argv.length < 3) {
  console.log("\n\n");
  console.log("	Usage: npm create tsreact <appname>");
  console.log("\n\n");
  process.exit(0);
}
var appname = process.argv[2];
console.log(appname);
