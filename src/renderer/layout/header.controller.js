'use babel';

angular.module("scout").controller('HeaderCtrl',
  function ($scope, httpService) {
    let self = this;

    self.method = 'get';
    self.address = '';
    self.httpSrv = httpService;

    self.sendRequest = () => {
      httpService.sendRequest(self.method, self.address,
        // we have to tell Angular that the model has been updated
        function () { $scope.$apply(); }
      );
    };
  }
);
