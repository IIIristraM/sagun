// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

import prettierConfig from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        rules: eslint.configs.recommended.rules,
    },
    {
        ...prettierConfig,
        files: ["src/**/*.ts", "src/**/*.tsx"],
    },
    {
        ...tseslint.configs.recommended[0],
        files: ["src/**/*.ts", "src/**/*.tsx"],
        settings: {
            react: {
                version: "detect"
            }
        },
        rules: {
            ...tseslint.configs.recommended.map(x => x.rules).reduce((acc = {}, r) => {
                Object.assign(acc, r);
                return acc;
            }, {}),
            "require-yield": "off",
            // "react/prop-types": "off",
            "sort-imports": [
                "error",
                {
                    "allowSeparatedGroups": true,
                    "ignoreCase": true
                }
            ],
            "no-prototype-builtins": "off",
            "prefer-spread": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-this-alias": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                {
                    "accessibility": "no-public"
                }
            ],
        },
    }, {
        files: ["*spec.ts", "*spec.tsx"],
        rules:  {
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-non-null-assertion": "off"
        }
    }
);
