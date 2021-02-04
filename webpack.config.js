const path = require('path');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'lib'),
        libraryTarget: 'commonjs2',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    module: {
        rules: [
            {
                test: /[.]tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            onlyCompileBundledFiles: true,
                        },
                    },
                ],
                exclude: '/node_modules/',
            },
        ],
    },
    externals: [
        function (context, request, callback) {
            if (/^(react|redux|react-redux)$|^(@redux-saga|react-dom|redux-saga|uuid)/.test(request)) {
                // Externalize to a commonjs module using the request path
                return callback(null, 'commonjs ' + request);
            }

            // Continue without externalizing the import
            callback();
        },
    ],
};
