'use babel';

angular.module("scout").controller('RequestPanelCtrl', function (httpService) {
  this.request = httpService.request;
  this.newHeaderName = '';
  this.newHeaderValue = '';

  this.submitHeader = () => {
    httpService.request.addHeader(this.newHeaderName, this.newHeaderValue);
    this.newHeaderName = '';
    this.newHeaderValue = '';
  };
});
