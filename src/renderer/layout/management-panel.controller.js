angular.module("scout").controller('ManagementPanelCtrl', function ($scope) {
  let utils = require('../common/utils');
  let moment = require('moment');
  let self = this;
  self.nav = new ManagementNavigation();
  self.history = {
    selectedIndex: -1,
    entries: [],
    select(idx) {
      this.selectedIndex = idx;
      scout.envelope.deserialize(self.history.entries[idx].envelope);
    }
  };

  let updateHistory = () => {
    let entries = scout.history.entries;
    self.history.entries = [];
    self.history.selectedIndex = -1;

    for (let i = entries.length - 1; i >= 0; i--) {
      let entry = entries[i];
      self.history.entries.push({
        method: entry.request.method.toUpperCase(),
        address: entry.request.address,
        statusClass: utils.getStatusClass(entry.response.status),
        timestamp: entry.timestamp,
        renderTimestamp() {
          return moment(entry.timestamp).fromNow();
        },
        envelope: entry
      });
    }
  };

  updateHistory();

  let subscription = scout.history.onDidChange(updateHistory);
  $scope.$on("$destroy", () => {
    subscription.dispose();
  });
});

let PanelNavigation = require('../common/panel-nav');

class ManagementNavigation extends PanelNavigation {
  constructor() {
    super();
    this.model = [
      {targetViewId: 'collections', label: 'Collections'},
      {targetViewId: 'history', label: 'History'}
    ];

    this.templatePartialPath = 'templates/nav-management-';
    this.select('collections');
  }
}
