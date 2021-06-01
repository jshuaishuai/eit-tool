"use strict";

const frame = [
    "▰▱▱▱▱▱▱",
    "▰▰▱▱▱▱▱",
    "▰▰▰▱▱▱▱",
    "▰▰▰▰▱▱▱",
    "▰▰▰▰▰▱▱",
    "▰▰▰▰▰▰▱",
    "▰▰▰▰▰▰▰",
    "▰▱▱▱▱▱▱",
].join("");

function spawn(command, args, options) {
    const win32 = process.platform === "win32";
    const cmd = win32 ? "cmd" : command;
    const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
    return require("child_process").spawn(cmd, cmdArgs, options);
}

function spinnerStart(msg, spinnerString = "|/-\\") {
    const Spinner = require("cli-spinner").Spinner;
    const spinner = new Spinner("%s" + msg);
    spinner.setSpinnerString(spinnerString);
    spinner.start();
    return spinner;
}

function sleep(delay = 500) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, delay);
    });
}

function execAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const p = spawn(command, args, options);
        p.on("error", (error) => {
            reject(error);
        });
        p.on("exit", (code) => {
            // 正常退出返回 0
            resolve(code);
        });
    });
}

module.exports = {
    spawn,
    spinnerStart,
    sleep,
    execAsync,
};
