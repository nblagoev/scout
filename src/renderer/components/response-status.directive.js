
angular.module('scout').directive('responseStatus', function () {
  function getStatusClass(statusCode) {
    if (statusCode >= 100 && statusCode < 200) {
      return "info";
    } else if (statusCode >= 200 && statusCode < 300) {
      return "success";
    } else if (statusCode >= 300 && statusCode < 400) {
      return "redirect";
    } else if (statusCode >= 400 && statusCode < 500) {
      return "client-error";
    } else if (statusCode >= 500 && statusCode < 600) {
      return "server-error";
    }

    return "unknown";
  }

  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch(attrs.code, function(value) {
        scope.code = value;
        scope.statusClass = getStatusClass(value);
      });
    },
    template: '<span class="topcoat-notification {{statusClass}}-code">{{code}}</span>'
  };
});
