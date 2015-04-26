'use babel';

angular.module("scout").controller('RequestPanelCtrl', function (httpService) {
  let self = this;

  self.request = httpService.request;
  self.newHeaderName = '';
  self.newHeaderValue = '';

  self.submitHeader = () => {
    if (self.newHeaderName === undefined ||
        self.newHeaderName === null ||
        self.newHeaderName === '') {
      return;
    }

    httpService.request.addHeader(self.newHeaderName, self.newHeaderValue);
    self.newHeaderName = '';
    self.newHeaderValue = '';
  };
});
