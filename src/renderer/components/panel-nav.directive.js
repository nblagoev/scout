
angular.module('scout').directive('navView', function () {
  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.template = attrs.template;
      scope.$watch(attrs.template, function(value) {
        scope.template = value;
      });
    },
    template: '<ng-include src="template"></ng-include>'
  };
});

angular.module('scout').directive('navButtons', function () {
  return {
    restrict: 'E',
    templateUrl: './templates/panel-nav-buttons.html'
  };
});
