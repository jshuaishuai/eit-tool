#! /usr/bin/env node

const importLocal = require('import-local');
if(importLocal(__dirname)){
    require('npmlog').info('cli','正在使用 eit-tool 本地版本');
}else{
    require('../lib')(process.argv.slice(2))
}