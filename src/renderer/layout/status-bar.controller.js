'use babel';

angular.module("scout").controller('StatusBarCtrl',
  function (statusBarService, httpService) {
    let self = this;
    self.data = statusBarService;
    self.httpSrv = httpService;
  }
);
