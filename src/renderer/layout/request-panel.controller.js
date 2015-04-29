'use babel';

angular.module("scout").controller('RequestPanelCtrl', function (httpService) {
  let self = this;

  self.request = httpService.request;
  self.newHeaderName = '';
  self.newHeaderValue = '';
  self.nav = new PanelNavigation();

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

class PanelNavigation {
  constructor() {
    this.model = [
      {targetViewId: 'headers', label: 'Headers'},
      {targetViewId: 'params', label: 'Parameters'},
      {targetViewId: 'body', label: 'Body'},
      {targetViewId: 'raw', label: 'Raw'},
      {targetViewId: 'options', label: 'Options', iconClass: 'fa fa-gear fa-lm'},
    ];

    this.selectedView = 'templates/nav-request-headers.html';
  }

  select(targetViewId) {
    require("../../common/throws").ifEmpty(targetViewId, "targetViewId");
    this.selectedView = 'templates/nav-request-' + targetViewId + '.html';
  }
}
