//oxfmt replaces prettier in the templates that use the oxc toolchain.
//
//Indentation, line endings and the final newline are deliberately absent:
//oxfmt reads .editorconfig, where they come from indent_size / indent_style /
//end_of_line. That is the same division of labour the other templates have
//between .editorconfig and an empty .prettierrc.json - and it is why the
//format scripts point at src/ rather than at the project root, exactly as
//"prettier src --check" does there. Formatting the root would rewrite the
//generated json files to .editorconfig's 2-space setting on first run.
//
//What is set here is the part .editorconfig cannot express:
//
//  sortTailwindcss  the built-in equivalent of prettier-plugin-tailwindcss,
//                   so class lists stay in a canonical order. Only useful
//                   because every one of these templates has tailwind.
//  sortImports      the generated sources are already written in the order
//                   this produces, so turning it on costs no churn on the
//                   first "npm run format:fix".
//
//src/api/ is ignored because "npm run api:gen" rewrites those files from the
//Bruno collection every time it runs - formatting them is churn that comes
//straight back on the next regeneration. Same reasoning as bin/** being in
//this CLI's own .prettierignore. Both paths are listed so one config serves
//the flat layout and the monorepo; oxfmt ignores a pattern that matches
//nothing.
export default function genOxfmtrc() {
    const tpl = `
{
    "$schema": "./node_modules/oxfmt/configuration_schema.json",
    "sortTailwindcss": true,
    "sortImports": true,
    "ignorePatterns": ["src/api", "apps/web/src/api"]
}
`;

    return tpl;
}
