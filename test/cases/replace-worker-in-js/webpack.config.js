const WebpackVersioningPlugin = require('../../../src');

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
      publicPath: '/assets/',
      fileName: '.assets-manifest.json',
      verbose: true,
      exclude: [
          '/assets/script-excluded.js',
      ],
    }),
  ],
};