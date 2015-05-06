'use babel';

angular.module('scout').directive('scoutNotification', function () {

  let marked = require('marked');

  let NotificationTemplate = `
    <div class="content">
      <div class="message item"></div>
      <div class="detail item">
        <div class="detail-content"></div>
        <a href="#" class="stack-toggle"></a>
        <div class="stack-container"></div>
      </div>
      <div class="meta item"></div>
    </div>
    <div class="close icon fa fa-close"></div>
  `;

  let FatalMetaNotificationTemplate = `
    <div class="fatal-notification">This is likely a bug in Scout. Please report it <a href="#" class="report-link">here</a>.</div>
  `;

  function addSplitLinesToContainer(container, content) {
    for (let line of content.split('\n')) {
      let div = document.createElement('div');
      div.classList.add('line');
      div.textContent = line;
      container.append(div);
    }
  }

  function handleStackTraceToggleClick(event, container) {
    if (event.preventDefault) {
      event.preventDefault();
    }

    if (container[0].style.display === 'none') {
      event.currentTarget.innerHTML = '<span class="icon fa fa-minus"></span>&nbsp;&nbsp;Hide Stack Trace';
      container[0].style.display = 'block';
    } else {
      event.currentTarget.innerHTML = '<span class="icon fa fa-plus"></span>&nbsp;&nbsp;Show Stack Trace';
      container[0].style.display = 'none';
    }
  }

  function render(model, element) {
    element.addClass(model.type);
    element.addClass(`icon fa-${model.icon}`);

    if (model.detail) {
      element.addClass('has-detail');
    }

    if (model.isDismissable()) {
      element.addClass('has-close');
    }

    if (model.options && model.options.stack) {
      element.addClass('has-stack');
    }

    element.attr('tabindex', '-1');
    element.html(NotificationTemplate);

    let messageContainer = angular.element(element[0].querySelector('.message'));
    messageContainer.html(marked(model.message));

    if (model.detail) {
      let detailsContainer = angular.element(element[0].querySelector('.detail-content'));
      addSplitLinesToContainer(detailsContainer, model.detail);

      if (model.options.stack) {
        let stackToggle = angular.element(element[0].querySelector('.stack-toggle'));
        let stackContainer = angular.element(element[0].querySelector('.stack-container'));

        addSplitLinesToContainer(stackContainer, model.options.stack);

        stackToggle.on('click', (e) => handleStackTraceToggleClick(e, stackContainer));
        handleStackTraceToggleClick({currentTarget: stackToggle[0]}, stackContainer);
      }
    }

    if (model.isDismissable()) {
      let closeButton = angular.element(element[0].querySelector('.close'));
      closeButton.on('click', () => model.dismiss());
    }

    if (model.type === 'fatal') {
      let metaContainer = angular.element(element[0].querySelector('.meta'));
      metaContainer.html(FatalMetaNotificationTemplate);

      let reportLink = angular.element(element[0].querySelector('.report-link'));
      reportLink.on('click', () => {
        require('shell').openExternal('https://github.com/nikoblag/scout/issues');
      });
    }
  }

  function link(scope, element, attrs) {
    try {
     render(scope.model, element);
    } catch (e) {
      console.error(e.message);
      console.error(e.stack);
    }
  }

  return {
    restrict: 'E',
    scope: false,
    link: link
  };
});
