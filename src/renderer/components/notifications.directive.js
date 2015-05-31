'use babel';

angular.module('scout').directive('notificationsArea', function ($compile) {

  let animationDuration = 700;
  let visibilityDuration = 5000;

  function addNotificationView(notification, scope, element, attrs) {
    let childScope = scope.$new();
    childScope.model = notification;
    let notificationElement = $compile('<scout-notification></scout-notification>')(childScope);
    element.append(notificationElement);
    let subscription;

    if (notification.isDismissable()) {
      subscription = notification.onDidDismiss(() => removeNotification());
    } else {
      // autohide
      setTimeout(() => removeNotification(), visibilityDuration);
    }

    function removeNotification() {
      notificationElement.addClass('remove');
      setTimeout(() => {
        if (subscription) {
          subscription.dispose();
        }

        childScope.$destroy();
        notificationElement.remove();
      }, animationDuration) // keep in sync with CSS animation
    }
  }

  function link(scope, element, attrs) {
    let disposable = scout.notifications.onDidAddNotification(
      (notification) => {
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
        scope.$apply();
      }
    );

    for (let previousNotification of scout.notifications.notifications) {
      addNotificationView(previousNotification, scope, element, attrs);
      previousNotification.setDisplayed(true);
      scope.$apply();
    }

    scope.$on("$destroy", () => {
      disposable.dispose();
    });
  }

  return {
    restrict: 'E',
    link: link
  };
});
