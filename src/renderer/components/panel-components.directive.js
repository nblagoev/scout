
angular.module('scout').directive('panelHeader', function () {
  return {
    restrict: 'E',
    scope: {
      nav: "=navigation",
      title: "@"
    },
    templateUrl: 'templates/panel-header.html'
  };
});

angular.module('scout').directive('panelBody', function () {
  return {
    restrict: 'E',
    //todo: isolate the scope
    link: function (scope, element, attrs) {
      scope.$watch(attrs.view, function(value) {
        scope.view = value;
      });
    },
    template: '<div class="panel-body"> <ng-include src="view"></ng-include> </div>'
  };
});
