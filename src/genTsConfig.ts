export default function genTsConfig() {
    const tpl = `
{
    "compilerOptions": {
      "target": "ES2022",
      "useDefineForClassFields": true,
      "lib": ["DOM", "DOM.Iterable", "ES2022"],
      "allowJs": true,
      "skipLibCheck": true,
      "esModuleInterop": false,
      "allowSyntheticDefaultImports": true,
      "strict": true,
      "forceConsistentCasingInFileNames": true,
      "module": "ES2022",
      "moduleResolution": "NodeNext",
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
