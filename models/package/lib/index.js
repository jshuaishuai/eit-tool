"use strict";
const pkgDir = require("pkg-dir").sync;
const pathExists = require("path-exists").sync;
const path = require("path");
const fse = require("fs-extra");
const npminstall = require("npminstall");
const formatPath = require("@eit-tool/format-path");
const {
    getNpmLatestVersion,
    getDefaultRegistry,
} = require("@eit-tool/get-npm-info");
class Package {
    constructor(options) {
        // console.log(options);
        if (!options) {
            throw new Error("Package类的options参数不能为空！");
        }
        if (!Object.prototype.toString.call(options) === "[object Object]") {
            throw new Error("Package类的options参数必须为对象！");
        }
        // package的目标路径
        this.targetPath = options.targetPath;
        // 缓存package的路径
        this.storeDir = options.storeDir;
        // package的name
        this.packageName = options.packageName;
        // package的version
        this.packageVersion = options.packageVersion;
        // package的缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace("/", "_");
    }
    get cacheFilePath() {
        return path.resolve(
            this.storeDir,
            `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
        );
    }
    getSpecificCacheFilePath(packageVersion) {
        return path.resolve(
            this.storeDir,
            `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
        );
    }
    async prepare() {
        if (this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirpSync(this.storeDir);
        }
        if (this.packageVersion === "latest") {
            this.packageVersion = getNpmLatestVersion(this.packageName);
        }
    }

    // 判断当前package 是否存在
    async exists() {
        if (this.storeDir) {
            await this.prepare();
            return pathExists(this.cacheFilePath);
        } else {
            return pathExists(this.targetPath);
        }
    }

    // 安装 packages

    async install() {
        await this.prepare();
        return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [
                {
                    name: this.packageName,
                    version: this.packageVersion,
                },
            ],
        });
    }
    // 更新 package
    async update() {
        await this.prepare();
        // 1. 获取最新的npm模块版本号
        const latestPackageVersion = await getNpmLatestVersion(
            this.packageName
        );
        // 2. 查询最新版本号对应的路径是否存在
        const latestFilePath =
            this.getSpecificCacheFilePath(latestPackageVersion);
        // 3. 如果不存在，则直接安装最新版本
        if (!pathExists(latestFilePath)) {
            await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [
                    {
                        name: this.packageName,
                        version: latestPackageVersion,
                    },
                ],
            });
            this.packageVersion = latestPackageVersion;
        } else {
            this.packageVersion = latestPackageVersion;
        }
    }

    // 获取入口路径

    getRootPath() {
        function _getRootFilePath(targetPath) {
            // 1. 获取package.json 所在目录
            const dir = pkgDir(targetPath);
            // 2. 读取package.json
            if (dir) {
                const pkgFile = require(path.resolve(dir, "package.json"));
                // 3. 寻找main 入口
                if (pkgFile && pkgFile.main) {
                    // 4. 路径兼容mac 和 windows
                    return formatPath(path.resolve(dir, pkgFile.main));
                }
            }
            return null;
        }
        if (this.storeDir) {
            return _getRootFilePath(this.cacheFilePath);
        } else {
            return _getRootFilePath(this.targetPath);
        }
    }
}

module.exports = Package;
