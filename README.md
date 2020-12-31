[![npm version](https://badge.fury.io/js/webpack-versioning-plugin.svg)](https://www.npmjs.com/package/webpack-versioning-plugin)

# [webpack-versioning-plugin](https://www.npmjs.com/package/webpack-versioning-plugin)

The plugin generates an asset manifest and replaces the original file names with hashed version in HTML and assets.

## Features
- generates assets manifest file as JSON, same as other similar plugins
- replace original file names to hashed version in HTML, CSS, JS
- exclude hashing of file names, defined in webpack config entry

## Install

```console
npm install webpack-versioning-plugin --save-dev
```

Optional, if you use a template by webpack, install the package `npm install html-webpack-plugin --save-dev`.

## Usage

The example of an application structure.
The web root path in this case is `public/`.

```
/srv/vhost/sample.com/
            |- /public/
            |- /src/
            |     |-- index.html
            |     |-- script.js
            |     |-- script-worker.js
            |     |-- style.css
            |     |-- style-component.css
            |- webpack.config.js
```

Create a webpack.config.js file

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackVersioningPlugin = require('webpack-versioning-plugin');

// The absolute path to the base directory of application.
const basePath = path.resolve(__dirname);
// The absolute path to the directory that contains the web application files such as: index.html.
const webRootPath = path.join(basePath, 'public/');
// The public URL of the output directory when referenced in a browser. It should be relative by webRootPath path.
const publicPath = '/assets/';
// The absolute output path of assets.
const outputPath = path.join(webRootPath, publicPath);

// The minimal required options of plugin.
const webpackVersioningOptions = {
    publicPath: publicPath,
    ...
};

module.exports  = {
    entry: {
        'script': './src/script.js',
        'script-worker': './src/script-worker.js',
        'style': './src/style.css',
        'style-component': './src/style-component.css',
    },
    
    output: {
        path: outputPath,
        filename: '[name].[contenthash].js',
        chunkFilename: '[id].[contenthash].js',
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
            chunkFilename: '[id].[contenthash].css',
        }),

        new HtmlWebpackPlugin({
            filename: path.join(webRootPath, '/index.html'),
            template: './src/index.html',
            inject: false
        }),

        new WebpackVersioningPlugin(webpackVersioningOptions),
    ],

    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: 'css-loader',
                    },
                ]
            }
        ]
    }
};

```
> Optional you can use the plugin [webpack-remove-empty-scripts](https://www.npmjs.com/package/webpack-remove-empty-scripts) to remove generated empty js files by usage only styles in entry.

Source `./src/index.html`

```html
<html>
    <head>
        <link type="text/css" href="/assets/style.css">
        <script src="/assets/script.js"></script>
    </head>
    <body>
        Hello world!
    </body>
</html>
```
or Pug template `./src/index.pug`
```
html
    head
        link(type="text/css" href="/assets/style.css")
        script(src="/assets/script.js")
    body
        | Hello world!
```

> By usage the Pug install packages `npm install pug pug-loader --save-dev` and add to webpack config:

```js
module.exports  = {
    ...
    plugins: [
        ...    
        new HtmlWebpackPlugin({
            filename: path.join(webRootPath, '/index.html'),
            template: './src/index.pug',
            inject: false
        }),
    ],
    module: {
        rules: [
            ...
            {
                test: /\.pug$/,
                loader: 'pug-loader'
            },
        ]
    }
}

```

Source `./src/style.css`

```css
@import url("//assets/style-component.css");

body {
    background: red;
}
```

Source `./src/script.js`

```js
const myWorker = new Worker("/assets/script-worker.js");
myWorker.postMessage(["Message posted to worker."]);
```

The webpack compile assets and template to `public/`:
```
/srv/vhost/sample.com/
            |- /public/
            |  |  |- /assets/
            |  |  |-- .assets-manifest.json
            |  |  |-- script.xxx.js
            |  |  |-- script-worker.xxx.js
            |  |  |-- style.xxx.css
            |  |  |-- style-component.xxx.css
            |  |-- index.html
            |- /src/
```

Created `./public/assets/.assets-manifest.json`
```json
{
  "/assets/script.js": "/assets/script.666f2b8847021ccc7608.js",
  "/assets/script-worker.js": "/assets/script-worker.21ccc7608666f2b88470.js",
  "/assets/style.css": "/assets/style.777312cffc01c1457868.css",
  "/assets/style-component.css": "/assets/style.01c1457868777312cffc.css"
}
```

Compiled `./public/index.html`

```html
<html>
    <head>
        <link type="text/css" href="/assets/style.xxx.css">
        <script src="/assets/script.xxx.js"></script>
    </head>
    <body>
        Hello world!
    </body>
