'use babel';

angular.module("scout").controller('RequestPanelCtrl', function (httpService){
  this.request = httpService.request;
});
