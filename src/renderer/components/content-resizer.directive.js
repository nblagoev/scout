
angular.module('content-resizer', []).directive('resizer', function($document) {

	return function($scope, $element, $attrs) {

		$element.on('mousedown', function(event) {
			event.preventDefault();

			$document.on('mousemove', mousemove);
			$document.on('mouseup', mouseup);
		});

		function mousemove(event) {

			if ($attrs.resizer == 'vertical') {
				// Handle vertical resizer
				var x = event.pageX;

				if ($attrs.resizerMax) {
					if (x > $attrs.resizerMax) {
						x = parseInt($attrs.resizerMax);
					} else if (x < window.innerWidth - $attrs.resizerMax) {
						x = window.innerWidth - $attrs.resizerMax;
					}
				}

				if ($attrs.resizerMin) {
					if (x < $attrs.resizerMin) {
						x = parseInt($attrs.resizerMin);
					} else if (x > window.innerWidth - $attrs.resizerMin) {
						x = window.innerWidth - $attrs.resizerMin;
					}
				}

				$element.css({
					left: x + 'px'
				});

				angular.element(document.querySelector($attrs.resizerLeft)).css({
					width: x + 'px'
				});

				angular.element(document.querySelector($attrs.resizerRight)).css({
					left: (x + parseInt($attrs.resizerWidth)) + 'px'
				});
			} else {
				// Handle horizontal resizer
				var y = window.innerHeight - event.pageY;

				if ($attrs.resizerMax) {
					if (y > $attrs.resizerMax) {
						y = parseInt($attrs.resizerMax);
					} else if (y < window.innerHeight - $attrs.resizerMax) {
						// TODO: Subtract the header's height, padding, margin and border size
						y = window.innerHeight - $attrs.resizerMax;
					}
				}

				if ($attrs.resizerMin) {
					if (y < $attrs.resizerMin) {
						y = parseInt($attrs.resizerMin);
					} else if (y > window.innerHeight - $attrs.resizerMin) {
						// TODO: Subtract the header's height, padding, margin and border size
						y = window.innerHeight - $attrs.resizerMin;
					}
				}

				$element.css({
					bottom: y + 'px'
				});

				angular.element(document.querySelector($attrs.resizerTop)).css({
					bottom: (y + parseInt($attrs.resizerHeight)) + 'px'
				});
				angular.element(document.querySelector($attrs.resizerBottom)).css({
					height: y + 'px'
				});
			}
		}

		function mouseup() {
			$document.unbind('mousemove', mousemove);
			$document.unbind('mouseup', mouseup);
		}
	};
});
