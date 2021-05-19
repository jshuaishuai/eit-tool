<!--
 * @Descripttion: Do
 * @Author: 姜帅帅
 * @LastEditTime: 2021-05-16 21:07:34
-->

### 安装

npm install -g eit-tool

### 移除

npm remove -g eit-tool

### 本地创建全局软连接

npm link eit-tool

将当前项目链接到 node 全局 node_modules 中作为一个库文件，并解析 bin 配置创建可执行文件

### 移除本地全局软连接

npm unlink eit-tool

### 库文件

当一个 npm 包需要当做库文件给别人引用，package.json 需要设置 main 入口文件
