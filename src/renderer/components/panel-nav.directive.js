
angular.module('scout').directive('navView', function () {
  return {
    restrict: 'A',
    scope: {
      navView: "="
    },
    templateUrl: './templates/nav-request-{{navView}}.html'
  };
});

angular.module('scout').directive('navButtons', function () {
  return {
    restrict: 'E',
    templateUrl: './templates/panel-nav-buttons.html'
  };
});