</html>
```

Compiled `./public/assets/style.xxx.css`

```css
@import url("//assets/style-component.xxx.css");

body {
    background: red;
}
```

Compiled `./public/assets/script.xxx.js`

```js
const myWorker = new Worker("/assets/script-worker.xxx.js");
myWorker.postMessage(["Message posted to worker."]);
```

### Options

### `enabled`
Type: `Boolean`<br>
Default: `true`<br>

In `development` mode not need generates a manifest file and compile assets with versioned names.
In this case should be `false`.
The option can be defined as: `enabled: process.env.NODE_ENV === 'production'`.<br>
**Note:** if is `faslse` then manifest file will be generated as empty json object `{}`.

### `publicPath`
Type: `String`<br>
Default: `<webpack-config>.output.publicPath`<br>
**Note:** defaults, the option `output.publicPath` by webpack config is `undefined`. The `publicPath` must be defined either by webpack config or by the option.

The public URL of the output directory when referenced in a browser. Usually it is `/assets/`, `/build/`, `/dist/`, etc. where webpack output compiled entries.
This is relative path by `web root` directory.

### `fileName`
Type: `String`<br>
Default: `.assets-manifest.json`<br>
**Note:** the file name should begin with `.` to prevent access via URL `https://example.com/assets/.assets-manifest.json`, e.g. from web crawler or indexer.
?he file name should be different from `manifest.json` to prevent confusion when working with [Web app manifests](https://developer.mozilla.org/en-US/docs/Web/Manifest) or [WebExtension manifests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json).

The file name to save generated assets manifest as JSON object.<br>
Defaults, the file name will be saved in `publicPath`. An absolute path is possible.<br>

### `exclude`
Type: `Array<RegExp | String>`<br>
Default: `[]`<br>
**Note:** The value must be as relative URL of excluded file, e.g.:
```js
exclude: [
    '/assets/lib/excluded-file.js', // exact this file will be excluded
    new RegExp('\/assets\/lib\/'), // all files from /assets/lib/* will be excluded
]

```

Exclude hashing of file names, defined in webpack config entry.
This can be useful, for example, by compiling an asset from a library without using the version in the file name.

### `useReplacingInHtml`
Type: `Boolean`<br>
Default: `true`<br>

Enable/disable replacing original file names to versioned in HTML files defined in webpack plugin `HtmlWebpackPlugin(..)`.

### `useReplacingInAssets`
Type: `Boolean`<br>
Default: `true`<br>

Enable/disable replacing original file names to versioned in assets defined in webpack entries.

### `verbose`
Type: `Boolean`<br>
Default: `false`<br>

Enable/disable output logging information. Useful by `development` mode.

### Hooks
Type: `Object<Function>`<br>
Default:<br>
```json
hooks: {
    exclude: (compilation, file, assetInfo) => true,
    contentHash: (compilation, file, assetInfo) => true,
    done: (manifestFile, manifestData) => manifestData
}
```

Hook `exclude(compilation, file, assetInfo): Boolean` will be called before exclude an entry file.<br>
Arguments:
```
@param {Object} compilation The compilation object of webpack.
@param {String} file The file name of entry.
@param {Object} assetInfo The information from manifest.
@return boolean If return false, then not exclude the file.
```

Hook `contentHash(compilation, file, assetInfo): Boolean` will be called before add a hashed file name to manifest.<br>
Arguments:
```
@param {Object} compilation The compilation object of webpack.
@param {String} file The file name of entry.
@param {Object} assetInfo The information from manifest.
@return boolean If return false, then not add the file to manifest.
```

Hook `done(manifestFile, manifestData): Boolean | Object ` will be called before write the manifest to file.<br>
Arguments:
```
@param {String} manifestFile The absolute path to manifest file.
@param {Object} manifestData The JSON data manifest. Yor can manipulate the data (add, remove) and will be saved returned data. 
@return boolean | Object If return false, then not write the file, overwise will be writed returned JSON data to manifest file.
```

The argument object `assetInfo`:
```
@param {String} source The original file name, that used in HTML, CSS, JS, e.g. '/assets/script.js'
@param {String} target The versioned file name, e.g. '/assets/script.666f2b8847021ccc7608.js'
@param {String} contentHash The hash part of versioned file name, e.g. 666f2b8847021ccc7608
```

## P.S.
If you have any useful ideas to improve the plugin please let me know :-)