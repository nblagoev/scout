
angular.module("scout").directive("scoutCanvas", function(){
  return {
    restrict: "E",
    transclude: true,
    templateUrl: "main.html"
  };
});
