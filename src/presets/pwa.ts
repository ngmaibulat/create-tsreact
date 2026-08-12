import type { Files, Opts } from "../cli.js";
import genIconPng from "../genIconPng.js";
import genIconSvg from "../genIconSvg.js";
import genSwTs from "../genSwTs.js";
import genSwTsConfig from "../genSwTsConfig.js";
import genWebManifest from "../genWebManifest.js";
import react from "./react.js";

//A pwa is the react template plus four files. Everything that differs inside
//the shared files - the manifest link in index.html, the worker registration
//in app.tsx, the second esbuild entry and the second tsc in package.json -
//is branched on o.template by the generators themselves.
//
//public/ is served as the site root, so the worker sits at /sw.js and its
//scope covers the whole app. A worker served from a subdirectory could only
//control that subdirectory.
//The three pngs are what Chrome's installability check wants: 192 for the
//launcher, 512 for splash screens and high-dpi, and a maskable 512 so
//Android can crop it to whatever shape the launcher uses without clipping
//the artwork. The svg is kept alongside them for browsers that prefer it.
export default function pwa(o: Opts): Files {
    return {
        ...react(o),
        "tsconfig.sw.json": genSwTsConfig(),
        "public/manifest.webmanifest": genWebManifest(o.name),
        "public/icon.svg": genIconSvg(o.name),
        "public/icon-192.png": genIconPng(o.name, 192),
        "public/icon-512.png": genIconPng(o.name, 512),
        "public/icon-maskable-512.png": genIconPng(o.name, 512, true),
        "src/sw.ts": genSwTs(),
    };
}
