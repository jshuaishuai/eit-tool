'use strict';
const pathExists = require('path-exists').sync;
const pkgDir = require('pkg-dir').sync;
const path = require('path');
const fse = require('fs-extra');
const formatPath = require('@eit-tool/format-path')
const { getNpmLatestVersion } = require('@eit-tool/get-npm-info')
class Package {
    constructor(options) {
        console.log(options);
        if (!options) {
            throw new Error('Package类的options参数不能为空！');
        }
        if (!Object.prototype.toString.call(options) === '[object Object]') {
            throw new Error('Package类的options参数必须为对象！');
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
        this.cacheFilePathPrefix = this.packageName.replace('/', '_');
    }
    get cacheFilePath() {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
    }
    async prepare() {
        if (this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirpSync(this.storeDir);
        }
        if (this.packageVersion === 'lasest') {
            this.packageVersion = getNpmLatestVersion(this.packageName)
        }
    }

    // 判断当前package 是否存在
    async exists() {
        await this.prepare();
        return pathExists(this.cacheFilePath)
    }

    // 安装 packages

    install() {

    }
    // 更新 package
    update() {

    }

    // 获取入口路径

    getRootPath() {
        // 1. 获取package.json 所在目录
        const dir = pkgDir(this.targetPath);
        // 2. 读取package.json 
        if (dir) {
            const pkgFile = require(path.resolve(dir, 'package.json'));
            // 3. 寻找main 入口
            if (pkgFile && pkgFile.main) {
                // 4. 路径兼容mac 和 windows
                return formatPath(path.resolve(dir, pkgFile.main));
            }
        }
        return null;
    }

}

module.exports = Package;


