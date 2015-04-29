
angular.module('scout').directive('navView', function () {
  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch(attrs.template, function(value) {
        scope.template = value;
      });
    },
    template: '<ng-include src="template"></ng-include>'
  };
});
