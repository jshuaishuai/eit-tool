const request = require('@eit-tool/request');

module.exports = function() {
    return request({
      url: '/eit/project',
    });
  };
  