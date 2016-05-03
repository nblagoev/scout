
angular.module('scout').directive('responseTime', function () {
  function getIconClass(responseTime) {
    if (responseTime < 300) {
      return "rocket";
    } else if (responseTime >= 300 && responseTime < 1000) {
      return "car";
    }

    return "bicycle";
  }

  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch(attrs.ms, function(value) {
        scope.ms = value;
        scope.icon = getIconClass(value);
      });
    },
    template: '<span><i class="fa fa-{{icon}}"></i>&nbsp;&nbsp;{{ms}}ms</span>'
  };
});
