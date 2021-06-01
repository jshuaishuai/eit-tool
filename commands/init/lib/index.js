"use strict";

const fs = require("fs");
const inquirer = require("inquirer");
const path = require("path");
const userHome = require("user-home");
const fse = require("fs-extra");
const semver = require("semver");
const log = require("@eit-tool/log");
const Command = require("@eit-tool/command");
const Package = require("@eit-tool/package");
const getProjectTemplate = require("./getProjectTemplate");
const { spinnerStart, sleep, execAsync } = require("@eit-tool/utils");
const colors = require("colors");
class InitCommand extends Command {
    init() {
        this.projectName = this._argv[0] || "";
        this.force = this._argv[1].force;
        log.verbose("projectName", this.projectName);
        log.verbose("force", this.force);
    }
    async exec() {
        log.verbose("模板安装准备");
        // 1. 准备阶段-- 获取模板信息
        const projectInfo = await this.prepare();
        if (!projectInfo) return;
        this.projectInfo = projectInfo;
        // 2. 下载模板阶段
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate();
    }
    async prepare() {
        // 1. 请求模板接口，判断项目模板是否存在
        const template = await getProjectTemplate();
        log.verbose("请求获取模板信息", template);
        if (!template || template.length == 0) {
            throw new Error("项目模板不存在");
        }
        this.template = template;
        // 2. 获取需要下载模板的文件夹路径
        const localPath = process.cwd();
        log.verbose("localPath", localPath);
        // 3. 判断当前文件夹是否为空
        if (!this.isDirEmpty(localPath)) {
            // 不为空 需要询问是否清空当前文件夹内容
            let ifContinue = false;
            if (!this.force) {
                // 询问是否继续创建
                ifContinue = (
                    await inquirer.prompt({
                        type: "confirm",
                        name: "ifContinue",
                        default: false,
                        message: "当前文件夹不为空，是否继续创建项目？",
                    })
                ).ifContinue;
                if (!ifContinue) {
                    return;
                }
            }
            // 给用户做二次确认
            if (ifContinue || this.force) {
                const { confirmDelete } = await inquirer.prompt({
                    type: "confirm",
                    name: "confirmDelete",
                    default: false,
                    message: "是否确认清空当前目录文件？",
                });
                if (confirmDelete) {
                    const spinner = spinnerStart(
                        `${colors.brightGreen("正在清理目录文件...")}`
                    );
                    fse.emptyDirSync(localPath);
                    spinner.stop(true);
                } else {
                    return;
                }
            }
        }
        // 为空 可以继续操作
        log.verbose("emptyDir", "当前文件夹为空");
        return this.switchMold();
    }
    /**
     * 判断当前路径的文件夹是否是空文件夹
     * @param {*} path
     * @returns true 为空！ false 不为空
     */
    isDirEmpty(path) {
        let fileList = fs.readdirSync(path);
        if (fileList && fileList.length > 0) {
            return false;
        }
        return true;
    }
    // 命令行交互
    async switchMold() {
        // 1. 判断用户选择项目模板还是组件模板
        const { type } = await inquirer.prompt({
            type: "list",
            name: "type",
            message: "请选择初始化类型",
            default: "project",
            choices: [
                { name: "项目", value: "project" },
                { name: "组件", value: "component" },
            ],
        });

        let title = type === "project" ? "项目" : "组件";
        function isValidName(v) {
            return /^[a-zA-Z]{1,}([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
                v
            );
        }
        let projectInfo = {};
        /* 校验用户输入的项目名称是否正确 */
        let isProjectNameValid = false;
        if (isValidName(this.projectName)) {
            isProjectNameValid = true;
            projectInfo.projectName = this.projectName;
        }
        // TODO 让用户输入项目或者组件名称
        const projectNamePrompt = {
            type: "input",
            name: "projectName",
            message: `请输入${title}名称`,
            default: !isProjectNameValid ? "" : this.projectName, // 如果输入的项目名称不正确 就取消默认值 否则默认带出原有默认值
            validate: function (v) {
                const done = this.async();
                setTimeout(function () {
                    // 1.首字符必须为英文字符
                    // 2.尾字符必须为英文或数字，不能为字符
                    // 3.字符仅允许"-_"
                    if (!isValidName(v)) {
                        done(`请输入合法的${title}名称`);
                        return;
                    }
                    done(null, true);
                    return v;
                }, 0);
            },
            filter: function (v) {
                return v;
            },
        };
        // TODO 让用户输入项目或组件版本号
        const projectVersionPrompt = {
            type: "input",
            name: "projectVersion",
            message: `请输入${title}版本号`,
            default: "1.0.0",
            validate: function (v) {
                const done = this.async();
                setTimeout(function () {
                    if (!semver.valid(v)) {
                        done("请输入合理的版本号");
                        return;
                    }
                    done(null, true);
                });
            },
            filter: function (v) {
                if (!!semver.valid(v)) {
                    return semver.valid(v);
                } else {
                    return v;
                }
            },
        };
        const templateList = {
            type: "list",
            name: "projectTemplate",
            message: `请选择${title}模板`,
            choices: this.createTemplateChoice(),
        };
        if (type === "project") {
            // TODO 让用户选择 可以使用的项目模板
            const projectContent = await inquirer.prompt([
                projectNamePrompt,
                projectVersionPrompt,
                templateList,
            ]);
            projectInfo = {
                ...projectInfo,
                type,
                ...projectContent,
            };
            return projectInfo;
        } else {
            log.error("error", "暂时还未有提供组件模板");
        }
        return projectInfo;
    }
    //
    createTemplateChoice() {
        return this.template.map((item) => ({
            name: item.name,
            value: item.npmName,
        }));
    }
    // 下载模板
    async downloadTemplate() {
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(
            (item) => item.npmName === projectTemplate
        );
        const targetPath = path.resolve(userHome, ".eit-tool", "template");
        const storeDir = path.resolve(
            userHome,
            ".eit-tool",
            "template",
            "node_modules"
        );
        const { npmName, version } = templateInfo;
        this.templateInfo = templateInfo;
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version,
        });
        this.templateNpm = templateNpm;
        // 没有安装过 就执行安装操作 否则进行包的更新
        if (!(await templateNpm.exists())) {
            const spinner = spinnerStart(
                `${colors.brightGreen("正在下载模板...")}`
            );
            await sleep();
            try {
                await templateNpm.install();
            } catch (error) {
                throw error;
            } finally {
                spinner.stop(true);
                if (await templateNpm.exists()) {
                    log.success("下载模板成功");
                }
            }
        } else {
            // 更新
            const spinner = spinnerStart(
                `${colors.brightBlue("正在更新模板...")}`
            );
            await sleep();
            try {
                await templateNpm.update();
            } catch (error) {
                throw error;
            } finally {
                log.success("更新模板成功");
                spinner.stop(true);
            }
        }
    }
    // 安装模块
    async installTemplate() {
        // 1. 找到缓存路径
        const spinner = spinnerStart("正在安装模板...");
        await sleep();
        // 2. 将模板拷贝到当前路径
        // console.log(this.templateNpm, this.templateNpm.cacheFilePath);
        // 获取模板路径
        const templatePath = path.resolve(
            this.templateNpm.cacheFilePath,
            "template"
        );
        try {
            // 获取当前路径
            const targetPath = process.cwd();
            fse.ensureDirSync(templatePath);
            fse.ensureDirSync(targetPath);
            // 同步拷贝
            fse.copySync(templatePath, targetPath);
        } catch (error) {
            throw error;
        } finally {
            spinner.stop(true);
            log.success("模板安装成功");
        }
        // 开始安装 执行 exec npm install

        const responseInstall = await execAsync("npm", ["install"], {
            cwd: process.cwd(),
            stdio: "inherit",
        });
        if (responseInstall !== 0) {
            throw new Error("npm install 安装依赖失败");
        }
        // 然后执行 exec npm start 启动
        const responseStart = await execAsync("npm", ["start"], {
            cwd: process.cwd(),
            stdio: "inherit",
        });
        if (responseStart !== 0) {
            throw new Error("npm start 执行脚本失败");
        }
    }
}
function init(args) {
    // TODO
    new InitCommand(args);
}
module.exports = init;

// function isValidName(v) {
//     return /^[a-zA-Z]{2,}([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
//         v
//     );
// }
// console.log(isValidName('2'))
// console.log(isValidName('a'))
// console.log(isValidName('aa'))
// console.log(isValidName('a-1'))
// console.log(isValidName('a-'))
