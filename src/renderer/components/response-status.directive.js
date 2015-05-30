
angular.module('scout').directive('responseStatus', function () {
  var utils = require("../common/utils");
  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch(attrs.code, function(value) {
        scope.code = value;
        scope.statusClass = utils.getStatusClass(value);
      });
    },
    template: '<span class="topcoat-notification {{statusClass}}-code">{{code}}</span>'
  };
});
