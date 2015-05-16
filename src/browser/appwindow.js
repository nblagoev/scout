"use babel";

import Menu from 'menu';
import app from 'app';
import fs from 'fs';
import ipc from 'ipc';
import path from 'path';
import os from 'os';
import net from 'net';
import url from 'url';
import _ from 'underscore-plus';
import {Emitter} from 'event-kit';
import BrowserWindow from 'browser-window';

export default class AppWindow extends Emitter {
  constructor(options) {
    super();

    let windowOpts = {
      width: 920,
      height: 600,
      show: false,
      title: options.title || "Scout",
      'web-preferences': {
        'subpixel-font-scaling': true,
        'direct-write': true
      }
    };

    if (process.platform === 'linux') {
      windowOpts.icon = path.resolve(__dirname, '..', '..', 'resources', 'scout.png');
    }

    this.browserWindow = new BrowserWindow(windowOpts);

    this.handleEvents();

    this.loadSettings = _.extend({}, options);
    this.loadSettings.appVersion = app.getVersion();
    this.browserWindow.loadSettings = this.loadSettings;

    let targetPath = path.resolve(__dirname, '..', '..', 'static', 'index.html');

    let targetUrl = url.format({
      protocol: 'file',
      pathname: targetPath,
      slashes: true,
      hash: encodeURIComponent(JSON.stringify(this.loadSettings))
    });

    this.browserWindow.loadUrl(targetUrl);
  }

  handleEvents() {
    this.browserWindow.on('closed', (e) => {
      this.emit('closed', e);
    });

    this.browserWindow.on('devtools-opened', (e) => {
      this.browserWindow.webContents.send('window:toggle-dev-tools', true);
    });

    this.browserWindow.on('devtools-closed', (e) => {
      this.browserWindow.webContents.send('window:toggle-dev-tools', false);
    });

    this.browserWindow.on('unresponsive', (e) => {
      if (options.isSpec) {
        return;
      }

      let dialog = require('dialog');
      let chosen = dialog.showMessageBox(this.browserWindow, {
        type: 'warning',
        buttons: ['Close', 'Keep Waiting'],
        message: 'Scout is not responding',
        detail: 'The application is not responding. Would you like to force close it or just keep waiting?'
      });

      if (chosen === 0) {
        return this.browserWindow.destroy();
      }
    });

    this.browserWindow.on('crashed', (e) => {
      if (options.exitWhenDone) {
        app.exit(100);
      }

      let dialog = require('dialog');
      let chosen = dialog.showMessageBox(this.browserWindow, {
        type: 'warning',
        buttons: ['Close Window', 'Reload', 'Keep It Open'],
        message: 'Scout has crashed',
        detail: 'Please report this issue to https://github.com/nikoblag/scout'
      });

      switch (chosen) {
        case 0:
          return this.browserWindow.destroy();
        case 1:
          return this.browserWindow.restart();
      }
    });
  }

  get dimensions() {
    let [x, y] = this.browserWindow.getPosition();
    let [width, height] = this.browserWindow.getSize();
    return {x, y, width, height};
  }

  toggleFullScreen() {
    this.browserWindow.setFullScreen(!this.browserWindow.isFullScreen());
  }

  toggleDevTools() {
    this.browserWindow.toggleDevTools();
  }

  reload() {
    this.browserWindow.restart();
  }

  close() {
    this.browserWindow.close();
    this.browserWindow = null;
  }

  focus() {
    this.browserWindow.focus();
  }

  minimize() {
    this.browserWindow.minimize();
  }

  maximize() {
    this.browserWindow.maximize();
  }

  restore() {
    this.browserWindow.restore();
  }
}
