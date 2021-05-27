"use strict";

const path = require("path");
const Package = require("@eit-tool/package");

const SETTINGS = {
    init: "@eit-tool/init",
};
const CACHE_DIR = "dependencies";

async function exec() {
    // --targetpath 自定义的值
    let targetPath = process.env.CLI_TARGET_PATH;
    const homePath = process.env.CLI_HOME_PATH;
    let storeDir = "";
    let pkg;
    const cmdObj = arguments[arguments.length - 1];
    const cmdName = cmdObj.name();
    const packageName = SETTINGS[cmdName];
    const packageVersion = "lasest";

    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR);
        storeDir = path.resolve(targetPath, "node_modules");
        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion,
        });
        if (await pkg.exists()) {

            // 更新package
            // await pkg.update();
            console.log('更新');
        } else {
            // 安装package
            console.log('安装');
            // await pkg.install();
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion,
        });
    }
    const rootFile = pkg.getRootPath();
    console.log(rootFile, 'rootFile');
}

module.exports = exec;
