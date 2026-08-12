#!/usr/bin/env node

// node_modules/chalk/source/vendor/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
  modifier: {
    reset: [0, 0],
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    blackBright: [90, 39],
    gray: [90, 39],
    grey: [90, 39],
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    bgGrey: [100, 49],
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value2 = Math.max(red, green, blue) * 2;
        if (value2 === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value2 === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "process";
import os from "os";
import tty from "tty";
function hasFlag(flag, argv = process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
var { env } = process2;
var flagForceColor;
if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
  flagForceColor = 0;
} else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
  flagForceColor = 1;
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== void 0) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if (haveStream && !streamIsTTY && forceColor === void 0) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app":
        return version >= 3 ? 3 : 2;
      case "Apple_Terminal":
        return 2;
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var supportsColor = {
  stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
  stderr: createSupportsColor({ isTTY: tty.isatty(2) })
};
var supports_color_default = supportsColor;

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}

// node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = supports_color_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = /* @__PURE__ */ Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk.prototype);
  return chalk2;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles2[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles2.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles2[model] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {
}, {
  ...styles2,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    }
  }
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === void 0) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === void 0) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== void 0) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf("\n");
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;

// src/index.ts
import fs3 from "fs";
import path3 from "path";

// src/bruno/spec.ts
var METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options"
];
var SAFE = ["get", "head"];
var SAMPLE_MODES = ["safe", "all", "none"];
var SAMPLES_VERSION = 1;
function origins(spec) {
  const seen = /* @__PURE__ */ new Set();
  for (const e of spec.endpoints) {
    const url = substitute(e.url, spec.vars);
    try {
      seen.add(new URL(url).origin + "/*");
    } catch {
    }
  }
  return [...seen].sort();
}
function substitute(text2, vars) {
  return text2.replace(
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    (whole, key) => key in vars ? vars[key] : whole
  );
}
function unresolved(text2) {
  const out = /* @__PURE__ */ new Set();
  for (const m of text2.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) {
    out.add(m[1]);
  }
  return [...out];
}

// src/bruno/emit.ts
function pascal(name) {
  return name[0].toUpperCase() + name.slice(1);
}
function isQuery(e) {
  return SAFE.includes(e.method);
}
function queries(spec) {
  return spec.endpoints.filter(isQuery);
}
function mutations(spec) {
  return spec.endpoints.filter((e) => !isQuery(e));
}
function commonPrefix(urls) {
  if (urls.length === 0) {
    return "";
  }
  let prefix = urls[0];
  for (const url of urls.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < url.length && prefix[i] === url[i]) {
      i++;
    }
    prefix = prefix.slice(0, i);
  }
  const cut = prefix.lastIndexOf("/");
  prefix = cut === -1 ? "" : prefix.slice(0, cut);
  return /^https?:\/\/[^/]+/.test(prefix) ? prefix : "";
}
function resolvedUrls(spec) {
  const out = /* @__PURE__ */ new Map();
  for (const e of spec.endpoints) {
    out.set(e.name, substitute(e.url, spec.vars));
  }
  return out;
}
function baseUrl(spec) {
  const urls = [...resolvedUrls(spec).values()].filter(
    (u) => !unresolved(u).length
  );
  return commonPrefix(urls);
}
function pathOf(spec, e) {
  const url = resolvedUrls(spec).get(e.name);
  const base = baseUrl(spec);
  if (base && url.startsWith(base + "/")) {
    return url.slice(base.length);
  }
  return url;
}
function pathExpression(path4, params) {
  if (params.length === 0) {
    return str(path4);
  }
  let out = path4;
  for (const name of params) {
    out = out.replace(`/:${name}`, "/${segment(params." + name + ")}");
  }
  return "`" + out + "`";
}
function paramsType(e, indent = "    ") {
  const lines = [
    ...e.path.map((p) => `${indent}${p}: string | number;`),
    ...e.query.map((q) => `${indent}${quoteKey(q)}?: string | number;`)
  ];
  return lines.join("\n");
}
function hasParams(e) {
  return e.path.length > 0 || e.query.length > 0;
}
function quoteKey(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : str(key);
}
function str(value2) {
  return `'${value2.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}
function access(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `params.${key}` : `params[${str(key)}]`;
}
function queryObject(e, indent) {
  if (e.query.length === 0) {
    return "";
  }
  const pairs = e.query.map((q) => `${indent}    ${quoteKey(q)}: ${access(q)},`).join("\n");
  return `
${indent}query: {
${pairs}
${indent}},`;
}
function staticHeaders(e, vars) {
  const out = {};
  for (const [key, template] of Object.entries(e.headers)) {
    if (/^(authorization|cookie|proxy-authorization)$/i.test(key)) {
      continue;
    }
    const value2 = substitute(template, vars);
    if (!unresolved(value2).length) {
      out[key] = value2;
    }
  }
  return out;
}
function headersObject(e, vars, indent) {
  const headers = staticHeaders(e, vars);
  const keys = Object.keys(headers);
  if (keys.length === 0) {
    return "";
  }
  const pairs = keys.map((k) => `${indent}    ${quoteKey(k)}: ${str(headers[k])},`).join("\n");
  return `
${indent}headers: {
${pairs}
${indent}},`;
}
function banner(spec) {
  return `//Generated by create-tsreact from the Bruno collection in ${spec.dir}
//Do not edit: "npm run api:gen" overwrites this file.
//Response types were inferred from real responses captured in api/samples.json.`;
}

// src/cli.ts
import fs from "fs";
import path from "path";
var TEMPLATES = ["react", "extension", "pwa", "expo"];
var DESCRIPTIONS = {
  react: "browser app, esbuild dev server with live reload",
  extension: "Chrome MV3 extension: popup + content script + background",
  pwa: "installable offline app: manifest + service worker",
  expo: "React Native app on Expo SDK 57 (metro, not esbuild)"
};
var CliError = class extends Error {
};
function readVersion() {
  const url = new URL("../package.json", import.meta.url);
  const pkg = JSON.parse(fs.readFileSync(url, "utf8"));
  return pkg.version;
}
function validateName(name) {
  if (!name) {
    throw new CliError("App name must not be empty");
  }
  if (name.includes("..")) {
    throw new CliError(`App name must not contain "..": ${name}`);
  }
  if (/[/\\]/.test(name)) {
    throw new CliError(
      `App name must not contain a path separator: ${name}`
    );
  }
  if (/^[._]/.test(name)) {
    throw new CliError(`App name must not start with "." or "_": ${name}`);
  }
  if (/["\\\p{Cc}]/u.test(name)) {
    throw new CliError(
      `App name contains an unsupported character: ${name}`
    );
  }
  return name;
}
function assertTargetUsable(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  if (!fs.statSync(dir).isDirectory()) {
    throw new CliError(`Not a directory: ${dir}`);
  }
  const entries2 = fs.readdirSync(dir).filter((e) => e !== ".git");
  if (entries2.length > 0) {
    throw new CliError(`Directory is not empty: ${dir}`);
  }
}
function recordedCollection(dir) {
  const file = path.join(dir, "package.json");
  if (!fs.existsSync(file)) {
    return void 0;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    const recorded = pkg?.tsreact?.api;
    return typeof recorded === "string" ? recorded : void 0;
  } catch {
    return void 0;
  }
}
function parseTemplate(value2) {
  if (!value2) {
    throw new CliError(
      "--template needs a value: " + TEMPLATES.join(" | ")
    );
  }
  if (!TEMPLATES.includes(value2)) {
    throw new CliError(
      `Unknown template "${value2}". Expected: ${TEMPLATES.join(" | ")}`
    );
  }
  return value2;
}
function parseMode(value2) {
  if (!value2 || !SAMPLE_MODES.includes(value2)) {
    throw new CliError(
      `--api-sample expects one of: ${SAMPLE_MODES.join(" | ")}`
    );
  }
  return value2;
}
function value(argv, i, flag) {
  const arg = argv[i];
  if (arg === flag) {
    const next = argv[i + 1];
    if (next === void 0 || next.startsWith("-")) {
      throw new CliError(`${flag} needs a value`);
    }
    return { value: next, skip: 1 };
  }
  return { value: arg.slice(flag.length + 1), skip: 0 };
}
function parseArgs(argv) {
  let template = "react";
  let tailwind = false;
  let daisyui = false;
  let target = "";
  let api = "";
  let env2;
  let mode = "safe";
  let refresh = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return { kind: "help" };
    }
    if (arg === "--version" || arg === "-v") {
      return { kind: "version" };
    }
    if (arg === "--template" || arg === "-t") {
      template = parseTemplate(argv[++i]);
      continue;
    }
    if (arg.startsWith("--template=")) {
      template = parseTemplate(arg.slice("--template=".length));
      continue;
    }
    if (arg === "--tailwind") {
      tailwind = true;
      continue;
    }
    if (arg === "--daisyui") {
      daisyui = true;
      continue;
    }
    if (arg === "--api" || arg.startsWith("--api=")) {
      const got = value(argv, i, "--api");
      api = got.value;
      i += got.skip;
      continue;
    }
    if (arg === "--api-env" || arg.startsWith("--api-env=")) {
      const got = value(argv, i, "--api-env");
      env2 = got.value;
      i += got.skip;
      continue;
    }
    if (arg === "--api-sample" || arg.startsWith("--api-sample=")) {
      const got = value(argv, i, "--api-sample");
      mode = parseMode(got.value);
      i += got.skip;
      continue;
    }
    if (arg === "--refresh") {
      refresh = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new CliError(`Unknown option: ${arg}`);
    }
    if (target) {
      throw new CliError(`Unexpected argument: ${arg}`);
    }
    target = arg;
  }
  if (target === "api" && recordedCollection(process.cwd())) {
    return { kind: "api", dir: process.cwd(), env: env2, mode, refresh };
  }
  if (daisyui) {
    tailwind = true;
  }
  if (tailwind && template === "expo") {
    throw new CliError(
      "--tailwind is not supported by the expo template: React Native has no CSS"
    );
  }
  if (refresh && !api) {
    throw new CliError("--refresh only applies with --api");
  }
  if (!target) {
    return { kind: "usage" };
  }
  const normalised = path.normalize(target);
  const dir = path.resolve(normalised);
  const name = validateName(path.basename(dir));
  assertTargetUsable(dir);
  return {
    kind: "create",
    dir,
    opts: { name, template, tailwind, daisyui },
    api: api ? { dir: path.resolve(api), env: env2, mode, refresh } : void 0
  };
}

