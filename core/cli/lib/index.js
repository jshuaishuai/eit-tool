"use strict";

const path = require("path");
const pkg = require("../package.json");
const log = require("@eit-tool/log");
const semver = require("semver"); // 比较版本号
const colors = require("colors/safe"); // log 有颜色输出
const userHome = require("user-home"); // 获取用户主目录
const pathExists = require("path-exists").sync; // 判断路径是否存在 返回bool
const commander = require("commander"); // 命令行工具
const exec = require('@eit-tool/exec');
const leven = require('leven'); //用于计算字符串编辑距离算法的 JS 实现
const constant = require("./const");
const program = new commander.Command();
// 当前package 版本
const currentVersion = pkg.version;

async function core(argv) {
    try {
        await prepare();
        registerCommand();
    } catch (error) {
        log.error(error.message);
    }
}
// 预执行
async function prepare() {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkEnv();
    await checkGlobalUpdate();
}
// 监听命令行 命令或 参数
function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage(`${colors.green('<command>')} [options]`)
        .version(pkg.version, "-v --version", "输出当前版本号")
        .option("-d, --debug", "是否开启调试模式", false)
        .option(
            "-tp, --targetPath <targetPath>",
            "是否指定本地调试文件路径",
        );

    program
        .command("init [projectName]")
        .description("初始化项目")
        .option("-f, --force", "是否强制初始化项目")
        .action(exec);
    // 获取参数对象
    const options = program.opts();
    // 指定targetPath
    program.on("option:targetPath", function () {
        process.env.CLI_TARGET_PATH = options.targetPath;
    });

    // 监听debug
    program.on("option:debug", function () {
        if (options.debug) {
            process.env.LOG_LEVEL = "verbose";
        } else {
            process.env.LOG_LEVEL = "info";
        }
        log.level = process.env.LOG_LEVEL;
        log.verbose("debug", "开始debug");
    });
    // 对未知命令开启监控
    program.on("command:*", function (obj) {
        console.log(123);
        const availableCommands = program.commands.map((cmd) => cmd.name());
        let unknownCommand = obj[0];
        let suggestion;
        availableCommands.forEach(cmd => {
            const isBestMatch = leven(cmd, unknownCommand) < leven(suggestion || '', unknownCommand);
            if (leven(cmd, unknownCommand) < 3 && isBestMatch) {
                suggestion = cmd;
            }
        });
        console.log(`  ` + colors.red("未知的命令：" + unknownCommand));
        if (suggestion) {
            console.log(`  ` + colors.red(`你是不是想选择这个命令 ${colors.yellow(suggestion)}?`));
        }
        if (availableCommands.length > 0) {
            console.log(
                `  ` + colors.green("可用命令：" + availableCommands.join(","))
            );
        }
    });
    program.parse(process.argv);
}
// TODO 第一步：获取cli版本号
function checkPkgVersion() {
    log.info("当前正在使用版本号是：", currentVersion);
}
//检查node 当前用户版本号
function checkNodeVersion() {
    //获取当前node 版本
    const currentNodeVersion = process.version; // 获取当前的版本
    const lowestNodeVersion = constant.LOWEST_NODE_VERSION; // 期望支持的最低版本 目前是 12.0.0
    if (!semver.gte(currentNodeVersion, lowestNodeVersion)) {
        throw new Error(
            colors.red(`eit-tool 需要安装${lowestNodeVersion}以上的node版本`)
        );
    }
}

// TODO 第二步：root 降级
function checkRoot() {
    const rootCheck = require("root-check");
    rootCheck();
}
// TODO 第三步：检查用户主目录
function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red("当前用户主目录不存在"));
    }
}

// TODO 第四步：检查环境变量
function checkEnv() {
    const dotenv = require("dotenv");
    const dotenvPath = path.resolve(userHome, ".env");
    // 判断主目录是否有 .env 文件 来存放环境变量
    if (pathExists(dotenvPath)) {
        dotenv.config({
            path: dotenvPath,
        });
    } else {
        // TODO 设置默认的环境变量
        createDefaultConfig();
    }
}
// 创建默认环境变量
function createDefaultConfig() {
    if (process.env.CLI_HOME) {
        process.env.CLI_HOME_PATH = path.join(userHome, process.env.CLI_HOME);
    } else {
        process.env.CLI_HOME_PATH = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
}
// TODO 第五步：检查是否需要全局更新
async function checkGlobalUpdate() {
    const npmName = pkg.name;
    const { getNpmSemverVersion } = require("@eit-tool/get-npm-info");
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn(
            colors.yellow(`请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${lastVersion}
                  更新命令： npm install -g ${npmName}`)
        );
    }
}

module.exports = core;

// reuqire 加载方式： .js / .json / .node
// .js -> module.exports / exports.
// .json -> JSON.parse
// any -> .js 其他文件也当js 来执行
