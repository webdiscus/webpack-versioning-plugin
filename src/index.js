const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * @name PluginOptionsHooks~ExcludeHook Called before exclude, if return false, then not exclude.
 * @function
 * @param {Object} compilation
 * @param {String} file
 * @param {Object} assetInfo
 * @return boolean
 */

/**
 * @name PluginOptionsHooks~ContentHashHook Called before add assets with contenthash in filename to manifest, if return false, then not add it.
 * @function
 * @param {Object} compilation
 * @param {String} file
 * @param {Object} assetInfo
 * @return boolean
 */

/**
 * @name PluginOptionsHooks~DoneHook Called before write the manifest to file, if return false, then not write it.
 * @function
 * @param {String} manifestFile The absolute path to manifest file.
 * @param {String} assetsManifestData The JSON of assets in manifest.
 * @return boolean|Object
 */

/**
 * @typedef {Object} PluginOptions~PluginOptionsHooks
 * @property {ExcludeHook} exclude
 * @property {ContentHashHook} contentHash
 * @property {DoneHook} done
 */

/**
 * @typedef {Object} PluginOptions
 * @property {boolean} enabled=true
 * @property {boolean} verbose=false
 * @property {string|undefined} publicPath The absolute path to web public directory.
 * @property {string} fileName The manifest file, absolute or relative by publicPath.
 * @property {Array<RegExp>|null} exclude=null The list of RegExp pattern for prevent rename file to `[name].[contenthash].js`.
 *      The excluded files will be stay with original source filename.
 *      E.g. exclude: [/js\/lib\//] - `js/lib/script.js` will not be renamed to `js/lib/script.7935c58b5159fdfae51d.js`
 * @property {boolean} useReplacingInHtml Whether replace hashed static files in HTML (only by usage the HtmlWebpackPlugin).
 * @property {boolean} useReplacingInAssets Whether replace hashed static files in assets.
 * @property {PluginOptionsHooks} hooks The callable hooks of plugin.
 */

//
// The Problem: the WebWorker in IE11 and Chrome not reload the worker by same url.
// Solutions:
//     - add to worker url any random param as ?ver=random (you must do it self in code);
//     - replace versioned workers in scripts from manifest (this plugin do it for you).

// todo: Replace versioned assets such as images, fonts in CSS

const PLUGIN_NAME = 'webpack-versioning-plugin';

const styleExt = ['.css'];
const scriptExt = ['.js', '.mjs']

/**
 * @var {PluginOptions} defaultOptions
 */
const defaultOptions = {
    enabled: true,
    verbose: false,
    publicPath: undefined,
    // the file with absolute or relative path by publicPath
    fileName: '.assets-manifest.json',
    exclude: null,
    useReplacingInHtml: true,
    useReplacingInAssets: true,
    hooks: {
        exclude: (compilation, file, assetInfo) => true,
        contentHash: (compilation, file, assetInfo) => true,
        done: (manifestFile, assetsManifestData) => assetsManifestData,
    }
};

class WebpackVersioningPlugin {
    /**
     * @param {PluginOptions} options
     */
    constructor(options) {
        this.apply = this.apply.bind(this);
        this.options = Object.assign({}, defaultOptions, options);
        this.webRootPath = '';
        this.outputPath = '';
        this.publicPath = '';
        this.assetsMap = {};
        this.assetsManifestData = {};
        this.htmlFiles = [];
        this.assetFiles = [];
        this.excludes = [];
    }

