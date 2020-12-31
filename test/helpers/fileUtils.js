const fs = require('fs');
const path = require('path');

/**
 * Get files with relative paths.
 * @param {string} dir
 * @return {[]}
 */
const readDirRecursiveSync = function(dir = './') {
    const entries = fs.readdirSync(dir, {withFileTypes: true});

    dir = path.resolve(dir);

    // Get files within the current directory and add a path key to the file objects
    const files = entries
        .filter(file => !file.isDirectory())
        .map(file => path.join(dir, file.name));

    // Get folders within the current directory
    const folders = entries.filter(folder => folder.isDirectory());

    for (const folder of folders) {
        files.push(...readDirRecursiveSync(path.join(dir, folder.name)));
    }

    return files;
}

/**
 * Copy recursive, like as `cp -R`.
 * @param {string} src The path to the thing to copy.
 * @param {string} dest The path to the new copy.
 */
const copyRecursiveSync = function(src, dest) {
    if (!fs.existsSync(src)) return;

    let stats = fs.statSync(src),
        isDirectory = stats.isDirectory();

    if (isDirectory) {
        fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((dir) => {
            copyRecursiveSync(
                path.join(src, dir),
                path.join(dest, dir));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
};

const readJsonSync = (file) => {
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content);
};

const readTextFileSync = (file) => {
    return  fs.readFileSync(file, 'utf-8');
};

export { readDirRecursiveSync, copyRecursiveSync, readTextFileSync, readJsonSync }