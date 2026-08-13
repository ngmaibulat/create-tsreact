import type { Files, Opts } from "../cli.js";
import apiFiles from "../apiFiles.js";
import genEditorConfig from "../genEditorConfig.js";
import genEnvDts from "../genEnvDts.js";
import genGitIgnore from "../genGitIgnore.js";
import genMainTsx from "../genMainTsx.js";
import genOxfmtrc from "../genOxfmtrc.js";
import genOxlintrc from "../genOxlintrc.js";
import genPnpmWorkspaceYaml from "../genPnpmWorkspaceYaml.js";
import genRootPkgJson from "../genRootPackageJson.js";
import genStylesCss from "../genStylesCss.js";
import genViteAppTsx from "../genViteAppTsx.js";
import genViteConfig from "../genViteConfig.js";
import genViteIndexHtml from "../genViteIndexHtml.js";
import genVitePkgJson from "../genVitePackageJson.js";
import genViteTsConfig from "../genViteTsConfig.js";

//No .prettierrc.json: this template formats with oxfmt, configured in
//.oxfmtrc.json at the root alongside .oxlintrc.json - one config and one pass
//for the whole workspace. index.html sits at the app root rather than in
//public/ because that is where vite looks for its entry.
export default function viteSpa(o: Opts): Files {
    return {
        ...apiFiles(o),
        "package.json": genRootPkgJson(o),
        "pnpm-workspace.yaml": genPnpmWorkspaceYaml(o),
        ".gitignore": genGitIgnore(o),
        ".editorconfig": genEditorConfig(),
        ".oxlintrc.json": genOxlintrc(),
        ".oxfmtrc.json": genOxfmtrc(),

        "apps/web/package.json": genVitePkgJson(o),
        "apps/web/tsconfig.json": genViteTsConfig(),
        "apps/web/vite.config.ts": genViteConfig(o),
        "apps/web/index.html": genViteIndexHtml(o),
        "apps/web/src/main.tsx": genMainTsx(o),
        "apps/web/src/App.tsx": genViteAppTsx(o),
        "apps/web/src/index.css": genStylesCss(o),
        "apps/web/src/vite-env.d.ts": genEnvDts(o),
    };
}
