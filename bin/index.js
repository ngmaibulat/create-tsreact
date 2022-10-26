#!/usr/bin/env node

// src/index.ts
if (process.argv.length < 3) {
  console.log("Usage: npm create tsreact <appname>");
  process.exit(1);
}
var appname = process.argv[2];
console.log(appname);
