const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

import { copyRecursiveSync, readTextFileSync, readJsonSync } from '../helpers/fileUtils';
import { compile } from '../helpers/webpackUtils';

// The base path of test directory in project.
const basePath = path.resolve(__dirname, '..');

const PATHS = {
    base: basePath,
    testSource: path.join(basePath, 'cases'),
    // absolute path of temp outputs for test
    testOutput: path.join(basePath, 'output'),
    // relative path in the test directory to web root dir name, same as by a web server (e.g. nginx)
    webRoot: '/public/',
    // relative path in the test directory to expected files for test
    expected: '/expected/',
    // relative path in the public directory
    output: '/assets/',
}

beforeAll(() => {
    // delete all files from path
    rimraf.sync(PATHS.testOutput);
    // copy test files to temp directory
    copyRecursiveSync(PATHS.testSource, PATHS.testOutput)
});

beforeEach(() => {
    jest.setTimeout(10000);
});

describe('Webpack Integration Tests of asset versioning.', () => {
    it('test it self', (done) => {
        expect(1).toEqual(1);
        done();
    });

    it('replace versioned files in html', async (done) => {
        const relTestCasePath = 'replace-assets-in-html',
            absTestPath = path.join(PATHS.testOutput, relTestCasePath);

        await compile(PATHS, relTestCasePath, {}, done);

        const received = readTextFileSync(path.join(absTestPath, PATHS.webRoot, 'index.html'));
        const expected = readTextFileSync(path.join(absTestPath, PATHS.expected,'index.html'));

        expect(received).toEqual(expected);

        done();
    });

    it('replace versioned files in assets', async (done) => {
        const relTestCasePath = 'replace-worker-in-js',
            absTestPath = path.join(PATHS.testOutput, relTestCasePath);

        await compile(PATHS, relTestCasePath, {}, done);

        const manifest = readJsonSync(path.join(absTestPath, PATHS.webRoot, PATHS.output, '.assets-manifest.json'));
        let compareFiles;

        compareFiles = getCompareFiles(absTestPath, 'script.js', manifest);
        expect(compareFiles.received).toEqual(compareFiles.expected);

        compareFiles = getCompareFiles(absTestPath, 'script-excluded.js', manifest);
        expect(compareFiles.received).toEqual(compareFiles.expected);

        compareFiles = getCompareFiles(absTestPath, 'style.css', manifest);
        expect(compareFiles.received).toEqual(compareFiles.expected);

        done();
    });
});

const getCompareFiles = function (absTestPath, file, manifest) {
    let sourceFile = path.join(PATHS.output, file);
    let expectedFile = path.join(PATHS.expected, file);
    let targetFile = manifest[sourceFile] || sourceFile;
    let received = readTextFileSync(path.join(absTestPath, PATHS.webRoot, targetFile));
    let expected = readTextFileSync(path.join(absTestPath, expectedFile));

    return {
        received: received,
        expected: expected
    }
}


// script.xxx.js has src: worker1.js, src: worker2.js => target: worker1.xxx.js, target: worker2.xxx.js

// s2 has w1
// w1
// w2

let excl = {
    w1: ['s1', 's2'],
    w2: ['s1']
}