'use babel';

angular.module('scout').directive('notificationsArea', function ($compile) {

  let animationDuration = 700;
  let visibilityDuration = 5000;

  function addNotificationView(notification, scope, element, attrs) {
    let childScope = scope.$new();
    childScope.notification = notification;
    let notificationElement = $compile("<div>{{notification.message}}</div>")(childScope);
    element.append(notificationElement);

    function removeNotification() {
        notificationElement.addClass('remove')
        setTimeout(() => {
          childScope.$destroy();
          notificationElement.remove();
        }, animationDuration) // keep in sync with CSS animation
    }

    if (notification.isDismissable()) {
      notification.onDidDismiss(() => removeNotification());
    } else {
      // autohide
      setTimeout(() => removeNotification(), visibilityDuration);
    }
  }

  function link(scope, element, attrs) {
    let disposable = scout.notifications.onDidAddNotification(
      (notification) => {
        scope.$apply(() => {
          if (scope.lastNotification) {
            // do not show duplicates unless some amount of time has passed
            let timeSpan = notification.timestamp - scope.lastNotification.timestamp;
            if (timeSpan > scope.duplicateTimeDelay || !notification.isEqual(scope.lastNotification)) {
              addNotificationView(notification, scope, element, attrs)
            }
          } else {
            addNotificationView(notification, scope, element, attrs)
          }

          notification.setDisplayed(true);
          scope.lastNotification = notification;
        });
      }
    );

    scope.$on("$destroy", () => {
      disposable.dispose();
    });
  }

  return {
    restrict: 'E',
    link: link
  };
});
