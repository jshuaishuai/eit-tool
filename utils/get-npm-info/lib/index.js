'use strict';

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');


/**
 * @description 通过 http 请求获取 npm 包的信息 
 * @param {*} npmName npm 包名
 * @param {*} registry npm地址（可选）
 * @returns 
 */
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios.get(npmInfoUrl).then(response => {
    if (response.status === 200) {
      return response.data;
    }
    return null;
  }).catch(err => {
    return Promise.reject(err);
  });
}
/**
 * @description registry 如果没有值就设置默认值
 * @param {boolean} [isOriginal=false] （可选）默认淘宝源
 * @returns
 */
function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}
/**
 * @description 获取 版本号
 * @param {*} npmName npm 包名
 * @param {*} registry npm 地址
 * @returns Array
 */
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}
/**
 * @description 根据获取到的版本号过滤出符合条件的版本号
 * @param {*} baseVersion 当前版本号
 * @param {*} versions 获取到的所有版本号数组
 * @returns Array
 */
function getSemverVersions(baseVersion, versions) {
  return versions
    .filter(version => semver.satisfies(version, `>${baseVersion}`))
    .sort((a, b) => semver.gt(b, a) ? 1 : -1);
}
/**
 * @description 返回指定版本号
 * @param {*} baseVersion
 * @param {*} npmName
 * @param {*} registry
 * @returns
 */
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return null;
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  if (versions) {
    return versions.sort((a, b) => semver.gt(b, a))[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
