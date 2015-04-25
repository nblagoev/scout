'use babel';

angular.module("scout").controller('HeaderCtrl', function ($scope, httpService) {
  let self = this;

  self.method = 'get';
  self.address = '';
  self.inProgress = false;

  self.sendRequest = () => {
    if (self.inProgress) {
      return;
    }
    
    self.inProgress = true;
    httpService.sendRequest(self.method, self.address,
      // we have to tell Angular that the model has been updated
      function () { $scope.$apply(() => self.inProgress = false); }
    );
  };
});
