const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const [, , hostRelativePath] = process.argv;

const context = process.cwd();
const hostModules = path.resolve(context, hostRelativePath, './node_modules');
const libModules = path.resolve(context, './node_modules');

const { peerDependencies } = require(path.resolve(context, 'package.json'));

const list = Object.keys(peerDependencies);
for (const dep of list) {
    const [folder] = dep.split('/');
    const sourceFolder = path.resolve(hostModules, folder);
    const targetFolder = path.resolve(libModules, folder);

    if (!fs.existsSync(sourceFolder)) {
        throw new Error(`Host folder doesn't exists (${sourceFolder})`);
    }

    if (fs.existsSync(targetFolder)) {
        const stats = fs.lstatSync(targetFolder);
        if (!stats.isSymbolicLink()) {
            console.info(`Removing directory "${targetFolder}"...`);
            execSync(`rm -rf ${targetFolder}`);
        }
    }

    if (!fs.existsSync(targetFolder)) {
        console.info(`Creating symlink ${sourceFolder} -> ${targetFolder}`);
        fs.symlinkSync(sourceFolder, targetFolder);
    }
}
