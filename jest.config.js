const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');

const configFabric = (context = __dirname, isolatedModules = false) => {
    const tsconfigPath = path.resolve(context, './tsconfig.json');
    const { compilerOptions } = require(tsconfigPath);
    const moduleNameMapper = compilerOptions.paths
        ? pathsToModuleNameMapper(compilerOptions.paths, { prefix: context })
        : undefined;

    return {
        preset: 'ts-jest',
        testEnvironment: 'node',
        transform: {
            ['.tsx?$']: [
                'ts-jest',
                {
                    isolatedModules,
                    tsconfig: tsconfigPath,
                },
            ],
        },
        moduleNameMapper,
        testPathIgnorePatterns: ['(.*)/lib'],
    };
};

module.exports = configFabric();
