//oxlint replaces eslint in the templates that use the oxc toolchain. The
//rules ship in the binary, so unlike eslint there is no plugin package, no
//parser and no resolver to install - "oxlint" is the whole setup.
//
//NOTE: "plugins" overwrites the default set rather than adding to it, so
//typescript/unicorn/oxc are repeated here alongside react. Dropping one of
//them silently disables its rules.
//
//react/react-in-jsx-scope must be off. It is on by default with the react
//plugin and predates the automatic runtime; every template here generates
//"jsx": "react-jsx", which is exactly the setup where importing React is
//unnecessary - so leaving it on means a freshly scaffolded app lints dirty.
export default function genOxlintrc() {
    const tpl = `
{
    "$schema": "./node_modules/oxlint/configuration_schema.json",
    "plugins": ["typescript", "unicorn", "oxc", "react"],
    "categories": {
        "correctness": "error",
        "suspicious": "warn"
    },
    "rules": {
        "react/react-in-jsx-scope": "off"
    },
    "env": {
        "builtin": true,
        "browser": true
    },
    "ignorePatterns": ["dist", ".next", "out", "drizzle"]
}
`;

    return tpl;
}
