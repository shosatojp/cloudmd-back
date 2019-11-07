const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    mode: 'development',
    entry: path.resolve(__dirname, 'web/src/ts/app.ts'),
    output: {
        filename: 'bundle.js?[hash]',
        path: path.join(__dirname, 'web/dist'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'web/src/index.html')
        })
    ],
    module: {
        rules: [{
            test: /\.ts$/,
            use: "ts-loader"
        }]
    },
    resolve: {
        extensions: [".ts"]
    }
};