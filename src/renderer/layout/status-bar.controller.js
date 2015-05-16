'use babel';

angular.module("scout").controller('StatusBarCtrl',
  function (statusBarService) {
    let self = this;
    self.data = statusBarService;
    self.httpEnvelope = scout.envelope;
  }
);
