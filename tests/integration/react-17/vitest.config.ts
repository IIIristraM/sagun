import {default as config} from "../../../vitest.config";

import tsconfig from "./tsconfig.json";
import path from "path";

// Create an alias object from the paths in tsconfig.json
const alias = Object.fromEntries(
    // For Each Path in tsconfig.json
    Object.entries(tsconfig.compilerOptions.paths).map(([key, [value]]) => [
        // Remove the "/*" from the key and resolve the path
        key.replace("/*", "").replace("*", ""),
        // Remove the "/*" from the value Resolve the relative path
        path.resolve(__dirname, value.replace("/*", "").replace("*", ""))
    ])
);

config.resolve = config.resolve ?? {};
config.resolve.alias = alias

export default config;
