
/*
 * This is a fork of Hidenari Nozaki's angucomplete-alt with some extra features, optimized for Scout's needs.
 */

angular.module('autocomplete-scout', [] )
  .directive('autocompleteScout', ['$q', '$parse', '$sce', '$timeout', function ($q, $parse, $sce, $timeout) {
  // keyboard events
  var KEY_DW  = 40;
  var KEY_RT  = 39;
  var KEY_UP  = 38;
  var KEY_LF  = 37;
  var KEY_ES  = 27;
  var KEY_EN  = 13;
  var KEY_BS  =  8;
  var KEY_SP  = 32;
  var KEY_DEL = 46;
  var KEY_TAB =  9;

  var MIN_LENGTH = 3;
  var MAX_LENGTH = 524288;  // the default max length per the html maxlength attribute
  var PAUSE = 10;
  var BLUR_TIMEOUT = 200;

  return {
    restrict: 'EA',
    require: '^?form',
    scope: {
      inputModel: '=',
      disableInput: '=',
      hintData: '&',
      id: '@',
      type: '@',
      placeholder: '@',
      applyField: '@',
      searchField: '@',
      titleField: '@',
      descriptionField: '@',
      moreLinkField: '@',
      typeField: '@',
      inputClass: '@',
      pause: '@',
      minlength: '@',
      matchClass: '@',
      inputChanged: '=',
      autoMatch: '@',
      focusOut: '&',
      focusIn: '&'
    },
    template: '<div class="autocomplete-holder" ng-class="{\'autocomplete-dropdown-visible\': showDropdown}">' +
              '  <input id="{{id}}_value" ng-model="inputModel" ng-disabled="disableInput" type="{{type}}" placeholder="{{placeholder}}" maxlength="{{maxlength}}" ng-focus="onFocusHandler()" class="{{inputClass}}" ng-focus="resetHideResults()" ng-blur="hideResults($event)" autocapitalize="off" autocorrect="off" autocomplete="off" style="width: 100%" ng-change="inputChangeHandler(inputModel)"/>' +
              '  <div id="{{id}}_dropdown" class="autocomplete-dropdown" ng-show="showDropdown && results && results.length > 0">' +
              '    <div id="{{id}}_hintList" class="autocomplete-hint-list">' +
              '      <div class="hint-row" ng-repeat="result in results" ng-click="selectResult(result)" ng-mouseenter="hoverRow($index)" ng-class="{\'autocomplete-selected-row\': $index == currentIndex}">' +
              '        <span class="hint-icon-container"><i ng-if="result.type" class="hint-icon {{result.type}}"><span class="hint-icon-letter">{{result.type.split("-")[0]}}</span></i></span>' +
              '        <div class="hint-title" ng-if="matchClass" ng-bind-html="result.title"></div>' +
              '        <div class="hint-title" ng-if="!matchClass">{{ result.title }}</div>' +
              '      </div>' +
              '    </div>' +
              // make the horizontal scrollbar appear only when the maximum width is reached
              // TODO: find a better way
              '    <div class="xscrollfix">{{widestEntry}}</div>' +
              '    <div id="hint-description" ng-if="description && description != \'\'">' +
              '       <span id="hint-description-content">{{description}}</span>' +
              '       <a id="hint-description-more-link" ng-if="moreLink && moreLink != \'\'" href="#" ng-click="openLink(moreLink)">More...</a>' +
              '    </div>' +
              '  </div>' +
              '</div>',
    link: function(scope, elem, attrs, ctrl) {
      var inputField = elem.find('input');
      var minlength = MIN_LENGTH;
      var searchTimer = null;
      var hideTimer;
      var responseFormatter;
      //var dd = elem[0].querySelector('.autocomplete-dropdown');
      var hl = elem[0].querySelector('.autocomplete-hint-list');
      var isScrollOn = false;
      var mousedownOn = null;

      elem.on('mousedown', function(event) {
        mousedownOn = event.target.id;
      });

      scope.currentIndex = null;

      // for IE8 quirkiness about event.which
      function ie8EventNormalizer(event) {
        return event.which ? event.which : event.keyCode;
      }

      function callOrAssign(value) {
        if (typeof scope.inputModel === 'function') {
          scope.inputModel(value.originalObject[scope.applyField || scope.searchField]);
        }
        else {
          scope.inputModel = value.originalObject[scope.applyField || scope.searchField];
        }
      }

      function callFunctionOrIdentity(fn) {
        return function(data) {
          return scope[fn] ? scope[fn](data) : data;
        };
      }

      function setInputString(str) {
        callOrAssign({originalObject: str});
        clearResults();
      }

      function extractTitle(data) {
        // split title fields and run extractValue for each and join with ' '
        return scope.titleField.split(',')
          .map(function(field) {
            return extractValue(data, field);
          })
          .join(' ');
      }

      function extractValue(obj, key) {
        var keys, result;
        if (key) {
          keys= key.split('.');
          result = obj;
          keys.forEach(function(k) { result = result[k]; });
        }
        else {
          result = obj;
        }
        return result;
      }

      function findMatchString(target, str) {
        var result, matches, re;
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
        // Escape user input to be treated as a literal string within a regular expression
        re = new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (!target) { return; }
        matches = target.match(re);
        if (matches) {
          result = target.replace(re,
              '<span class="'+ scope.matchClass +'">'+ matches[0] +'</span>');
        }
        else {
          result = target;
        }
        return $sce.trustAsHtml(result);
      }

      function keyupHandler(event) {
        var which = ie8EventNormalizer(event);
        if (which === KEY_LF || which === KEY_RT) {
          // do nothing
          return;
        }

        if (which === KEY_UP || which === KEY_EN) {
          event.preventDefault();
        }
        else if (which === KEY_DW) {
          event.preventDefault();
          if (!scope.showDropdown && scope.inputModel && scope.inputModel.length >= minlength) {
            initResults();
            searchTimerComplete(scope.inputModel);

            if (scope.results[scope.currentIndex]) {
              scope.description = scope.results[scope.currentIndex].description;
              scope.moreLink = scope.results[scope.currentIndex].moreLink;
            }
          }
        }
        else if (which === KEY_ES) {
          scope.$apply(function () {
            clearResults();
          });
        }
        else {
          if (minlength === 0 && !scope.inputModel) {
            return;
          }

          if (!scope.inputModel || scope.inputModel === '') {
            scope.showDropdown = false;
          } else if (scope.inputModel.length >= minlength) {
            initResults();

            if (searchTimer) {
              $timeout.cancel(searchTimer);
            }

            searchTimer = $timeout(function() {
              searchTimerComplete(scope.inputModel);

              if (scope.results[scope.currentIndex]) {
                scope.description = scope.results[scope.currentIndex].description;
                scope.moreLink = scope.results[scope.currentIndex].moreLink;
              }
            }, scope.pause);
          }
        }
      }

      function hintlistRowOffsetHeight(row) {
        var css = getComputedStyle(row);
        return row.offsetHeight +
          parseInt(css.marginTop, 10) + parseInt(css.marginBottom, 10);
      }

      function hintlistHeight() {
        return hl.getBoundingClientRect().top +
          parseInt(getComputedStyle(hl).maxHeight, 10);
      }

      function hintlistRow() {
        return elem[0].querySelectorAll('.hint-row')[scope.currentIndex];
      }

      function hintlistRowTop() {
        return hintlistRow().getBoundingClientRect().top -
          (hl.getBoundingClientRect().top +
           parseInt(getComputedStyle(hl).paddingTop, 10));
      }

      function hintlistScrollTopTo(offset) {
        hl.scrollTop = hl.scrollTop + offset;
      }

      function keydownHandler(event) {
        var which = ie8EventNormalizer(event);
        var row = null;
        var rowTop = null;

        if (which === KEY_EN && scope.results) {
          if (scope.currentIndex >= 0 && scope.currentIndex < scope.results.length) {
            event.preventDefault();
            scope.selectResult(scope.results[scope.currentIndex]);
          } else {
            clearResults();
          }
          scope.$apply();
        } else if (which === KEY_DW && scope.results) {
          event.preventDefault();
          if ((scope.currentIndex + 1) < scope.results.length && scope.showDropdown) {
            scope.$apply(function() {
              scope.currentIndex++;
              scope.description = scope.results[scope.currentIndex].description;
              scope.moreLink = scope.results[scope.currentIndex].moreLink;
            });

            if (isScrollOn) {
              row = hintlistRow();
              if (hintlistHeight() < row.getBoundingClientRect().bottom) {
                hintlistScrollTopTo(hintlistRowOffsetHeight(row));
              }
            }
          }
        } else if (which === KEY_UP && scope.results) {
          event.preventDefault();
          if (scope.currentIndex >= 1) {
            scope.$apply(function() {
              scope.currentIndex--;
              scope.description = scope.results[scope.currentIndex].description;
              scope.moreLink = scope.results[scope.currentIndex].moreLink;
            });

            if (isScrollOn) {
              rowTop = hintlistRowTop();
              if (rowTop < 0) {
                hintlistScrollTopTo(rowTop - 1);
              }
            }
          }
        } else if (which === KEY_TAB) {
          if (scope.results && scope.results.length > 0 && scope.showDropdown && scope.currentIndex >= 0) {
            scope.selectResult(scope.results[scope.currentIndex]);
            scope.$digest();
          }
          else {
            // no results
          }
        }
      }

      function clearResults() {
        scope.showDropdown = false;
        scope.results = [];
        if (hl) {
          hl.scrollTop = 0;
        }
      }

      function initResults() {
        scope.showDropdown = true;
        scope.currentIndex = 0;
        scope.description = null;
        scope.moreLink = null;
        scope.results = [];
      }

      function getLocalResults(str) {
        var i, s, value, matches = [];
        var hints = scope.hintData();

        for (i = 0; i < hints.length; i++) {
          value = extractValue(hints[i], scope.searchField) || '';

          if (value.toLowerCase().indexOf(str.toLowerCase()) >= 0) {
            matches[matches.length] = hints[i];
          }
        }

        processResults(matches, str);
      }

      function checkExactMatch(result, obj, str) {
        for(var key in obj){
          if(obj[key].toLowerCase() === str.toLowerCase()){
            scope.selectResult(result);
            return;
          }
        }
      }

      function searchTimerComplete(str) {
        // Begin the search
        if (!str || str.length < minlength) {
          return;
        }

        scope.$apply(function() {
          getLocalResults(str);
        });
      }

      function processResults(responseData, str) {
        var i, description, moreLink, type, text;
        var formattedText, formattedDesc;
        scope.widestEntry = "";

        if (responseData && responseData.length > 0) {
          scope.results = [];

          for (i = 0; i < responseData.length; i++) {
            if (scope.titleField && scope.titleField !== '') {
              text = formattedText = extractTitle(responseData[i]);
            }

            description = '';
            // TODO: Support rendering markdown markup for the description
            if (scope.descriptionField) {
              description = formattedDesc = extractValue(responseData[i], scope.descriptionField);
            }

            moreLink = '';
            if (scope.moreLinkField) {
              moreLink = extractValue(responseData[i], scope.moreLinkField);
            }

            type = '';
            if (scope.typeField) {
              type = extractValue(responseData[i], scope.typeField);
            }

            if (scope.matchClass) {
              formattedText = findMatchString(text, str);
            }

            scope.results[scope.results.length] = {
              title: formattedText,
              description: formattedDesc,
              moreLink: moreLink,
              type: type,
              originalObject: responseData[i]
            };

            if (text.length > scope.widestEntry.length) {
              scope.widestEntry = text;
            }

            if (scope.autoMatch) {
              checkExactMatch(scope.results[scope.results.length - 1],
                  {title: text/*, desc: description || ''*/}, scope.inputModel);
            }
          }

        } else {
          scope.results = [];
        }
      }

      function showAll() {
        processResults(scope.hintData(), '');
      }

      scope.onFocusHandler = function() {
        if (scope.focusIn) {
          scope.focusIn();
        }
        if (minlength === 0 && (!scope.inputModel || scope.inputModel.length === 0)) {
          scope.showDropdown = true;
          showAll();
        }
      };

      scope.hideResults = function(event) {
        if (mousedownOn === scope.id + '_dropdown' ||
            mousedownOn === scope.id + '_hintList' ||
            mousedownOn === 'hint-description' ||
            mousedownOn === 'hint-description-content' ||
            mousedownOn === 'hint-description-more-link') {
          mousedownOn = null;
        }
        else {
          hideTimer = $timeout(function() {
            //clearResults();
            scope.$apply(function() {
                clearResults();
            });
          }, BLUR_TIMEOUT);

          if (scope.focusOut) {
            scope.focusOut();
          }
        }
      };

      scope.resetHideResults = function() {
        if (hideTimer) {
          $timeout.cancel(hideTimer);
        }
      };

      scope.hoverRow = function(index) {
        scope.currentIndex = index;
      };

      scope.selectResult = function(result) {
        // Restore original values
        if (scope.matchClass) {
          result.title = extractTitle(result.originalObject);
          //result.description = extractValue(result.originalObject, scope.descriptionField);
        }

        callOrAssign(result);
        clearResults();
      };

      scope.openLink = function (url) {
        require('shell').openExternal(url);
      };

      scope.inputChangeHandler = function(str) {
        if (str.length < minlength) {
          clearResults();
        }
        else if (str.length === 0 && minlength === 0) {
          showAll();
        }

        if (scope.inputChanged) {
          str = scope.inputChanged(str);
        }
        return str;
      };

      // check min length
      if (scope.minlength && scope.minlength !== '') {
        minlength = parseInt(scope.minlength, 10);
      }

      // check pause time
      if (!scope.pause) {
        scope.pause = PAUSE;
      }

      if (!scope.descriptionField) {
        scope.descriptionField = 'description';
      }

      if (!scope.moreLinkField) {
        scope.moreLinkField = 'moreLink';
      }

      if (!scope.typeField) {
        scope.typeField = 'type';
      }

      // set max length (default to maxlength deault from html
      scope.maxlength = attrs.maxlength ? attrs.maxlength : MAX_LENGTH;

      // register events
      inputField.on('keydown', keydownHandler);
      inputField.on('keyup', keyupHandler);

      // set isScrollOn
      $timeout(function() {
        var css = getComputedStyle(hl);
        isScrollOn = css.maxHeight && css.overflowY === 'auto';
      });
    }
  };
}]);
