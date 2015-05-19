'use babel';

angular.module("scout").controller('RequestPanelCtrl', function ($scope) {
  let self = this;
  let {CompositeDisposable} = require('event-kit');
  let subscriptions = new CompositeDisposable();

  self.request = scout.envelope.request;
  self.newHeaderName = '';
  self.newHeaderValue = '';
  self.newParamName = '';
  self.newParamValue = '';
  self.nav = new RequestNavigation();

  subscriptions.add(
    scout.storage.onDidChange("hints:httpHeaders", (event) => {
      let headerHints = [];
      let headers = event.newValue;

      for (let value in headers) {
        headerHints.push({value});
      }

      self.headerHints = headerHints;
    })
  );

  // TODO: Provide a central place to load and work with hints
  let hintsConfig = scout.storage.requireStorageFile("hints");
  hintsConfig.setDefaults("httpHeaders", require("../../../config/hintmap.json").httpHeaders);

  self.submitHeader = () => {
    if (self.newHeaderName === undefined ||
        self.newHeaderName === null ||
        self.newHeaderName === '') {
      return;
    }

    self.request.addHeader(self.newHeaderName, self.newHeaderValue);
    self.newHeaderName = '';
    self.newHeaderValue = '';
  };

  self.submitParam = () => {
    if (self.newParamName === undefined ||
        self.newParamName === null ||
        self.newParamName === '') {
      return;
    }

    self.request.addParameter(self.newParamName, self.newParamValue);
    self.newParamName = '';
    self.newParamValue = '';
  };

  $scope.$on("$destroy", () => {
    self.headerHints = null;
    subscriptions.dispose();
    subscriptions = null;
  });
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
