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
    scout.storage.onDidChange("hints:headers", (event) => {
      let headerHints = [];
      let headers = event.newValue;

      for (let name in headers) {
        let metadata = headers[name];
        headerHints.push({
          name: name,
          type: metadata.type,
          description: metadata.description,
          moreLink: metadata.moreLink
        });
      }

      self.headerHints = headerHints;
    })
  );

  // TODO: Provide a central place to load and work with hints
  let hintsConfig = scout.storage.requireStorageFile("hints");
  hintsConfig.setDefaults("headers", require("../../../config/hintmap.json").headers);

  self.valueHintsForHeader = (headerName) => {
    let values = scout.storage.get(`hints:headers.${headerName}.values`) || {};
    let result = [];

    for (let key in values) {
      let metadata = values[key];
      result.push({
        name: key,
        type: metadata.type,
        description: metadata.description,
        moreLink: metadata.moreLink
      });
    }

    return result;
  };

  self.submitHeader = () => {
    if (self.newHeaderName === undefined ||
        self.newHeaderName === null ||
        self.newHeaderName === '') {
      return;
    }

    self.request.addHeader(self.newHeaderName, self.newHeaderValue);

    if (!scout.storage.get(`hints:headers.${self.newHeaderName}`)) {
      scout.storage.set(`hints:headers.${self.newHeaderName}`, {type: 'xh-user-header'});
    }

    let headerValues = scout.storage.get(`hints:headers.${self.newHeaderName}.values`);
    if (!headerValues) {
      headerValues = {};
    }

    if (!headerValues[self.newHeaderValue]) {
      headerValues[self.newHeaderValue] = {type: 'x-user-header-value'};

      scout.storage.set(`hints:headers.${self.newHeaderName}.values`, headerValues);
    }

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
