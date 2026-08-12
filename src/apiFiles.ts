import type { Files, Opts } from "./cli.js";
import { mutations, queries } from "./bruno/emit.js";
import { serialise } from "./bruno/sample.js";
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

//everything under src/api/ is rewritten by "npm run api:gen" except this,
//which holds the base url and credentials the user edits by hand
export const PRESERVED = "src/api/config.ts";

export default function apiFiles(o: Opts): Files {
    const spec = o.api;

    if (!spec) {
        return {};
    }

    const files: Files = {
        [PRESERVED]: genApiConfig(o),
        "src/api/client.ts": genApiClient(o),
        "src/api/types.ts": genApiTypes(o),
        "src/api/index.ts": genApiIndex(o),
        "api/samples.json": serialise(spec, spec.samples),
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
