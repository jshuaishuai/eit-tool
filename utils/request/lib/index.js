'use strict';

const axios = require('axios');
const baseURL = process.env.BASE_URL ? process.env.BASE_URL : 'http://39.106.100.186:7000/';
const request = axios.create({
    baseURL,
    timeout:5000, // 超时5s 结束请求
});

request.interceptors.response.use((response)=> response.data,(error)=> Promise.reject(error));

module.exports = request;