// src/bruno/sample.ts
var TIMEOUT_MS = 1e4;
var CONCURRENCY = 4;
function resolveVars(spec) {
  const vars = { ...spec.vars };
  const wanted = /* @__PURE__ */ new Set();
  for (const e of spec.endpoints) {
    for (const template of [e.url, ...Object.values(e.headers)]) {
      for (const name of unresolved(substitute(template, vars))) {
        wanted.add(name);
      }
    }
  }
  for (const name of wanted) {
    const value2 = process.env[name];
    if (value2 !== void 0) {
      vars[name] = value2;
    }
  }
  return vars;
}
function buildUrl(e, vars) {
  let url = substitute(e.url, vars);
  for (const name of e.path) {
    const value2 = substitute(e.pathValues[name] ?? "", vars);
    if (!value2) {
      return { error: `no value for path parameter :${name}` };
    }
    url = url.replace(`/:${name}`, `/${encodeURIComponent(value2)}`);
  }
  const missing = unresolved(url);
  if (missing.length) {
    return {
      error: `unresolved variable${missing.length > 1 ? "s" : ""} ${missing.map((m) => `{{${m}}}`).join(", ")} - set ${missing.join(
        ", "
      )} in the environment`
    };
  }
  const pairs = e.query.map((key) => [key, substitute(e.queryValues[key] ?? "", vars)]).filter(([, value2]) => value2 && !unresolved(value2).length);
  const search = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return { url: search ? `${url}?${search}` : url };
}
function buildHeaders(e, vars) {
  const out = {};
  for (const [key, template] of Object.entries(e.headers)) {
    const value2 = substitute(template, vars);
    if (!unresolved(value2).length) {
      out[key] = value2;
    }
  }
  return out;
}
async function request(fetchFn, e, vars) {
  const built = buildUrl(e, vars);
  if (built.error) {
    return { skipped: built.error };
  }
  const headers = buildHeaders(e, vars);
  const init = { method: e.method.toUpperCase(), headers };
  if (e.body && e.method !== "get" && e.method !== "head") {
    init.body = substitute(e.body, vars);
    headers["Content-Type"] ??= "application/json";
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  init.signal = controller.signal;
  try {
    const res = await fetchFn(built.url, init);
    if (!res.ok) {
      return { skipped: `HTTP ${res.status}` };
    }
    const type = res.headers.get("content-type") ?? "";
    const text2 = await res.text();
    if (!text2.trim()) {
      return { status: res.status, body: null };
    }
    try {
      return { status: res.status, body: JSON.parse(text2) };
    } catch {
      return {
        skipped: `response is not json${type ? ` (content-type: ${type})` : ""}`
      };
    }
  } catch (err) {
    const message = err.message || String(err);
    return {
      skipped: controller.signal.aborted ? `timed out after ${TIMEOUT_MS}ms` : `request failed: ${message}`
    };
  } finally {
    clearTimeout(timer);
  }
}
async function pool(items, run) {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, items.length) },
    async () => {
      while (next < items.length) {
        await run(items[next++]);
      }
    }
  );
  await Promise.all(workers);
}
async function collect(spec, opts) {
  const samples = {};
  const todo = [];
  for (const e of spec.endpoints) {
    if (!opts.refresh && opts.previous[e.name]) {
      samples[e.name] = opts.previous[e.name];
      continue;
    }
    if (opts.mode === "none") {
      samples[e.name] = { skipped: "not sampled (--api-sample=none)" };
      continue;
    }
    if (opts.mode === "safe" && !SAFE.includes(e.method)) {
      samples[e.name] = {
        skipped: `${e.method.toUpperCase()} not sampled (--api-sample=safe)`
      };
      continue;
    }
    todo.push(e);
  }
  if (todo.length === 0) {
    return samples;
  }
  const fetchFn = globalThis.fetch;
  if (!fetchFn) {
    throw new CliError(
      "Sampling needs global fetch (Node 18+). Re-run with --api-sample=none."
    );
  }
  const vars = resolveVars(spec);
  await pool(todo, async (e) => {
    samples[e.name] = await request(fetchFn, e, vars);
  });
  const failures = todo.filter((e) => "skipped" in samples[e.name]);
  if (failures.length === todo.length) {
    const first = samples[failures[0].name];
    throw new CliError(
      `Could not sample any endpoint (${todo.length} tried).
First failure - ${failures[0].name}: ${first.skipped}
Re-run with --api-sample=none to generate without sampling.`
    );
  }
  return samples;
}
function serialise(spec, samples) {
  const ordered = {};
  for (const e of spec.endpoints) {
    if (samples[e.name]) {
      ordered[e.name] = samples[e.name];
    }
  }
  const file = {
    version: SAMPLES_VERSION,
    endpoints: ordered
  };
  return JSON.stringify(file, null, 4);
}
function deserialise(text2, file) {
  let parsed;
  try {
    parsed = JSON.parse(text2);
  } catch (err) {
    throw new CliError(
      `${file} is not valid json: ${err.message}`
    );
  }
  if (parsed.version !== SAMPLES_VERSION) {
    throw new CliError(
      `${file} was written by a different version of create-tsreact (found ${parsed.version}, expected ${SAMPLES_VERSION}). Delete it and re-run with --refresh.`
    );
  }
  return parsed.endpoints ?? {};
}

// src/genApiClient.ts
function genApiClient(o) {
  const spec = o.api;
  const tpl = `
${banner(spec)}

import { config } from './config';

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly body: unknown,
        readonly url: string
    ) {
        super(\`\${status} \${url}\`);
        this.name = 'ApiError';
    }
}

export type RequestOpts = {
    method: string;
    path: string;
    query?: Record<string, string | number | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
};

//path parameters go through this rather than straight into the template, so
//an id containing a slash cannot escape into the url as a new segment
export function segment(value: string | number) {
    return encodeURIComponent(String(value));
}

//an undefined query parameter is dropped rather than sent as "undefined"
function search(query: RequestOpts['query']) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined && value !== '') {
            params.set(key, String(value));
        }
    }

    const text = params.toString();
    return text ? \`?\${text}\` : '';
}

export async function request<T>(opts: RequestOpts): Promise<T> {
    const url = \`\${config.baseUrl}\${opts.path}\${search(opts.query)}\`;

    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...opts.headers,
        ...config.headers,
    };

    if (config.token) {
        headers.Authorization = \`Bearer \${config.token}\`;
    }

    if (opts.body !== undefined) {
        headers['Content-Type'] ??= 'application/json';
    }

    const res = await fetch(url, {
        method: opts.method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: opts.signal,
    });

    //read the body before throwing: an error payload is usually the only
    //thing that says *why* the call failed
    const text = await res.text();
    let parsed: unknown = undefined;

    if (text) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
    }

    if (!res.ok) {
        throw new ApiError(res.status, parsed, url);
    }

    return parsed as T;
}
`;
  return tpl;
}

// src/genApiConfig.ts
function genApiConfig(o) {
  const spec = o.api;
  const base = baseUrl(spec);
  const note = spec.secrets.length ? `
//The collection declares these as secrets: ${spec.secrets.join(
    ", "
  )}.
//Bruno keeps their values outside the .bru files, so they are not here either.` : "";
  const tpl = `
//Settings for the generated API client.
//
//This is the only file under src/api/ that "npm run api:gen" leaves alone -
//everything else here is overwritten. Edit freely.${note}

export type ApiConfig = {
    baseUrl: string;
    //sent as "Authorization: Bearer <token>" when set
    token?: string;
    //merged into every request, after the generated per-request headers
    headers?: Record<string, string>;
};

export const config: ApiConfig = {
    baseUrl: ${str(base)},
    token: undefined,
};
`;
  return tpl;
}

