import type { Files, Opts } from "../cli.js";
import apiFiles from "../apiFiles.js";
import genAppCss from "../genAppCss.js";
import genAppTsx from "../genAppTsx.js";
import genEditorConfig from "../genEditorConfig.js";
import genEnvDts from "../genEnvDts.js";
import genGitIgnore from "../genGitIgnore.js";
import genIndexHtml from "../genIndexHtml.js";
import genPkgJson from "../genPackageJson.js";
import genPrettierConfig from "../genPrettierConfig.js";
import genStylesCss from "../genStylesCss.js";
import genTsConfig from "../genTsConfig.js";

//app.css lives in src/ and is imported from app.tsx, so esbuild emits it as
//public/app.css next to public/app.js. Keeping a handwritten public/app.css
//would mean the first CSS import silently overwrote it.
//
//With --tailwind that same app.css is compiled from src/styles.css instead of
//being handwritten - the import in app.tsx, the link in index.html and the
//esbuild command are all unchanged, which is the point of routing tailwind's
//output through esbuild rather than straight into public/.
export default function react(o: Opts): Files {
    const files: Files = {
        //empty unless --api was given; apiFiles is a map-builder, spread in
        //the same way pwa.ts spreads this preset
        ...apiFiles(o),
        "package.json": genPkgJson(o),
        "tsconfig.json": genTsConfig(o),
        ".gitignore": genGitIgnore(o),
        ".editorconfig": genEditorConfig(),
        ".prettierrc.json": genPrettierConfig(),
        "public/index.html": genIndexHtml(o),
        "src/app.tsx": genAppTsx(o),
        "src/app.css": genAppCss(o),
        "src/env.d.ts": genEnvDts(),
    };

    if (o.tailwind) {
        files["src/styles.css"] = genStylesCss(o);
    }

    return files;
}
