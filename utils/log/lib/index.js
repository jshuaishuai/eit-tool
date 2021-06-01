"use strict";

const log = require("npmlog");
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info"; // 判断debug
log.heading = "eit"; // 修改前缀
log.addLevel("success", 2000, { inverse: true }, "success"); // 添加自定义命令
module.exports = log;
