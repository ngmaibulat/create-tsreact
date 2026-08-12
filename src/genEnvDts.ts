//Without this, "tsc --noEmit" fails on the CSS import in app.tsx/popup.tsx
//with TS2307. esbuild resolves it fine; TypeScript needs to be told.
export default function genEnvDts() {
    const tpl = `
declare module "*.css";
`;

    return tpl;
}
