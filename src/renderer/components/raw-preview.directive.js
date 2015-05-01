
angular.module("scout").directive("rawPreview", function(){
  return {
    restrict: "E",
    replace: true,
    transclude: true,
    scope: {
      content: "@"
    },
    template: "<div class='raw-preview'></div>",
    link: function(scope, element, attrs) {
      var CodeMirror = require('../../../vendor/components/codemirror/lib/codemirror.js');
      require('../../../vendor/components/codemirror/mode/http/http.js');
      scout.styles.requireStylesheet("vendor/components/codemirror/lib/codemirror.css");
      scout.styles.requireStylesheet("vendor/components/codemirror/theme/scout.css");
      var editor = CodeMirror(element[0], {
        mode: "message/http",
        theme: "scout",
        lineNumbers: true
      });

      scope.$watch('content', function(value) {
        editor.setValue(value || '');
      });
    }
  };
});
