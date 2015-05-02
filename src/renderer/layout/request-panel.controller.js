'use babel';

angular.module("scout").controller('RequestPanelCtrl', function (httpService) {
  let self = this;

  self.request = httpService.request;
  self.newHeaderName = '';
  self.newHeaderValue = '';
  self.newParamName = '';
  self.newParamValue = '';
  self.nav = new RequestNavigation();

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

  self.submitParam = () => {
    if (self.newParamName === undefined ||
        self.newParamName === null ||
        self.newParamName === '') {
      return;
    }

    httpService.request.addParameter(self.newParamName, self.newParamValue);
    self.newParamName = '';
    self.newParamValue = '';
  };
});

let PanelNavigation = require('../common/panel-nav');

class RequestNavigation extends PanelNavigation {
  constructor() {
    super();
    this.model = [
      {targetViewId: 'headers', label: 'Headers'},
      {targetViewId: 'params', label: 'Parameters'},
      {targetViewId: 'body', label: 'Body'},
      {targetViewId: 'raw', label: 'Raw'},
      {targetViewId: 'options', label: 'Options', iconClass: 'fa fa-gear fa-lm'}
    ];

    this.templatePartialPath = 'templates/nav-request-';
    this.select('headers');
  }
}