// src/genApiIndex.ts
function genApiIndex(o) {
  const spec = o.api;
  const lines = ["export * from './client';", "export * from './config';"];
  if (queries(spec).length) {
    lines.push("export * from './keys';", "export * from './queries';");
  }
  if (mutations(spec).length) {
    lines.push("export * from './mutations';");
  }
  lines.push("export type * from './types';");
  const tpl = `
${banner(spec)}

${lines.join("\n")}
`;
  return tpl;
}

// src/genApiKeys.ts
function genApiKeys(o) {
  const spec = o.api;
  const list2 = queries(spec);
  const imports = list2.filter(hasParams).map((e) => `${pascal(e.name)}Params`);
  const types = imports.length ? `
import type { ${imports.join(", ")} } from './types';
` : "";
  const entries2 = list2.map((e) => {
    const key = str(e.name);
    const of = hasParams(e) ? `(params: ${pascal(e.name)}Params) => [${key}, params] as const` : `() => [${key}] as const`;
    return `    ${e.name}: {
        all: [${key}] as const,
        of: ${of},
    },`;
  });
  const tpl = `
${banner(spec)}
${types}
export const keys = {
${entries2.join("\n")}
};
`;
  return tpl;
}

// src/genApiMutations.ts
function variables(e, name, body2) {
  if (hasParams(e) && body2) {
    return {
      type: `{ params: ${name}Params; body: ${name}Body }`,
      arg: "vars",
      params: "vars.params",
      body: "vars.body"
    };
  }
  if (hasParams(e)) {
    return {
      type: `${name}Params`,
      arg: "params",
      params: "params",
      body: void 0
    };
  }
  if (body2) {
    return {
      type: `${name}Body`,
      arg: "body",
      params: void 0,
      body: "body"
    };
  }
  return { type: "void", arg: "", params: void 0, body: void 0 };
}
function bodyField(expr) {
  if (!expr) {
    return "";
  }
  return `
                ${expr === "body" ? "body" : `body: ${expr}`},`;
}
function genApiMutations(o) {
  const spec = o.api;
  const list2 = mutations(spec);
  const invalidate = queries(spec);
  const needsSegment = list2.some((e) => e.path.length > 0);
  const typeImports = [];
  const fns = list2.map((e) => {
    const name = pascal(e.name);
    const hasBody = Boolean(e.body);
    const vars = variables(e, name, hasBody);
    typeImports.push(`${name}Response`);
    if (hasParams(e)) {
      typeImports.push(`${name}Params`);
    }
    if (hasBody) {
      typeImports.push(`${name}Body`);
    }
    const unwrap = vars.params && vars.params !== "params" ? `
            const params = ${vars.params};
` : "";
    const path4 = pathExpression(pathOf(spec, e), e.path);
    const siblings = invalidate.filter((q) => q.folder === e.folder);
    const targets = siblings.length ? siblings : invalidate;
    const scope = siblings.length ? `every query in the '${e.folder || "root"}' folder` : "every query in the collection";
    const onSuccess = targets.length ? `
        onSuccess: () => {
            //${scope} - edit this list to taste
${targets.map(
      (q) => `            client.invalidateQueries({ queryKey: keys.${q.name}.all });`
    ).join("\n")}
        },` : "";
    const arrow = unwrap ? `(${vars.arg}: ${vars.type}) => {${unwrap}
            return request<${name}Response>({
                method: '${e.method.toUpperCase()}',
                path: ${path4},${queryObject(
      e,
      "                "
    )}${headersObject(e, spec.vars, "                ")}${bodyField(
      vars.body
    )}
            });
        }` : `(${vars.arg ? `${vars.arg}: ${vars.type}` : ""}) =>
            request<${name}Response>({
                method: '${e.method.toUpperCase()}',
                path: ${path4},${queryObject(
      e,
      "                "
    )}${headersObject(e, spec.vars, "                ")}${bodyField(
      vars.body
    )}
            })`;
    return `//${e.method.toUpperCase()} ${e.url}
export function use${name}() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: ${arrow},${onSuccess}
    });
}`;
  });
  const unique = [...new Set(typeImports)];
  const tpl = `
${banner(spec)}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request${needsSegment ? ", segment" : ""} } from './client';${invalidate.length ? `
import { keys } from './keys';` : ""}
import type { ${unique.join(", ")} } from './types';

${fns.join("\n\n")}
`;
  return tpl;
}

// src/genApiQueries.ts
function genApiQueries(o) {
  const spec = o.api;
  const list2 = queries(spec);
  const needsSegment = list2.some((e) => e.path.length > 0);
  const typeImports = list2.flatMap((e) => [
    `${pascal(e.name)}Response`,
    ...hasParams(e) ? [`${pascal(e.name)}Params`] : []
  ]);
  const fns = list2.map((e) => {
    const name = pascal(e.name);
    const arg = hasParams(e) ? `params: ${name}Params` : "";
    const path4 = pathExpression(pathOf(spec, e), e.path);
    return `export function ${e.name}Query(${arg}) {
    return queryOptions({
        queryKey: keys.${e.name}.of(${hasParams(e) ? "params" : ""}),
        queryFn: ({ signal }) =>
            request<${name}Response>({
                method: '${e.method.toUpperCase()}',
                path: ${path4},${queryObject(
      e,
      "                "
    )}${headersObject(e, spec.vars, "                ")}
                signal,
            }),
    });
}`;
  });
  const tpl = `
${banner(spec)}

import { queryOptions } from '@tanstack/react-query';

import { request${needsSegment ? ", segment" : ""} } from './client';
import { keys } from './keys';
import type { ${typeImports.join(", ")} } from './types';

${fns.join("\n\n")}
`;
  return tpl;
}

// src/bruno/infer.ts
var PRIMS = ["string", "number", "boolean", "null"];
var MAX_DEPTH = 12;
function empty() {
  return { prims: /* @__PURE__ */ new Set() };
}
function observe(shape, value2, depth = 0) {
  if (depth > MAX_DEPTH) {
    return;
  }
  if (value2 === null) {
    shape.prims.add("null");
    return;
  }
  if (Array.isArray(value2)) {
    shape.array ??= empty();
    for (const item of value2) {
      observe(shape.array, item, depth + 1);
    }
    return;
  }
  if (typeof value2 === "object") {
    shape.object ??= { total: 0, fields: /* @__PURE__ */ new Map() };
    shape.object.total++;
    for (const [key, item] of Object.entries(value2)) {
      let field = shape.object.fields.get(key);
      if (!field) {
        field = { shape: empty(), seen: 0 };
        shape.object.fields.set(key, field);
      }
      field.seen++;
      observe(field.shape, item, depth + 1);
    }
    return;
  }
  if (typeof value2 === "string") {
    shape.prims.add("string");
  } else if (typeof value2 === "number") {
    shape.prims.add("number");
  } else if (typeof value2 === "boolean") {
    shape.prims.add("boolean");
  }
}
function ident(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}
function renderObject(obj, indent) {
  if (obj.fields.size === 0) {
    return "Record<string, unknown>";
  }
  const inner = indent + "    ";
  const lines = [...obj.fields].map(([key, field]) => {
    const optional = field.seen < obj.total ? "?" : "";
    return `${inner}${ident(key)}${optional}: ${render(
      field.shape,
      inner
    )};`;
  });
  return `{
${lines.join("\n")}
${indent}}`;
}
function parts(shape, indent) {
  const out = PRIMS.filter((p) => shape.prims.has(p));
  if (shape.array) {
    const inner = parts(shape.array, indent);
    const element = inner.length ? inner.join(" | ") : "unknown";
    out.push(inner.length > 1 ? `(${element})[]` : `${element}[]`);
  }
  if (shape.object) {
    out.push(renderObject(shape.object, indent));
  }
  return out;
}
function render(shape, indent = "") {
  const out = parts(shape, indent);
  return out.length ? out.join(" | ") : "unknown";
}
function infer(values, indent = "") {
  if (values.length === 0) {
    return "unknown";
  }
  const shape = empty();
  for (const value2 of values) {
    observe(shape, value2, 0);
  }
  return render(shape, indent);
}

