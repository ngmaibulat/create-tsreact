//Separate from genTsConfig.ts rather than another branch inside it: that one
//describes an esbuild app whose stylesheet needs a hand-written module
//declaration (src/env.d.ts), while this one gets the same thing plus
//import.meta.env and the ?url / ?raw suffixes from vite's own types.
//
//"types": ["vite/client"] opts out of every other ambient @types package,
//which is fine here for the same reason it is in the extension template:
//@types/react and @types/react-dom are module types resolved through imports.
//
//noUnusedLocals and verbatimModuleSyntax are deliberately absent. Both are in
//vite's own scaffold, and both would fail the build on code this CLI
//generates rather than on code the user wrote - src/api/ is emitted from a
//Bruno collection and is shared with the templates that do not set them.
export default function genViteTsConfig() {
    const tpl = `
{
    "compilerOptions": {
        "target": "ES2022",
        "useDefineForClassFields": true,
        "lib": ["DOM", "DOM.Iterable", "ES2022"],
        "types": ["vite/client"],
        "skipLibCheck": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "strict": true,
        "forceConsistentCasingInFileNames": true,
        "module": "ESNext",
        "moduleResolution": "bundler",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx"
    },
    "include": ["src"]
}
`;

    return tpl;
}
