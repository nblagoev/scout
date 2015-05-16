'use babel';

import * as throws from '../../common/throws';

export default class PanelNavigation {
  constructor() {
    this.model = [];
    this.selectedView = '';
    this.selectedViewId = '';
    this.templatePartialPath = '';
  }

  select(targetViewId) {
    throws.ifEmpty(targetViewId, "targetViewId");
    this.selectedView = this.templatePartialPath + targetViewId + '.html';
    this.selectedViewId = targetViewId;
  }
}