// src/genApiTypes.ts
function inferBody(e, vars) {
  if (!e.body) {
    return void 0;
  }
  const substituted = substitute(e.body, vars);
  for (const text2 of [
    substituted,
    substituted.replace(/\{\{[\w.-]+\}\}/g, "x")
  ]) {
    try {
      return infer([JSON.parse(text2)]);
    } catch {
    }
  }
  return "unknown";
}
function responseType(spec, e) {
  const sample = spec.samples[e.name];
  if (!sample || "skipped" in sample) {
    const why = sample ? sample.skipped : "no sample";
    return `//not sampled: ${why}
export type ${pascal(
      e.name
    )}Response = unknown;`;
  }
  return `export type ${pascal(e.name)}Response = ${infer([sample.body])};`;
}
function genApiTypes(o) {
  const spec = o.api;
  const blocks = [];
  for (const e of spec.endpoints) {
    const name = pascal(e.name);
    const parts2 = [
      `//${e.method.toUpperCase()} ${e.url}${e.folder ? `  (${e.folder})` : ""}`
    ];
    if (hasParams(e)) {
      parts2.push(`export type ${name}Params = {
${paramsType(e)}
};`);
    }
    const body2 = isQuery(e) ? void 0 : inferBody(e, spec.vars);
    if (body2) {
      parts2.push(`export type ${name}Body = ${body2};`);
    }
    parts2.push(responseType(spec, e));
    blocks.push(parts2.join("\n"));
  }
  const tpl = `
${banner(spec)}

${blocks.join("\n\n")}
`;
  return tpl;
}

// src/apiFiles.ts
var PRESERVED = "src/api/config.ts";
function apiFiles(o) {
  const spec = o.api;
  if (!spec) {
    return {};
  }
  const files = {
    [PRESERVED]: genApiConfig(o),
    "src/api/client.ts": genApiClient(o),
    "src/api/types.ts": genApiTypes(o),
    "src/api/index.ts": genApiIndex(o),
    "api/samples.json": serialise(spec, spec.samples)
  };
  if (queries(spec).length) {
    files["src/api/keys.ts"] = genApiKeys(o);
    files["src/api/queries.ts"] = genApiQueries(o);
  }
  if (mutations(spec).length) {
    files["src/api/mutations.ts"] = genApiMutations(o);
  }
  return files;
}

// src/bruno/collection.ts
import fs2 from "fs";
import path2 from "path";

// src/bruno/parse.ts
function isTextBlock(name) {
  return name.startsWith("body") || name.startsWith("script") || name === "tests" || name === "docs";
}
function isNameChar(ch) {
  return /[\w:.-]/.test(ch);
}
function findEnd(src, from, open, text2) {
  const close = open === "{" ? "}" : "]";
  let depth = 1;
  let i = from;
  while (i < src.length) {
    const ch = src[i];
    if (text2 && src.startsWith("'''", i)) {
      const end = src.indexOf("'''", i + 3);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    if (text2 && ch === '"') {
      i++;
      while (i < src.length && src[i] !== '"') {
        i += src[i] === "\\" ? 2 : 1;
      }
      i++;
      continue;
    }
    if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  return -1;
}
function parseBru(src, file) {
  const blocks = /* @__PURE__ */ new Map();
  let i = 0;
  while (i < src.length) {
    while (i < src.length && /\s/.test(src[i])) {
      i++;
    }
    if (src[i] === "#") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl + 1;
      continue;
    }
    if (i >= src.length) {
      break;
    }
    const start = i;
    while (i < src.length && isNameChar(src[i])) {
      i++;
    }
    const name = src.slice(start, i);
    while (i < src.length && /[ \t]/.test(src[i])) {
      i++;
    }
    const open = src[i];
    if (!name || open !== "{" && open !== "[") {
      throw new CliError(
        `Could not parse ${file}: expected a block at character ${start}`
      );
    }
    const text2 = open === "{" && isTextBlock(name);
    const end = findEnd(src, i + 1, open, text2);
    if (end === -1) {
      throw new CliError(
        `Could not parse ${file}: block "${name}" is never closed`
      );
    }
    const kind = open === "[" ? "list" : text2 ? "text" : "dict";
    blocks.set(name, { name, kind, content: src.slice(i + 1, end) });
    i = end + 1;
  }
  return blocks;
}
function entries(block) {
  if (!block) {
    return [];
  }
  const lines = block.content.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const raw = line.slice(0, colon).trim();
    const enabled = !raw.startsWith("~");
    const key = enabled ? raw : raw.slice(1).trim();
    let value2 = line.slice(colon + 1).trim();
    if (value2 === "'''") {
      const body2 = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "'''") {
        body2.push(lines[i]);
        i++;
      }
      value2 = dedent(body2).join("\n");
    }
    out.push({ key, value: value2, enabled });
  }
  return out;
}
function dict(block) {
  const out = {};
  for (const e of entries(block)) {
    if (e.enabled) {
      out[e.key] = e.value;
    }
  }
  return out;
}
function list(block) {
  if (!block) {
    return [];
  }
  return block.content.split("\n").map((l) => l.trim().replace(/,$/, "")).filter((l) => l && !l.startsWith("#"));
}
function dedent(lines) {
  const width = lines.filter((l) => l.trim()).reduce(
    (min, l) => Math.min(min, l.length - l.trimStart().length),
    Infinity
  );
  if (!Number.isFinite(width) || width === 0) {
    return lines;
  }
  return lines.map((l) => l.trim() ? l.slice(width) : l);
}
function text(block) {
  if (!block) {
    return void 0;
  }
  const lines = block.content.split("\n");
  while (lines.length && !lines[0].trim()) {
    lines.shift();
  }
  while (lines.length && !lines[lines.length - 1].trim()) {
    lines.pop();
  }
  return lines.length ? dedent(lines).join("\n") : void 0;
}

