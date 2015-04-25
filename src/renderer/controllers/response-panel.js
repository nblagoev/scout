'use babel';

angular.module("scout").controller('ResponsePanelCtrl', function (httpService) {
  this.response = httpService.response;
});