    apply(compiler) {
        const webpackOptionOutput = compiler.options.output,
            defaultPublicPath = webpackOptionOutput.publicPath && webpackOptionOutput.publicPath !== 'auto'
                ? webpackOptionOutput.publicPath
                : '';

        this.outputPath = path.resolve(webpackOptionOutput.path);
        this.publicPath = this.options.publicPath || defaultPublicPath;
        // remove at end of path the '/'
        this.publicPath = this.publicPath.replace(new RegExp('(' + path.sep + ')$'), '');
        // remove at end of outputPath the publicPath, it will be web root path
        this.webRootPath = this.outputPath.replace(new RegExp('(' + this.publicPath + ')$'), '');

        if (!this.publicPath) {
            throw new Error (
                `[${PLUGIN_NAME}] Neither the option 'publicPath' (${this.options.publicPath}) nor the webpack config options 'output.publicPath' (${webpackOptionOutput.publicPath}) is correct.`
            )
        }

        // define manifest file
        this.manifestFile = this.options.fileName && this.options.fileName[0] === '/'
            ? path.resolve(this.options.fileName)
            : path.resolve(this.outputPath, this.options.fileName);

        //
        if (!this.options.enabled) {
            this.writeFile(this.manifestFile, '{}');
        }
        // run plugin only if enabled, e.g. in production mode
        if (!this.options.enabled) return;

        // collect all html filenames to replace source filename with target
        compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
            this.options.useReplacingInHtml && this.collectHtmlFiles(compilation);
        });

        // collect all assets that have a contenthash in their filename for manifest file
        compiler.hooks.assetEmitted.tap(PLUGIN_NAME, (file, {content, source, outputPath, compilation, targetPath}) => {
            this.collectAssetFiles(compilation, file, targetPath);
        });

        //
        compiler.hooks.done.tap(PLUGIN_NAME, (stats) => {
            // replace in the rendered html the source asset filename (style, script, image, etc.)
            // with the target name from the manifest
            this.options.useReplacingInHtml
                && this.htmlFiles.forEach(file => this.replaceHashedFiles(file, this.assetsManifestData));

            // parse compiled assets and replace hashed files
            this.options.useReplacingInAssets
                && this.assetFiles.forEach(file => this.replaceHashedFiles(file, this.assetsManifestData));

            // rename the excluded file, that has a contenthash in its filename, to original file
            this.excludes.forEach(exclude => {
                fs.existsSync(exclude.target) && fs.renameSync(exclude.target, exclude.source);
            })

            // save manifest data to file
            this.saveManifest(this.manifestFile, this.assetsManifestData);
        });
    }

    /**
     * @param {Object} compilation The compilation object of webpack plugin.
     */
    collectHtmlFiles (compilation) {
        HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(PLUGIN_NAME, (data, next) => {
            const outputFile = path.join(this.outputPath, data.outputName);
            data.outputName && this.htmlFiles.push(outputFile);
            next(null, data);
        });
    }

    /**
     * @param {Object} compilation The compilation object of webpack plugin.
     * @param {string} filename The base filename of hashed file.
     * @param {string} targetPath The absolute path of hashed file.
     */
    collectAssetFiles (compilation, filename, targetPath) {
        const asset = compilation.getAsset(filename);
        if (!asset || !asset.info.hasOwnProperty('contenthash')) return;

        const customHooks = this.options.hooks,
            reSourceNormalize = new RegExp('[\\-_.]\\.'),
            contentHash = asset.info.contenthash,
            sourceOutputFile = asset.name.replace(contentHash, '').replace(reSourceNormalize, '.'),
            sourcePath = path.join(this.outputPath, sourceOutputFile),
            sourceAssetFile = path.join(this.publicPath, sourceOutputFile),
            targetAssetFile = path.join(this.publicPath, asset.name),
            assetInfo = {
                source: sourceAssetFile,
                target: targetAssetFile,
                contentHash: contentHash,
            };

        const isExcluded = this.options.exclude
            && !this.options.exclude.every((item) => sourceAssetFile.search(item) < 0);

        if (isExcluded) {
            if (typeof customHooks.exclude === 'function'
                && customHooks.exclude(compilation, filename, assetInfo) !== false) {
                if (this.options.verbose) {
                    console.log(`[${PLUGIN_NAME}] exclude file: ${sourceAssetFile}`);
                }
                this.excludes.push({source: sourcePath, target: targetPath});
            }

        } else if (typeof customHooks.contentHash === 'function'
            && customHooks.contentHash(compilation, filename, assetInfo) !== false) {
            this.assetsManifestData[assetInfo.source] = assetInfo.target;
        }

        this.assetFiles.push(path.join(this.outputPath, asset.name));
    }

    /**
     * @param {string} manifestFile The absolute path of asset manifest file.
     * @param {Object} assetsManifestData
     */
    saveManifest (manifestFile, assetsManifestData) {
        const customHooks = this.options.hooks;

        if (typeof customHooks.done === 'function') {
            let manifestData = customHooks.done(manifestFile, assetsManifestData);

            if (manifestData === false) return;

            if (!this.isJSON(manifestData)) {
                throw new Error (
                    `[${PLUGIN_NAME}] the option function hooks.done() must return either 'false' or a valid JSON of manifest data.`
                )
            }

            // write assets manifest map to file
            this.writeFile(manifestFile, JSON.stringify(manifestData, null, '  '));
            if (this.options.verbose) {
                console.log(`[${PLUGIN_NAME}] save manifest file '${manifestFile}':`);
                console.log(manifestData);
            }
        }
    }

    /**
     * @param {string} file The absolute path to file where should be replaced versioned file.
     * @param {Object} manifest The manifest data.
     */
    replaceHashedFiles (file, manifest = {}) {
        let content = fs.readFileSync(file, 'utf-8'),
            assetFile = file.replace(new RegExp('^(' + this.webRootPath + ')'), ''),
            isHTML = file.endsWith('.html'),
            replacedAssets = [],
            sourceFile,
            targetFile;

        for (sourceFile in manifest) {
            targetFile = manifest[sourceFile];

            // reduce redundant parsing of hashed files in assets, but not in html
            if (!isHTML) {
                // skip it self
                if (file.endsWith(targetFile)) continue;
                // skip redundant replacing of js in css (it should not be)
                if (this.strEndsWith(file, styleExt) && this.strEndsWith(sourceFile, scriptExt)) continue;
                // skip redundant replacing css in js (it should not be)
                if (this.strEndsWith(file, scriptExt) && this.strEndsWith(sourceFile, styleExt)) continue;
                // skip redundant replacing by circular dependencies (it should not be)
                if (this.assetsMap.hasOwnProperty(targetFile) && this.assetsMap[targetFile].indexOf(assetFile) >= 0) continue;
            }

            // if the file is not self from manifest and content not contain the source file
            if (content.indexOf(sourceFile) >= 0) {
                replacedAssets.push(targetFile);
                // cache replaced assets to avoid redundant parsing by circular dependencies (it should not be):
                // if file A contain file(s) B,C,.., then B,C,.. can't contain A
                if (!isHTML) {
                    if (!this.assetsMap.hasOwnProperty(assetFile)) {
                        this.assetsMap[assetFile] = [];
                    }
                    this.assetsMap[assetFile].push(targetFile);
                }
                content = content.replace(sourceFile, targetFile);
            }
        }

        // save file only if was changed
        replacedAssets.length && fs.writeFileSync(file, content);

        if (this.options.verbose && replacedAssets.length) {
            console.log(`[${PLUGIN_NAME}] replace the assets in '${file}':`);
            console.log(replacedAssets);
        }
    }

    /**
     * @param {string} str
     * @param {string[]} ends
     * @returns {boolean}
     */
    strEndsWith (str, ends = []) {
        if (!Array.isArray(ends)) {
            ends = [ends];
        }

        return !ends.every(end => !str.endsWith(end));
    }

    /**
     * @param {any} obj
     * @returns {boolean}
     */
    isJSON (obj) {
        return obj && obj.constructor === ({}).constructor;
    }

    /**
    * @param {string} file
    * @param {string} data
    */
    writeFile (file, data) {
        let dir = path.dirname(file);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }
        fs.writeFileSync(file, data)
    }
}

module.exports = WebpackVersioningPlugin