"use babel";

var Menu = require('menu');
var app = require('app');
var fs = require('fs');
var ipc = require('ipc');
var path = require('path');
var os = require('os');
var net = require('net');
var url = require('url');
var {EventEmitter} = require('events');
var BrowserWindow = require('browser-window');
var _ = require('underscore-plus');

class AppWindow extends EventEmitter {
  constructor(options) {
    this.loadSettings = _.extend({}, options);
    this.loadSettings.appVersion = app.getVersion();

    let windowOpts = {
      width: 800,
      height: 600,
      title: options.title || "Scout",
      'web-preferences': {
        'subpixel-font-scaling': true,
        'direct-write': true
      }
    };

    windowOpts = _.extend(windowOpts, this.loadSettings);

    this.window = new BrowserWindow(windowOpts);

    this.handleEvents();
  }

  show() {
    let targetPath = path.resolve(__dirname, '..', '..', 'static', 'index.html');

    let targetUrl = url.format({
      protocol: 'file',
      pathname: targetPath,
      slashes: true,
      hash: encodeURIComponent(JSON.stringify(this.loadSettings))
    });

    this.window.loadUrl(targetUrl);
    this.window.show();
  }

  handleEvents() {
    this.window.on('closed', (e) => {
      this.emit('closed', e);
    });

    this.window.on('devtools-opened', (e) => {
      this.window.webContents.send('window:toggle-dev-tools', true);
    });

    this.window.on('devtools-closed', (e) => {
      this.window.webContents.send('window:toggle-dev-tools', false);
    });

    this.window.on('unresponsive', (e) => {
      if (options.isSpec) {
        return;
      }

      let dialog = require('dialog');
      let chosen = dialog.showMessageBox(this.window, {
        type: 'warning',
        buttons: ['Close', 'Keep Waiting'],
        message: 'Scout is not responding',
        detail: 'The application is not responding. Would you like to force close it or just keep waiting?'
      });

      if (chosen === 0) {
        return this.window.destroy();
      }
    });

    this.window.on('crashed', (e) => {
      if (options.exitWhenDone) {
        app.exit(100);
      }

      let dialog = require('dialog');
      let chosen = dialog.showMessageBox(this.window, {
        type: 'warning',
        buttons: ['Close Window', 'Reload', 'Keep It Open'],
        message: 'Scout has crashed',
        detail: 'Please report this issue to https://github.com/nikoblag/scout'
      });

      switch (chosen) {
        case 0:
          return this.window.destroy();
        case 1:
          return this.window.restart();
      }
    });
  }

  toggleFullScreen() {
    this.window.setFullScreen(!this.window.isFullScreen());
  }

  toggleDevTools() {
    this.window.toggleDevTools();
  }

  reload() {
    this.window.webContents.reload();
  }

  close() {
    this.window.close();
    this.window = null;
  }
}

module.exports = AppWindow;
