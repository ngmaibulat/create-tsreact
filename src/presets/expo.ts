import type { Files, Opts } from "../cli.js";
import apiFiles from "../apiFiles.js";
import genAppJson from "../genAppJson.js";
import genEditorConfig from "../genEditorConfig.js";
import genExpoAppTsx from "../genExpoAppTsx.js";
import genExpoGitIgnore from "../genExpoGitIgnore.js";
import genExpoIndexTs from "../genExpoIndexTs.js";
import genExpoPkgJson from "../genExpoPackageJson.js";
import genExpoTsConfig from "../genExpoTsConfig.js";
import genPrettierConfig from "../genPrettierConfig.js";

//The odd one out: no esbuild, no public/, no bundler command to read. Expo
//bundles with metro, which is configured by app.json and needs neither a
//babel.config.js nor a metro.config.js as of SDK 57.
//
//App.tsx sits at the project root rather than in src/ because that is where
//the expo template puts it and where every expo tutorial expects it.
export default function expo(o: Opts): Files {
    return {
        //empty unless --api was given - see apiFiles.ts. src/api/ works here
        //too: metro resolves it and expo/tsconfig.base includes everything.
        ...apiFiles(o),
        "package.json": genExpoPkgJson(o),
        "app.json": genAppJson(o.name),
        "tsconfig.json": genExpoTsConfig(),
        ".gitignore": genExpoGitIgnore(),
        ".editorconfig": genEditorConfig(),
        ".prettierrc.json": genPrettierConfig(),
        "index.ts": genExpoIndexTs(),
        "App.tsx": genExpoAppTsx(o),
    };
}
