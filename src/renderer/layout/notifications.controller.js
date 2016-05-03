angular.module("scout").controller('NotificationsCtrl', function ($scope) {
  let disposable = scout.onWillThrowError(({message, url, line, originalError, preventDefault}) => {
    preventDefault();

    let options = {
      detail: `${url}:${line}`,
      stack: originalError.stack,
      dismissable: true
    };

    scout.notifications.addFatalError(message, options);
  });

  $scope.$on("$destroy", () => {
    disposable.dispose();
  });

  $scope.duplicateTimeDelay = 500;
  $scope.lastNotification = null;
});
