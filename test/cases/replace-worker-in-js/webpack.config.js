const path = require('path');
const WebpackVersioningPlugin = require('../../../src');

const publicPath =  '/assets/';

module.exports = {
  mode: 'production',

  entry: {
    script: './src/script.js',
    worker1: './src/worker1.js',
    worker2: './src/worker2.js',
    'script-excluded': './src/script-excluded.js',
    style: './src/style.css',
    component1: './src/component1.css',
    component2: './src/component2.css'
  },

  plugins: [
    new WebpackVersioningPlugin({
      enabled: true,
      publicPath: publicPath,
      fileName: '.assets-manifest.json',
      verbose: false,
      exclude: [
          path.join(publicPath, 'script-excluded.js'),
      ],
    }),
  ],
};