"use babel";

var Scout = require('./scout');
window.scout = new Scout();
scout.initialize();

scout.styles.loadBaseStylesheets();

require('angular');

angular.module('scout', ['content-resizer', 'ng-enter']);
require('./components/scout-canvas.directive');
require('./components/ng-enter.directive');
require('./components/content-resizer.directive');
require('./components/panel-components.directive');
require('./components/response-status.directive');
require('./components/response-time.directive');
require('./components/raw-preview.directive');
require('./services/status-bar.service');
require('./services/http.service');
require('./layout/header.controller');
require('./layout/status-bar.controller');
require('./layout/request-panel.controller');
require('./layout/management-panel.controller');
require('./layout/response-panel.controller');

let app = document.createElement('scout-canvas');
document.body.appendChild(app);
