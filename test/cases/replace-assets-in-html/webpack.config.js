const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackVersioningPlugin = require('../../../src');

module.exports = {
  mode: 'production',

  entry: { script: './src/script.js', style: './src/style.css' },

  plugins: [
    new HtmlWebpackPlugin({
      filename: __dirname + '/public/index.html',
      template: './src/index.html',
      inject: false
    }),

    new WebpackVersioningPlugin({
      enabled: true,
      publicPath: '/assets/',
      fileName: '.assets-manifest.json',
      verbose: true,
      exclude: [],
    }),
  ],
};