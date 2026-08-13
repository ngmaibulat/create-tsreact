import { appDir } from "./cli.js";
import type { Files, Opts } from "./cli.js";
import { mutations, queries } from "@tsreact/bruno/emit";
import { serialise } from "@tsreact/bruno/sample";
import genApiClient from "./genApiClient.js";
import genApiConfig from "./genApiConfig.js";
import genApiIndex from "./genApiIndex.js";
import genApiKeys from "./genApiKeys.js";
import genApiMutations from "./genApiMutations.js";
import genApiQueries from "./genApiQueries.js";
import genApiTypes from "./genApiTypes.js";

//A map-builder, not a generator: it returns a slice of the file tree the way
//a preset does, and each preset spreads it in. Putting it here rather than in
//src/presets/ keeps that directory to one file per template.
//
//queries.ts and mutations.ts are conditional - a collection of nothing but
//GETs has no mutations to emit, and an empty module full of unused imports is
//worse than an absent one. genApiIndex.ts makes the same decision, so the two
//must stay in step.

//where the generated client lands, relative to the workspace root. Every
//template puts it inside the app that consumes it rather than at the top -
//"apps/web/src/api", "apps/mobile/src/api" and so on.
//
//A function of o.template alone, so that "create-tsreact api" can recover it
//from the template recorded in package.json - see recordedTemplate in cli.ts.
export function apiRoot(o: Opts) {
    return `${appDir(o)}/src/api`;
}

//Where the client lives in an app scaffolded before generated apps became
//workspaces. Those apps have a flat src/ and a marker with no "template" key,
//so that missing key - not a template name - is what identifies them.
//
//regenerate() in index.ts passes this explicitly rather than deriving it,
//because deriving would give the *new* react layout and quietly write a
//second client next to the real one.
export const LEGACY_API_ROOT = "src/api";

//everything under the api root is rewritten by "api:gen" except this, which
//holds the base url and credentials the user edits by hand
export function preserved(root: string) {
    return `${root}/config.ts`;
}

//The root is a parameter, not just a derivation, for the legacy case above.
//This is a map-builder rather than a generator, so it is not bound by the
//one-Opts-argument rule the gen* modules follow.
export default function apiFiles(o: Opts, root = apiRoot(o)): Files {
    const spec = o.api;

    if (!spec) {
        return {};
    }

    const files: Files = {
        [preserved(root)]: genApiConfig(o),
        [`${root}/client.ts`]: genApiClient(o),
        [`${root}/types.ts`]: genApiTypes(o),
        [`${root}/index.ts`]: genApiIndex(o),
        //the collection and its captured responses stay at the workspace root
        //rather than in an app: they are the input to regeneration, and the
        //"tsreact" marker that points at them is in the root manifest
        "api/samples.json": serialise(spec, spec.samples),
    };

    if (queries(spec).length) {
        files[`${root}/keys.ts`] = genApiKeys(o);
        files[`${root}/queries.ts`] = genApiQueries(o);
    }

    if (mutations(spec).length) {
        files[`${root}/mutations.ts`] = genApiMutations(o);
    }

    return files;
}
