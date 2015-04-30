'use babel';

class PanelNavigation {
  constructor() {
    this.model = [];
    this.selectedView = '';
    this.selectedViewId = '';
    this.templatePartialPath = '';
  }

  select(targetViewId) {
    require("../../common/throws").ifEmpty(targetViewId, "targetViewId");
    this.selectedView = this.templatePartialPath + targetViewId + '.html';
    this.selectedViewId = targetViewId;
  }
}

module.exports = PanelNavigation;
