"use strict";

const path = require("path");
const Package = require("@eit-tool/package");
const log = require("@eit-tool/log");
const { spawn } = require("@eit-tool/utils");
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
    const packageVersion = "latest";

    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR);
        storeDir = path.resolve(targetPath, "node_modules");
        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion,
        });
        // console.log(pkg);

        if (await pkg.exists()) {
            // 更新package
            await pkg.update();
            console.log("更新");
        } else {
            // 安装package
            console.log("安装");
            await pkg.install();
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion,
        });
    }
    const rootFile = pkg.getRootPath();
    log.verbose("rootFle", rootFile);
    if (rootFile) {
        try {
            // 获取commander 命令执行后参数
            const args = Array.from(arguments);
            const cmd = args[args.length - 1];
            const o = Object.create(null);
            Object.keys(cmd).forEach((key) => {
                if (
                    cmd.hasOwnProperty(key) &&
                    !key.startsWith("_") &&
                    key !== "parent"
                ) {
                    o[key] = cmd[key];
                }
            });
            args[args.length - 1] = o;
            const code = `require('${rootFile}').call(null, ${JSON.stringify(
                args
            )})`;
            // 开启子进程执行
            const child = spawn("node", ["-e", code], {
                cwd: process.cwd(),
                stdio: "inherit",
            });
            child.on("error", (e) => {
                log.error(e.message);
                process.exit(1);
            });
            child.on("exit", (e) => {
                log.verbose("命令执行成功", e);
            });
        } catch (e) {
            log.error(e);
        }
    }
}

module.exports = exec;
