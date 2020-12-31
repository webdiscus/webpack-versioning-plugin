const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');

const prepareWebpackConfig = (PATHS, done, relTestCasePath, webpackOpts = {}) => {
    const testPath = path.join(PATHS.testOutput, relTestCasePath),
        webRootPath = path.join(testPath, PATHS.webRoot),
        outputPath = path.join(webRootPath, PATHS.output),
        configFile = path.join(testPath, 'webpack.config.js'),
        commonConfigFile = path.join(PATHS.base, 'webpack.common.js');

    if (!fs.existsSync(configFile)) {
        return done(`the config file '${configFile}' not found for test: ${relTestCasePath}`);
    }

    let baseConfig = {
            // the home directory for webpack should be the same where the tested webpack.config.js located
            context: testPath,
            output: {
                path: outputPath,
            },
        },
        testConfig = require(configFile),
        commonConfig = require(commonConfigFile);

    return merge(baseConfig, commonConfig, webpackOpts, testConfig);
}

const compile = (PATHS, testCasePath, webpackOpts, done) => {
    const compiler = webpack(prepareWebpackConfig(PATHS, done, testCasePath, webpackOpts));

    return new Promise(resolve => {
        compiler.run((error, stats) => {
            if (error) return done(error);
            if (stats.hasErrors()) return done(new Error(stats.toString()));

            resolve(stats);
        });
    });
};

export { compile }