const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    mode: 'development',
    entry: path.resolve(__dirname, 'web.old/src/ts/app.ts'),
    output: {
        filename: 'bundle.js?[hash]',
        path: path.join(__dirname, 'web.old/dist'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'web.old/src/index.html')
        })
    ],
    module: {
        rules: [{
            test: /\.ts$/,
            use: "ts-loader"
        }, {
            test: /\.scss/,
            use: [
                "style-loader",
                {
                    loader: "css-loader",
                    options: {
                        url: false,
                        importLoaders: 2
                    }
                },
                {
                    loader: "sass-loader",
                }
            ]
        }]
    },
    resolve: {
        extensions: [".ts"]
    }
};