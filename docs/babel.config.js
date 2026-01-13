module.exports = {
    presets: ['@docusaurus/babel/preset'],
    plugins: [
        ["@babel/plugin-proposal-decorators", { "legacy": true }],
        ["babel-plugin-parameter-decorator", {}],
    ],
}