// src/bruno/collection.ts
var IGNORED = /* @__PURE__ */ new Set(["node_modules", "environments"]);
var NOT_REQUESTS = /* @__PURE__ */ new Set(["collection.bru", "folder.bru"]);
function walk(dir, base = "", all = false) {
  const out = [];
  for (const entry of fs2.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || IGNORED.has(entry.name)) {
      continue;
    }
    const full = path2.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(
        ...walk(full, base ? `${base}/${entry.name}` : entry.name, all)
      );
      continue;
    }
    if (entry.name.endsWith(".bru") && (all || !NOT_REQUESTS.has(entry.name))) {
      out.push({ file: full, folder: base });
    }
  }
  return out;
}
function slug(name) {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) {
    return "_";
  }
  const joined = words.map(
    (w, i) => i === 0 ? w[0].toLowerCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1)
  ).join("");
  return /^[0-9]/.test(joined) ? `_${joined}` : joined;
}
function pathParams(url) {
  return [...url.matchAll(/\/:(\w+)/g)].map((m) => m[1]);
}
function splitQuery(url) {
  const at = url.indexOf("?");
  if (at === -1) {
    return { url, keys: [] };
  }
  const keys = url.slice(at + 1).split("&").map((pair) => pair.split("=")[0].trim()).filter(Boolean);
  return { url: url.slice(0, at), keys };
}
function splitQueryValues(url) {
  const at = url.indexOf("?");
  const out = {};
  if (at === -1) {
    return out;
  }
  for (const pair of url.slice(at + 1).split("&")) {
    const eq = pair.indexOf("=");
    if (eq > 0) {
      out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
  }
  return out;
}
function readRequest(file, folder) {
  const blocks = parseBru(fs2.readFileSync(file, "utf8"), file);
  const method = METHODS.find((m) => blocks.has(m));
  if (!method) {
    return void 0;
  }
  const call = dict(blocks.get(method));
  const meta = dict(blocks.get("meta"));
  const raw = call.url?.trim();
  if (!raw) {
    throw new CliError(`${file}: the ${method} block has no url`);
  }
  const { url, keys } = splitQuery(raw);
  const query = new Set(keys);
  for (const e of entries(blocks.get("params:query"))) {
    if (e.enabled) {
      query.add(e.key);
    } else {
      query.delete(e.key);
    }
  }
  const name = slug(meta.name || path2.basename(file, ".bru"));
  const queryValues = dict(blocks.get("params:query"));
  for (const [key, value2] of Object.entries(splitQueryValues(raw))) {
    queryValues[key] ??= value2;
  }
  return {
    name,
    method,
    url,
    path: pathParams(url),
    query: [...query],
    pathValues: dict(blocks.get("params:path")),
    queryValues,
    headers: dict(blocks.get("headers")),
    body: text(blocks.get("body:json")),
    auth: call.auth && call.auth !== "none" ? call.auth : void 0,
    folder,
    seq: Number(meta.seq) || 0
  };
}
function dedupe(endpoints) {
  const taken = /* @__PURE__ */ new Set();
  for (const e of endpoints) {
    if (!taken.has(e.name)) {
      taken.add(e.name);
      continue;
    }
    const prefixed = slug(`${e.folder} ${e.name}`);
    let next = taken.has(prefixed) ? `${prefixed}${e.seq}` : prefixed;
    for (let n = 2; taken.has(next); n++) {
      next = `${prefixed}${n}`;
    }
    e.name = next;
    taken.add(next);
  }
}
function readEnvironment(dir, wanted) {
  const envDir = path2.join(dir, "environments");
  if (!fs2.existsSync(envDir)) {
    if (wanted) {
      throw new CliError(
        `No environments/ directory in ${dir}, so --api-env ${wanted} cannot be resolved`
      );
    }
    return { vars: {}, secrets: [] };
  }
  const files = fs2.readdirSync(envDir).filter((f) => f.endsWith(".bru")).sort();
  if (files.length === 0) {
    return { vars: {}, secrets: [] };
  }
  const names = files.map((f) => path2.basename(f, ".bru"));
  if (!wanted && files.length > 1) {
    throw new CliError(
      `${dir} has several environments - pick one with --api-env: ${names.join(
        ", "
      )}`
    );
  }
  const chosen = wanted ?? names[0];
  if (!names.includes(chosen)) {
    throw new CliError(
      `Unknown environment "${chosen}". Available: ${names.join(", ")}`
    );
  }
  const blocks = parseBru(
    fs2.readFileSync(path2.join(envDir, `${chosen}.bru`), "utf8"),
    path2.join(envDir, `${chosen}.bru`)
  );
  return {
    vars: dict(blocks.get("vars")),
    secrets: list(blocks.get("vars:secret"))
  };
}
function collectionFiles(dir) {
  const out = {};
  const add = (from, rel) => {
    out[rel] = fs2.readFileSync(from, "utf8");
  };
  const brunoJson = path2.join(dir, "bruno.json");
  if (fs2.existsSync(brunoJson)) {
    add(brunoJson, "bruno.json");
  }
  const envDir = path2.join(dir, "environments");
  if (fs2.existsSync(envDir)) {
    for (const f of fs2.readdirSync(envDir)) {
      if (f.endsWith(".bru")) {
        add(path2.join(envDir, f), `environments/${f}`);
      }
    }
  }
  for (const { file } of walk(dir, "", true)) {
    add(file, path2.relative(dir, file).split(path2.sep).join("/"));
  }
  return out;
}
function readCollection(dir, env2) {
  if (!fs2.existsSync(dir) || !fs2.statSync(dir).isDirectory()) {
    throw new CliError(`Not a Bruno collection directory: ${dir}`);
  }
  let collection = path2.basename(path2.resolve(dir));
  const brunoJson = path2.join(dir, "bruno.json");
  if (fs2.existsSync(brunoJson)) {
    try {
      const parsed = JSON.parse(fs2.readFileSync(brunoJson, "utf8"));
      collection = parsed.name || collection;
    } catch (err) {
      throw new CliError(
        `${brunoJson} is not valid json: ${err.message}`
      );
    }
  }
  const endpoints = [];
  for (const { file, folder } of walk(dir)) {
    const endpoint = readRequest(file, folder);
    if (endpoint) {
      endpoints.push(endpoint);
    }
  }
  if (endpoints.length === 0) {
    throw new CliError(`No requests found in ${dir}`);
  }
  endpoints.sort(
    (a, b) => a.folder.localeCompare(b.folder) || a.seq - b.seq || a.name.localeCompare(b.name)
  );
  dedupe(endpoints);
  return { collection, ...readEnvironment(dir, env2), endpoints };
}

// src/help.ts
function usage() {
  console.log("\n");
  console.log(source_default.redBright("Please provide appname\n"));
  console.log(source_default.yellowBright("Usage:"));
  console.log(source_default.yellowBright("	npm create tsreact <appname>"));
  console.log(source_default.yellowBright("	npm init tsreact   <appname>"));
  console.log(source_default.yellowBright("	npx create-tsreact <appname>"));
  console.log(source_default.yellowBright("\nRun with --help for options"));
  console.log("\n");
}
function help(version) {
  const names = TEMPLATES.map((t) => t === "react" ? `${t} (default)` : t);
  const list2 = TEMPLATES.map(
    (t) => `    ${t.padEnd(11)} ${DESCRIPTIONS[t]}`
  ).join("\n");
  const msg = source_default.yellowBright(`
create-tsreact ${version}
`) + source_default.greenBright(`
Scaffold a TypeScript/React app built by a single esbuild command.

Usage:
    npx create-tsreact <appname> [options]
    npx create-tsreact api                  (inside a generated app)

Options:
    -t, --template <name>   ${names.join(" | ")}
        --tailwind          add Tailwind CSS v4
        --daisyui           add DaisyUI components (implies --tailwind)
        --api <dir>         generate a typed client from a Bruno collection
        --api-env <name>    which environments/<name>.bru to resolve vars from
        --api-sample <how>  safe (default) | all | none - see below
        --refresh           re-run the requests instead of replaying samples
    -h, --help              show this help
    -v, --version           show the version

Templates:
${list2}

The --api flag reads a Bruno collection, runs its requests once, and infers
TypeScript types from what the API actually returned. You get a typed client,
TanStack Query options and mutation hooks under src/api/, and the captured
responses in api/samples.json. The collection is copied into the app, so
"npm run api:gen" can regenerate later without the network.

Only GET and HEAD are executed by default: scaffolding an app must not POST to
a real API. Pass --api-sample=all to sample mutations too, or =none to skip the
network entirely and type every response as unknown.

Examples:
    npx create-tsreact myapp
    npx create-tsreact myext --template extension
    npx create-tsreact myapp --template pwa --daisyui
    npx create-tsreact myapp --api ./bruno --api-env local
    npx create-tsreact .

npm swallows unknown flags, so with "npm create" / "npm init" the options
must go after a "--" separator:

    npm create tsreact@latest myext -- --template extension
`);
  console.log(msg);
}
function tailwindNote(o) {
  if (!o.tailwind) {
    return "";
  }
  return source_default.yellowBright(`
Tailwind runs as a second watcher:`) + source_default.greenBright(`
    npm run tw      (leave this running in its own terminal)
    `);
}
function apiNote(o) {
  if (!o.api) {
    return "";
  }
  const sampled = Object.values(o.api.samples).filter(
    (s) => !("skipped" in s)
  ).length;
  const total = o.api.endpoints.length;
  return source_default.yellowBright(`
API client:`) + source_default.greenBright(`
    ${total} endpoint(s) from ${o.api.collection}, ${sampled} sampled
    src/api/       generated - "npm run api:gen" rewrites it
    src/api/config.ts  base url and token, yours to edit and kept on regen
    `) + source_default.yellowBright(
    `
Note: api/samples.json contains real response bodies captured from the
API. Read it before committing if that endpoint returns personal data.
`
  );
}
function steps(name, o) {
  const cd = name === "." ? "" : `
    cd ${name}`;
  const dir = name === "." ? "public" : `${name}/public`;
  if (o.template === "extension") {
    const msg2 = source_default.yellowBright(`
Further steps:`) + source_default.greenBright(`${cd}
    npm install
    npm run build
    `) + tailwindNote(o) + apiNote(o) + source_default.yellowBright(`
Then load it in Chrome:`) + source_default.greenBright(`
    1. open chrome://extensions
    2. enable Developer mode
    3. "Load unpacked" and select ${dir}
    `) + source_default.yellowBright(
      `
Note: select the public/ folder, not the project root - the manifest lives there.
`
    );
    console.log(msg2);
    return;
  }
  if (o.template === "expo") {
    const msg2 = source_default.yellowBright(`
Further steps:`) + source_default.greenBright(`${cd}
    npm install
    npx expo start
    `) + apiNote(o) + source_default.yellowBright(
      `
Note: the dependency versions are pinned to Expo SDK 57. After an SDK
bump, run "npx expo install --fix" to realign them.
`
    );
    console.log(msg2);
    return;
  }
  if (o.template === "pwa") {
    const msg2 = source_default.yellowBright(`
Further steps:`) + source_default.greenBright(`${cd}
    npm install
    npm run dev
    `) + tailwindNote(o) + apiNote(o) + source_default.yellowBright(`
Note on the service worker:`) + source_default.greenBright(`
    it is not registered on localhost, where it would serve a stale bundle
    and fight live reload. Run "npm run build" and serve public/ over https
    to exercise it.
    `) + source_default.yellowBright(
      `
The icons in public/ are generated from the app name - replace them
with your own artwork when you have some.
`
    );
    console.log(msg2);
    return;
  }
  const msg = source_default.yellowBright(`
Further steps:`) + source_default.greenBright(`${cd}
    npm install
    npm run dev
    `) + tailwindNote(o) + apiNote(o);
  console.log(msg);
}

// src/genAppJson.ts
function genAppJson(name) {
  const slug2 = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || name;
  const tpl = `
{
    "expo": {
        "name": "${name}",
        "slug": "${slug2}",
        "version": "1.0.0",
        "orientation": "portrait",
        "userInterfaceStyle": "light",
        "ios": {
            "supportsTablet": true
        },
        "android": {
            "predictiveBackGestureEnabled": false
        }
    }
}
`;
  return tpl;
}

// src/genEditorConfig.ts
function genEditorConfig() {
  const tpl = `
root=true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
trim_trailing_whitespace = true
insert_final_newline = true
charset = utf-8

[*.{json,md}]
indent_size = 2

[*.{js,ts}]
indent_size = 4

[Makefile]
indent_style = tab
indent_size = 4

`;
  return tpl;
}

// src/genExpoAppTsx.ts
function genExpoAppTsx(o) {
  const query = o.api ? {
    imports: `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
`,
    client: `
const queryClient = new QueryClient();
`,
    open: `
            <QueryClientProvider client={queryClient}>`,
    close: `
            </QueryClientProvider>`
  } : { imports: "", client: "", open: "", close: "" };
  const inner = o.api ? "    " : "";
  const tpl = `
${query.imports}import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
${query.client}
export default function App()
{
    return (
        <View style={styles.container}>${query.open}
${inner}            <Text style={styles.title}>Hello World from ${o.name} app!</Text>
${inner}            <StatusBar style="auto" />${query.close}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
    },
});
`;
  return tpl;
}

// src/genExpoGitIgnore.ts
function genExpoGitIgnore() {
  const tpl = `
# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo

# generated native folders
/ios
/android
`;
  return tpl;
}

// src/genExpoIndexTs.ts
function genExpoIndexTs() {
  const tpl = `
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
`;
  return tpl;
}

// src/genExpoPackageJson.ts
function genExpoPkgJson(o) {
  const deps = [
    `"expo": "~57.0.12"`,
    `"expo-status-bar": "~57.0.1"`,
    `"react": "19.2.3"`,
    `"react-native": "0.86.2"`
  ];
  if (o.api) {
    deps.unshift(`"@tanstack/react-query": "^5.90.5"`);
  }
  const api = o.api ? `
        "api:gen": "npx create-tsreact@latest api",` : "";
  const marker = o.api ? `
    "tsreact": {
        "api": "${o.api.dir}"
    },` : "";
  const tpl = `
{
    "name": "${o.name}",
    "version": "1.0.0",
    "description": "React Native application on Expo",
    "private": true,
    "main": "index.ts",${marker}
    "scripts": {${api}
        "start": "expo start",
        "android": "expo start --android",
        "ios": "expo start --ios",
        "web": "expo start --web",
        "typecheck": "tsc --noEmit",
        "format:check": "prettier . --check",
        "format:fix": "prettier . --write"
    },
    "keywords": [
        "created by tsreact"
    ],
    "author": "",
    "license": "MIT",
    "dependencies": {
        ${deps.join(",\n        ")}
    },
    "devDependencies": {
        "@types/react": "~19.2.2",
        "prettier": "^3.9.6",
        "typescript": "~6.0.3"
    }
}
`;
  return tpl;
}

// src/genExpoTsConfig.ts
function genExpoTsConfig() {
  const tpl = `
{
    "extends": "expo/tsconfig.base",
    "compilerOptions": {
      "strict": true
    },
    "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
`;
  return tpl;
}

// src/genPrettierConfig.ts
function genPrettierConfig() {
  const tpl = `{}`;
  return tpl;
}

// src/presets/expo.ts
function expo(o) {
  return {
    ...apiFiles(o),
    "package.json": genExpoPkgJson(o),
    "app.json": genAppJson(o.name),
    "tsconfig.json": genExpoTsConfig(),
    ".gitignore": genExpoGitIgnore(),
    ".editorconfig": genEditorConfig(),
    ".prettierrc.json": genPrettierConfig(),
    "index.ts": genExpoIndexTs(),
    "App.tsx": genExpoAppTsx(o)
  };
}

// src/genBackgroundTs.ts
function genBackgroundTs(name) {
  const tpl = `
chrome.runtime.onInstalled.addListener(() => {
    console.log('${name}: installed');
});

chrome.runtime.onMessage.addListener((msg, sender) => {
    console.log('${name}: message', msg, 'from tab', sender.tab?.id);
});
`;
  return tpl;
}

// src/genContentTs.ts
function genContentTs(name) {
  const tpl = `
console.log('${name}: content script running on', location.hostname);

//content scripts talk to the service worker over messages
chrome.runtime.sendMessage({ type: 'pageview', url: location.href });
`;
  return tpl;
}

// src/genEnvDts.ts
function genEnvDts() {
  const tpl = `
declare module "*.css";
`;
  return tpl;
}

// src/genExtPackageJson.ts
function genExtPkgJson(o) {
  const entries2 = "src/popup.tsx src/content.ts src/background.ts";
  const flags = "--bundle --outdir=public --format=iife --platform=browser --target=es2022";
  const tw = "tailwindcss -i src/styles.css -o src/popup.css";
  const twBuild = o.tailwind ? `${tw} --minify && ` : "";
  const twScript = o.tailwind ? `
        "tw": "${tw} --watch",
        "predev": "${tw}",` : "";
  const api = o.api ? `
        "api:gen": "npx create-tsreact@latest api",` : "";
  const deps = [`"react": "^19.2.8"`, `"react-dom": "^19.2.8"`];
  if (o.api) {
    deps.unshift(`"@tanstack/react-query": "^5.90.5"`);
  }
  const marker = o.api ? `
    "tsreact": {
        "api": "${o.api.dir}"
    },` : "";
  const dev = [
    `"esbuild": "^0.28.2"`,
    `"@types/chrome": "^0.2.5"`,
    `"@types/react": "^19.2.18"`,
    `"@types/react-dom": "^19.2.4"`,
    `"prettier": "^3.9.6"`,
    `"typescript": "^7.0.2"`
  ];
  if (o.tailwind) {
    dev.push(`"tailwindcss": "^4.3.3"`, `"@tailwindcss/cli": "^4.3.3"`);
  }
  if (o.daisyui) {
    dev.push(`"daisyui": "^5.7.16"`);
  }
  const tpl = `
{
    "name": "${o.name}",
    "version": "0.0.1",
    "description": "Chrome MV3 extension in Typescript/React",
    "private": true,
    "type": "module",${marker}
    "scripts": {
        "format:check": "prettier src --check",
        "format:fix": "prettier src --write",
        "typecheck": "tsc --noEmit",
        "test": "echo 'Error: no test specified' && exit 1",${twScript}${api}
        "build": "${twBuild}esbuild ${entries2} ${flags} --minify --sourcemap",
        "dev": "esbuild ${entries2} ${flags} --sourcemap --watch"
    },
    "keywords": [
        "created by tsreact"
    ],
    "author": "",
    "license": "MIT",
    "dependencies": {
        ${deps.join(",\n        ")}
    },
    "devDependencies": {
        ${dev.join(",\n        ")}
    }
}
`;
  return tpl;
}

// src/genGitIgnore.ts
var OUTPUT = {
  react: ["public/app.js", "public/app.css"],
  pwa: ["public/app.js", "public/app.css", "public/sw.js"],
  extension: [
    "public/popup.js",
    "public/popup.css",
    "public/content.js",
    "public/background.js"
  ]
};
var TAILWIND_OUTPUT = {
  react: "src/app.css",
  pwa: "src/app.css",
  extension: "src/popup.css"
};
function genGitIgnore(o) {
  const template = o.template;
  const generated = [...OUTPUT[template], "public/*.map"];
  if (o.tailwind) {
    generated.push(TAILWIND_OUTPUT[template]);
  }
  const output = generated.join("\n");
  const tpl = `
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript v1 declaration files
typings/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and *not* Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# esbuild output
${output}
`;
  return tpl;
}

// src/genManifest.ts
function genManifest(o) {
  const hosts = o.api ? origins(o.api) : [];
  const permissions = hosts.length ? `,
    "host_permissions": [${hosts.map((h) => `"${h}"`).join(", ")}]` : "";
  const tpl = `
{
    "manifest_version": 3,
    "name": "${o.name}",
    "version": "0.0.1",
    "description": "Chrome MV3 extension in Typescript/React",
    "action": {
        "default_popup": "popup.html",
        "default_title": "${o.name}"
    },
    "background": {
        "service_worker": "background.js"
    },
    "content_scripts": [
        {
            "matches": ["<all_urls>"],
            "js": ["content.js"]
        }
    ],
    "permissions": ["storage"]${permissions}
}
`;
  return tpl;
}

// src/genPopupCss.ts
var GENERATED = `
/* generated from src/styles.css by "npm run tw" - do not edit */
`;
function genPopupCss(o) {
  if (o.tailwind) {
    return GENERATED;
  }
  const tpl = `
body {
    margin: 0;
    font-family: system-ui, sans-serif;
}

/* a popup sizes itself to its content, so give it explicit width */
main {
    width: 240px;
    padding: 16px;
}

h1 {
    margin: 0 0 12px;
    font-size: 16px;
}
`;
  return tpl;
}

// src/genPopupHtml.ts
function genPopupHtml(name) {
  const tpl = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="popup.css">
    <title>${name}</title>
</head>
<body>
    <div id="app"></div>
    <script src="./popup.js"><\/script>
</body>
</html>
`;
  return tpl;
}

// src/genPopupTsx.ts
function genPopupTsx(o) {
  const main2 = o.tailwind ? ` className="w-60 p-4"` : "";
  const h1 = o.tailwind ? ` className="mb-3 text-base font-semibold"` : "";
  const button = o.daisyui ? ` className="btn btn-primary btn-sm"` : "";
  const query = o.api ? {
    imports: `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
`,
    client: `
const queryClient = new QueryClient();
`,
    open: `
    <QueryClientProvider client={queryClient}>
        `,
    close: `
    </QueryClientProvider>
`
  } : { imports: "", client: "", open: "", close: "" };
  const tpl = `
${query.imports}import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './popup.css';
${query.client}

function Popup()
{
    const [clicks, setClicks] = useState(0);

    //popup state is thrown away every time the popup closes, so keep it in
    //chrome.storage (declared in manifest.json under "permissions")
    useEffect(() => {
        chrome.storage.local
            .get<{ clicks?: number }>('clicks')
            .then((v) => setClicks(v.clicks ?? 0));
    }, []);

    function onClick()
    {
        const next = clicks + 1;
        setClicks(next);
        chrome.storage.local.set({ clicks: next });
    }

    return (
        <main${main2}>
            <h1${h1}>${o.name}</h1>
            <button${button} onClick={onClick}>clicked {clicks} times</button>
        </main>
    );
}

const container = document.getElementById('app')!;
const root = createRoot(container);
root.render(${query.open}<Popup />${query.close});
`;
  return tpl;
}

// src/genStylesCss.ts
function genStylesCss(o) {
  const daisyui = o.daisyui ? `

@plugin "daisyui" {
    logs: false;
}` : "";
  const html = o.template === "extension" ? "popup.html" : "index.html";
  const tpl = `
@import "tailwindcss";${daisyui}

/* v4 also finds these on its own, but naming them keeps the scan predictable
   and independent of what happens to be gitignored at the time */
@source "./**/*.{ts,tsx}";
@source "../public/${html}";

/* your own css goes here - it is compiled together with the utilities above */
`;
  return tpl;
}

// src/genTsConfig.ts
function genTsConfig(o) {
  const types = o.template === "extension" ? `
      "types": ["chrome"],` : "";
  const exclude = o.template === "pwa" ? `,
    "exclude": ["src/sw.ts"]` : "";
  const tpl = `
{
    "compilerOptions": {
      "target": "ES2022",
      "useDefineForClassFields": true,
      "lib": ["DOM", "DOM.Iterable", "ES2022"],${types}
      "allowJs": true,
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
    "include": ["src"]${exclude}
}
`;
  return tpl;
}

// src/presets/extension.ts
function extension(o) {
  const files = {
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
    "src/env.d.ts": genEnvDts()
  };
  if (o.tailwind) {
    files["src/styles.css"] = genStylesCss(o);
  }
  return files;
}

// src/png.ts
import { deflateSync } from "zlib";
var CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();
function crc32(buf) {
  let c = 4294967295;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 255] ^ c >>> 8;
  }
  return (c ^ 4294967295) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (stride + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// src/genIconPng.ts
function hash(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function hue(seed) {
  return Math.floor(
    (Math.imul(seed, 2654435761) >>> 0) / 4294967296 * 360
  );
}
function bitAt(seed, i) {
  const x = Math.imul(seed ^ Math.imul(i + 1, 2654435769), 2246822507);
  return x >>> 13 & 1;
}
function hsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255)
  ];
}
function inside(x, y, dim, r) {
  const cx = Math.min(Math.max(x, r), dim - r);
  const cy = Math.min(Math.max(y, r), dim - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}
var GRID = 5;
var SS = 2;
function genIconPng(name, size, maskable = false) {
  const seed = hash(name);
  const h = hue(seed);
  const fg = hsl(h, 0.72, 0.62);
  const bg = hsl(h, 0.45, 0.14);
  const dim = size * SS;
  const radius = maskable ? 0 : dim * 0.1875;
  const inset = Math.round(dim * (maskable ? 0.28 : 0.18));
  const cell = (dim - inset * 2) / GRID;
  const cells = [];
  let filled = 0;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const mirrored = Math.min(col, GRID - 1 - col);
      const on = bitAt(seed, row * GRID + mirrored) === 1;
      cells.push(on);
      filled += on ? 1 : 0;
    }
  }
  if (filled === 0) {
    cells[Math.floor(GRID * GRID / 2)] = true;
  }
  const big = Buffer.alloc(dim * dim * 4);
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const i = (y * dim + x) * 4;
      if (!inside(x + 0.5, y + 0.5, dim, radius)) {
        continue;
      }
      const col = Math.floor((x - inset) / cell);
      const row = Math.floor((y - inset) / cell);
      const on = col >= 0 && col < GRID && row >= 0 && row < GRID && cells[row * GRID + col];
      const [r, g, b] = on ? fg : bg;
      big[i] = r;
      big[i + 1] = g;
      big[i + 2] = b;
      big[i + 3] = 255;
    }
  }
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const j = ((y * SS + sy) * dim + (x * SS + sx)) * 4;
          r += big[j];
          g += big[j + 1];
          b += big[j + 2];
          a += big[j + 3];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, out);
}

// src/genIconSvg.ts
function genIconSvg(name) {
  const initial = name.slice(0, 1).toUpperCase();
  const tpl = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" rx="96" fill="#111827"/>
    <text x="256" y="256" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="256"
          font-weight="700" text-anchor="middle" dominant-baseline="central">${initial}</text>
</svg>
`;
  return tpl;
}

// src/genSwTs.ts
function genSwTs() {
  const tpl = `
/// <reference lib="webworker" />

//narrows the global from WorkerGlobalScope, which is what lib.webworker
//declares "self" as, to the service worker flavour that has skipWaiting()
declare const self: ServiceWorkerGlobalScope;

const VERSION = 'v1';
const SHELL = 'shell-' + VERSION;

//cache.addAll is all-or-nothing: one 404 here fails the install and the
//worker never activates, silently. Keep this in step with the build output.
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/app.css',
    '/icon.svg',
    '/icon-192.png',
    '/manifest.webmanifest',
];

function fetchAndCache(req: Request)
{
    return fetch(req).then((res) => {
        //the body can only be read once, so cache a copy and return the original
        const copy = res.clone();
        caches.open(SHELL).then((cache) => cache.put(req, copy));
        return res;
    });
}

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches
            .open(SHELL)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;

    //POSTs and cross-origin requests fall through to the network untouched
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
        return;
    }

    //navigations go to the network first so a deploy is picked up on reload,
    //and fall back to the cached shell when offline
    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req).catch(() =>
                caches.match('/index.html').then((hit) => hit ?? Response.error())
            )
        );
        return;
    }

    e.respondWith(caches.match(req).then((hit) => hit ?? fetchAndCache(req)));
});

//isolatedModules treats a file with no import or export as a global script
export {};
`;
  return tpl;
}

// src/genSwTsConfig.ts
function genSwTsConfig() {
  const tpl = `
{
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2022", "WebWorker"],
      "skipLibCheck": true,
      "strict": true,
      "forceConsistentCasingInFileNames": true,
      "module": "ESNext",
      "moduleResolution": "bundler",
      "isolatedModules": true,
      "noEmit": true
    },
    "include": ["src/sw.ts"]
}
`;
  return tpl;
}

// src/genWebManifest.ts
function genWebManifest(name) {
  const tpl = `
{
    "id": "/",
    "name": "${name}",
    "short_name": "${name}",
    "description": "Installable Typescript/React PWA",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#ffffff",
    "theme_color": "#111827",
    "icons": [
        {
            "src": "icon.svg",
            "sizes": "any",
            "type": "image/svg+xml"
        },
        {
            "src": "icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        },
        {
            "src": "icon-maskable-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
        }
    ]
}
`;
  return tpl;
}

// src/genAppCss.ts
var GENERATED2 = `
/* generated from src/styles.css by "npm run tw" - do not edit */
`;
function genAppCss(o) {
  if (o.tailwind) {
    return GENERATED2;
  }
  const tpl = `
#app {
    padding: 15px;
    margin-right: auto;
    margin-left: auto;
    border: 1px solid black;
    max-width: 50%;
}
`;
  return tpl;
}

// src/genAppTsx.ts
var REGISTER = `

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}`;
function body(o) {
  if (o.daisyui) {
    return `    return (
        <main className="card mx-auto mt-8 max-w-lg bg-base-100 shadow">
            <div className="card-body">
                <h1 className="card-title">Hello World from ${o.name} app!</h1>
                <button className="btn btn-primary">daisyUI button</button>
            </div>
        </main>
    );`;
  }
  if (o.tailwind) {
    return `    return (
        <main className="mx-auto mt-8 max-w-lg border border-black p-4">
            <h1 className="text-2xl font-bold">Hello World from ${o.name} app!</h1>
        </main>
    );`;
  }
  return `    return <h1>Hello World from ${o.name} app!</h1>`;
}
function example(o) {
  const first = o.api && queries(o.api)[0];
  if (!first) {
    return "";
  }
  const name = first.name;
  const args = hasParams(first) ? `{ /* ${name[0].toUpperCase()}${name.slice(
    1
  )}Params, see ./api/types */ }` : "";
  return `//Your API is wired up. To read from it:
//
//    import { useQuery } from '@tanstack/react-query';
//    import { ${name}Query } from './api';
//
//    const { data, isPending, error } = useQuery(${name}Query(${args}));
`;
}
function genAppTsx(o) {
  const register = o.template === "pwa" ? REGISTER : "";
  const provider = o.api ? {
    imports: `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
`,
    client: `
const queryClient = new QueryClient();
`,
    open: `
    <QueryClientProvider client={queryClient}>
        `,
    close: `
    </QueryClientProvider>
`
  } : { imports: "", client: "", open: "", close: "" };
  const tpl = `
${provider.imports}import { createRoot } from 'react-dom/client';

import './app.css';
${provider.client}
${example(o)}function App()
{
${body(o)}
}

const container = document.getElementById('app')!;
const root = createRoot(container);
root.render(${provider.open}<App />${provider.close});${register}
`;
  return tpl;
}

// src/genIndexHtml.ts
function genIndexHtml(o) {
  const pwa2 = o.template === "pwa" ? `
    <link rel="manifest" href="manifest.webmanifest">
    <meta name="theme-color" content="#111827">
    <link rel="icon" href="icon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="icon-192.png">` : "";
  const tpl = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="app.css">${pwa2}
    <title>${o.name}</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="./app.js"><\/script>
    <script>
        if (["localhost", "127.0.0.1"].includes(location.hostname)) {
            const es = new EventSource("/esbuild");
            es.onerror = () => es.close();
            es.addEventListener("change", (e) => {
                const { added, removed, updated } = JSON.parse(e.data);
                //dev builds with --sourcemap, so a css edit reports both
                ///app.css and /app.css.map - drop maps before deciding
                const changed = updated.filter((f) => !f.endsWith(".map"));

                if (!added.length && !removed.length && changed.length === 1) {
                    for (const link of document.getElementsByTagName("link")) {
                        const url = new URL(link.href);

                        if (url.host === location.host && url.pathname === changed[0]) {
                            const next = link.cloneNode();
                            next.href = changed[0] + "?" + Math.random().toString(36).slice(2);
                            next.onload = () => link.remove();
                            link.parentNode.insertBefore(next, link.nextSibling);
                            return;
                        }
                    }
                }

                location.reload();
            });
        }
    <\/script>
</body>
</html>
`;
  return tpl;
}

// src/genPackageJson.ts
var APP = "esbuild src/app.tsx --bundle --outdir=public --format=esm --platform=browser --target=es2022";
var SW = "esbuild src/sw.ts --bundle --outfile=public/sw.js --format=iife --platform=browser --target=es2022";
var TW = "tailwindcss -i src/styles.css -o src/app.css";
function genPkgJson(o) {
  const pwa2 = o.template === "pwa";
  const build = (o.tailwind ? `${TW} --minify && ` : "") + `${APP} --minify --sourcemap` + (pwa2 ? ` && ${SW} --minify` : "");
  const typecheck = pwa2 ? "tsc --noEmit && tsc --noEmit -p tsconfig.sw.json" : "tsc --noEmit";
  const tw = o.tailwind ? `
        "tw": "${TW} --watch",
        "predev": "${TW}",` : "";
  const api = o.api ? `
        "api:gen": "npx create-tsreact@latest api",` : "";
  const dev = [
    `"esbuild": "^0.28.2"`,
    `"@types/react": "^19.2.18"`,
    `"@types/react-dom": "^19.2.4"`,
    `"prettier": "^3.9.6"`,
    `"typescript": "^7.0.2"`
  ];
  if (o.tailwind) {
    dev.push(`"tailwindcss": "^4.3.3"`, `"@tailwindcss/cli": "^4.3.3"`);
  }
  if (o.daisyui) {
    dev.push(`"daisyui": "^5.7.16"`);
  }
  const description = pwa2 ? "Installable Typescript/React PWA" : "Typescript/React application";
  const deps = [`"react": "^19.2.8"`, `"react-dom": "^19.2.8"`];
  if (o.api) {
    deps.unshift(`"@tanstack/react-query": "^5.90.5"`);
  }
  const marker = o.api ? `
    "tsreact": {
        "api": "${o.api.dir}"
    },` : "";
  const tpl = `
{
    "name": "${o.name}",
    "version": "0.0.1",
    "description": "${description}",
    "private": true,
    "type": "module",${marker}
    "scripts": {
        "format:check": "prettier src --check",
        "format:fix": "prettier src --write",
        "typecheck": "${typecheck}",
        "test": "echo 'Error: no test specified' && exit 1",${tw}${api}
        "build-watch": "${APP} --sourcemap --watch",
        "build": "${build}",
        "dev": "${APP} --sourcemap --watch --serve=localhost:3000 --servedir=public",
        "serve": "esbuild --serve=localhost:3000 --servedir=public"
    },
    "keywords": [
        "created by tsreact"
    ],
    "author": "",
    "license": "MIT",
    "dependencies": {
        ${deps.join(",\n        ")}
    },
    "devDependencies": {
        ${dev.join(",\n        ")}
    }
}
`;
  return tpl;
}

// src/presets/react.ts
function react(o) {
  const files = {
    ...apiFiles(o),
    "package.json": genPkgJson(o),
    "tsconfig.json": genTsConfig(o),
    ".gitignore": genGitIgnore(o),
    ".editorconfig": genEditorConfig(),
    ".prettierrc.json": genPrettierConfig(),
    "public/index.html": genIndexHtml(o),
    "src/app.tsx": genAppTsx(o),
    "src/app.css": genAppCss(o),
    "src/env.d.ts": genEnvDts()
  };
  if (o.tailwind) {
    files["src/styles.css"] = genStylesCss(o);
  }
  return files;
}

// src/presets/pwa.ts
function pwa(o) {
  return {
    ...react(o),
    "tsconfig.sw.json": genSwTsConfig(),
    "public/manifest.webmanifest": genWebManifest(o.name),
    "public/icon.svg": genIconSvg(o.name),
    "public/icon-192.png": genIconPng(o.name, 192),
    "public/icon-512.png": genIconPng(o.name, 512),
    "public/icon-maskable-512.png": genIconPng(o.name, 512, true),
    "src/sw.ts": genSwTs()
  };
}

// src/index.ts
var PRESETS = {
  react,
  extension,
  pwa,
  expo
};
var API_DIR = "api";
var SAMPLES = "api/samples.json";
function writeTree(dir, files) {
  for (const [rel, contents] of Object.entries(files)) {
    const target = path3.join(dir, rel);
    fs3.mkdirSync(path3.dirname(target), { recursive: true });
    fs3.writeFileSync(
      target,
      Buffer.isBuffer(contents) ? contents : contents.trim() + "\n"
    );
  }
}
function readSamples(file) {
  if (!file || !fs3.existsSync(file)) {
    return {};
  }
  return deserialise(fs3.readFileSync(file, "utf8"), file);
}
async function loadSpec(collectionDir, samplesFile, args, recordedAs) {
  const base = readCollection(collectionDir, args.env);
  const samples = await collect(base, {
    mode: args.mode,
    previous: readSamples(samplesFile),
    refresh: args.refresh
  });
  return { ...base, dir: recordedAs, samples };
}
async function create(dir, opts, args) {
  const extra = {};
  if (args) {
    opts.api = await loadSpec(args.dir, void 0, args, API_DIR);
    for (const [rel, contents] of Object.entries(
      collectionFiles(args.dir)
    )) {
      extra[`${API_DIR}/${rel}`] = contents;
    }
  }
  fs3.mkdirSync(dir, { recursive: true });
  writeTree(dir, { ...PRESETS[opts.template](opts), ...extra });
  steps(path3.relative(process.cwd(), dir) || ".", opts);
}
async function regenerate(parsed) {
  const recorded = recordedCollection(parsed.dir);
  if (!recorded) {
    throw new CliError(
      'No "tsreact" entry in package.json - this is not an app scaffolded with --api'
    );
  }
  const pkg = JSON.parse(
    fs3.readFileSync(path3.join(parsed.dir, "package.json"), "utf8")
  );
  const spec = await loadSpec(
    path3.join(parsed.dir, recorded),
    path3.join(parsed.dir, SAMPLES),
    parsed,
    recorded
  );
  const opts = {
    name: pkg.name ?? "app",
    template: "react",
    tailwind: false,
    daisyui: false,
    api: spec
  };
  const files = apiFiles(opts);
  if (fs3.existsSync(path3.join(parsed.dir, PRESERVED))) {
    delete files[PRESERVED];
  }
  writeTree(parsed.dir, files);
  console.log(
    source_default.greenBright(
      `
Regenerated ${Object.keys(files).length} file(s) from ${recorded}/
`
    )
  );
}
async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.kind === "usage") {
    usage();
    process.exit(1);
  }
  if (parsed.kind === "help") {
    help(readVersion());
    return;
  }
  if (parsed.kind === "version") {
    console.log(readVersion());
    return;
  }
  if (parsed.kind === "api") {
    await regenerate(parsed);
    return;
  }
  await create(parsed.dir, parsed.opts, parsed.api);
}
main().catch((err) => {
  if (err instanceof CliError) {
    console.log(source_default.red(err.message));
    process.exit(1);
  }
  throw err;
});
