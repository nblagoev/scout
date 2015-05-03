'use babel';

angular.module('scout').factory('httpService', function() {
  let {HttpService} = require('../common/http-service');
  return new HttpService();
});
