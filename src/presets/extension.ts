import type { Files, Opts } from "../cli.js";
import apiFiles from "../apiFiles.js";
import genBackgroundTs from "../genBackgroundTs.js";
import genContentTs from "../genContentTs.js";
import genEditorConfig from "../genEditorConfig.js";
import genEnvDts from "../genEnvDts.js";
import genExtPkgJson from "../genExtPackageJson.js";
import genGitIgnore from "../genGitIgnore.js";
import genManifest from "../genManifest.js";
import genPopupCss from "../genPopupCss.js";
import genPopupHtml from "../genPopupHtml.js";
import genPopupTsx from "../genPopupTsx.js";
import genPrettierConfig from "../genPrettierConfig.js";
import genStylesCss from "../genStylesCss.js";
import genTsConfig from "../genTsConfig.js";

//public/ is the extension root - manifest.json sits there and every path
//inside it is resolved relative to it. That is the folder "Load unpacked"
//wants, not the project root.
export default function extension(o: Opts): Files {
    const files: Files = {
        //empty unless --api was given - see apiFiles.ts
        ...apiFiles(o),
        "package.json": genExtPkgJson(o),
        "tsconfig.json": genTsConfig(o),
        ".gitignore": genGitIgnore(o),
        ".editorconfig": genEditorConfig(),
        ".prettierrc.json": genPrettierConfig(),
        "public/manifest.json": genManifest(o),
        "public/popup.html": genPopupHtml(o.name),
        "src/popup.tsx": genPopupTsx(o),
        "src/popup.css": genPopupCss(o),
        "src/content.ts": genContentTs(o.name),
        "src/background.ts": genBackgroundTs(o.name),
        "src/env.d.ts": genEnvDts(),
    };

    if (o.tailwind) {
        files["src/styles.css"] = genStylesCss(o);
    }

    return files;
}
