export default function genAppTsx(name: string) {
    const tpl = `
import React from 'react';
import { createRoot } from 'react-dom/client';

function App()
{
    return <h1>Hello World from ${name} app!</h1>
}

const container = document.getElementById('app')!;
const root = createRoot(container);
root.render(<App />);
`;

    return tpl;
}
