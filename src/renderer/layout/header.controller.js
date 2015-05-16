'use babel';

angular.module("scout").controller('HeaderCtrl',
  function ($scope) {
    let self = this;

    self.httpEnvelope = scout.envelope;

    self.sendRequest = () => {
      self.httpEnvelope.sendRequest(
        // we have to tell Angular that the model has been updated
        function () { $scope.$apply(); }
      );
    };
  }
);
