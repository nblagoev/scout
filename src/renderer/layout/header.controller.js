'use babel';

angular.module("scout").controller('HeaderCtrl',
  function ($scope, httpService) {
    let self = this;

    self.httpSrv = httpService;

    self.sendRequest = () => {
      httpService.sendRequest(
        // we have to tell Angular that the model has been updated
        function () { $scope.$apply(); }
      );
    };
  }
);
