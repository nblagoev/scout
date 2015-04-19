var fs = require('fs');
var path = require('path');

// Warning: You almost certainly do *not* want to edit this code - instead, you
// want to edit src/renderer/main.js instead
window.onload = function () {
  try {
    var startTime = Date.now();

    // Ensure SCOUT_HOME is always set before anything else is required
    setupScoutHome();

    var rawLoadSettings = decodeURIComponent(location.hash.substr(1));
    var loadSettings;
    try {
      loadSettings = JSON.parse(rawLoadSettings);
    } catch (error) {
      console.error("Failed to parse load settings: " + rawLoadSettings);
      throw error;
    }

    // Require before the module cache in dev mode
    if (loadSettings.devMode) {
      require('../src/babel').register();
    }

    require('vm-compatibility-layer');

    if (!loadSettings.devMode) {
      require('../src/babel').register();
    }

    window.loadSettings = loadSettings;

    require(loadSettings.bootstrapScript);
    require('ipc').sendChannel('window-command', 'window:loaded');

    if (global.scout) {
      global.scout.loadTime = Date.now() - startTime;
      console.log('Window load time: ' + global.scout.loadTime + 'ms');
    }
  }
  catch (error) {
    var currentWindow = require('remote').getCurrentWindow();
    currentWindow.setSize(800, 600);
    currentWindow.center();
    currentWindow.show();
    currentWindow.openDevTools();

    console.error(error.stack || error);
  }
};

var setupScoutHome = function() {
  if (!process.env.SCOUT_HOME) {
    var home;
    if (process.platform === 'win32') {
      home = process.env.USERPROFILE;
    } else {
      home = process.env.HOME;
    }

    var scoutHome = path.join(home, '.scout');
    try {
      scoutHome = fs.realpathSync(scoutHome);
    } catch (error) {
      // Ignore since the path might just not exist yet.
    }

    process.env.SCOUT_HOME = scoutHome;
  }
}
