const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackVersioningPlugin = require('../../../src');

const webRootPath = path.join(__dirname, 'public/');
const publicPath =  '/assets/';

module.exports = {
  mode: 'production',

  entry: {
    script: './src/script.js',
    style: './src/style.css'
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: path.join(webRootPath, '/index.html'),
      template: './src/index.html',
      inject: false
    }),

    new WebpackVersioningPlugin({
      enabled: true,
      publicPath: publicPath,
      fileName: '.assets-manifest.json',
      verbose: false,
      exclude: [],
    }),
  ],
};