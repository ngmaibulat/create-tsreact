### TS/React Scaffolder using esbuild compiler/bundler

### Motivation

Some scaffolders/generators create quite a lot files. Both in regards of project files and dependencies.
Look into size of `node_modules` folder - after using some of popular scaffolders... While this potentially expands available functionality - it makes harder for people to learn/understand things and focus on technology.

So, I wanted to create a scaffolder for React/Typescript projects with absolute minimum of code/files/dependencies and with a fast bundler (`esbuild`). As learning goes on - people can add additional complexity themselves...

This scaffolder should be:

-   fast to run itself
-   fast for `npm install`
-   easy to review/understand created files
-   using esbuild makes it fast to compile/bundle

It also would add `prettier` as dev dependency. For Visual Studio Code, it is recommended to use
extension: https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode

You can also use prettier from CLI:

-   `npm run format:check`
-   `npm run format:fix`

While being light-weight, it still gives you a working environment for React/Typescript!

Feel free to report any issues or ask for features at Github Issues:
https://github.com/ngmaibulat/create-tsreact/issues

### Use

```sh
npm create tsreact@latest <appname>
cd <appname>
npm install
npm run dev
```
