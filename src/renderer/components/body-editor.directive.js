
angular.module("scout").directive("bodyEditor", function($timeout) {
  return {
    restrict: "E",
    replace: true,
    require: "ngModel",
    scope: {
      content: "="
    },
    template: "<div class='body-editor'></div>",
    link: function(scope, element, attrs, ngModelCtrl) {
      var CodeMirror = require('../../../vendor/components/codemirror/lib/codemirror.js');
      require('../../../vendor/components/codemirror/mode/http/http.js');
      scout.styles.requireStylesheet("vendor/components/codemirror/lib/codemirror.css");
      scout.styles.requireStylesheet("vendor/components/codemirror/theme/scout.css");
      var editor = CodeMirror(element[0], {
        lineNumbers: true,
        lineWrapping: true,
        theme: "scout"
      });

      $timeout(function(){
        ngModelCtrl.$render = function() {
          if (typeof ngModelCtrl.$viewValue == 'string') {
            editor.setValue(ngModelCtrl.$viewValue || '');
          }
        }

        editor.on('change', function() {
          ngModelCtrl.$setViewValue(editor.getValue() || '');
        });
      });

      scope.$on('$destroy', function() {
        editor.off('change');
      });
    }
  };
});
