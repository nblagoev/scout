'use babel';

angular.module("scout").controller('ManagementPanelCtrl', function () {
  let self = this;

  self.nav = new ManagementNavigation();
});

let PanelNavigation = require('../common/panel-nav');

class ManagementNavigation extends PanelNavigation {
  constructor() {
    super();
    this.model = [
      {targetViewId: 'collections', label: 'Collections'},
      {targetViewId: 'history', label: 'History'},
      {targetViewId: 'cookies', label: 'Cookies'}
    ];

    this.templatePartialPath = 'templates/nav-management-';
    this.select('collections');
  }
}
