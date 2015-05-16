'use babel';

angular.module("scout").controller('ResponsePanelCtrl', function ($scope) {
  let self = this;
  let decodeWwwForm = require('../util/decodeWwwForm');
  let {CompositeDisposable} = require('event-kit');
  let subscriptions = new CompositeDisposable();

  self.response = scout.envelope.response;
  self.nav = new ResponseNavigation();

  subscriptions.add(
    self.response.onDidChange(['body', "raw"], (changes) => {
      $scope.$apply(() => {
        self.decodedBody = decodeWwwForm(self.response.body);
      });
    })
  );

  $scope.$on("$destroy", () => {
    subscriptions.dispose();
    subscriptions = null;
  });
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
