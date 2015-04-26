'use babel';

angular.module("scout").controller('ResponsePanelCtrl', function (httpService) {
  let self = this;
  self.response = httpService.response;
});
