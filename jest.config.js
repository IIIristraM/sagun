const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest/utils');

const configFabric = (context = __dirname, isolatedModules = true) => {
    const tsconfigPath = path.resolve(context, './tsconfig.json');
    const { compilerOptions } = require(tsconfigPath);
    const moduleNameMapper = compilerOptions.paths
        ? pathsToModuleNameMapper(compilerOptions.paths, { prefix: context })
        : undefined;

    return {
        preset: 'ts-jest',
        testEnvironment: 'node',
        globals: {
            'ts-jest': {
                isolatedModules,
                tsConfig: tsconfigPath,
            },
        },
        moduleNameMapper,
        testPathIgnorePatterns: ['(.*)/lib'],
        setupFiles: ['reflect-metadata'],
    };
};

module.exports = configFabric();
