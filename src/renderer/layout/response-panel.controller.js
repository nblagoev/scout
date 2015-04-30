'use babel';

angular.module("scout").controller('ResponsePanelCtrl', function (httpService) {
  let self = this;

  self.response = httpService.response;
  self.nav = new ResponseNavigation();
});

let PanelNavigation = require('../common/panel-nav');

class ResponseNavigation extends PanelNavigation {
  constructor() {
    super();
    this.model = [
      {targetViewId: 'headers', label: 'Headers'},
      {targetViewId: 'body', label: 'Body'},
      {targetViewId: 'raw', label: 'Raw'}
    ];

    this.templatePartialPath = 'templates/nav-response-';
    this.select('headers');
  }
}
