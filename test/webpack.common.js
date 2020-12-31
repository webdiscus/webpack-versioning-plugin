const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

module.exports  = {
    output: {
        filename: '[name].[contenthash].js',
        chunkFilename: '[id].[contenthash].js',
    },

    plugins: [
        new RemoveEmptyScriptsPlugin(),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
            chunkFilename: '[id].[contenthash].css',
        }),
    ],

    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            esModule: false,
                        },
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            // disable url/image-set functions handling
                            url: false,
                            // disable @import at-rules handling
                            import: false,
                        },
                    },
                ]
            },
            {
                test: /\.pug$/,
                loader: 'pug-loader'
            },
        ]
    },

    optimization: {
        minimize: true,
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
        usedExports: true,
        concatenateModules: true
    }
};