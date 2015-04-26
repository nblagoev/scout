"use babel";

var fs = require('fs-plus');
var path = require('path');
var remote = require('remote');
var app = remote.require('app');
var Scout = require('../src/renderer/scout');

// Start the crash reporter before anything else.
//require('crash-reporter').start({ productName: 'Scout', companyName: 'Nikolay Blagoev' });

window.scout = new Scout();

let {resourcePath, exitWhenDone} = global.loadSettings;
let specPath = path.join(resourcePath, 'spec/');
specPath = path.resolve(specPath);

if (exitWhenDone) {
  let jasmineFn = require('jasmine');
  jasmineFn(global.jasmine);

  let reporter = new jasmineFn.ConsoleReporter({
    print(str) {
      return process.stdout.write(str);
    },

    onComplete(allPassed) {
      return app.exit(allPassed ? 0 : 1);
    }
  });

  let jasmineEnv = jasmine.getEnv();
  jasmineEnv.addReporter(reporter);

  let paths = fs.listTreeSync(specPath);
  for (let i = 0, len = paths.length; i < len; i++) {
    let specFilePath = paths[i];
    if (/-spec\.js$/.test(specFilePath)) {
      require(specFilePath);
    }
  }

  jasmineEnv.execute();
} else {
  let link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '../vendor/jasmine/lib/jasmine-2.1.3/jasmine.css';
  document.head.appendChild(link);

  window.jasmineRequire = require('../vendor/jasmine/lib/jasmine-2.1.3/jasmine');
  require('../vendor/jasmine/lib/jasmine-2.1.3/jasmine-html');
  require('../vendor/jasmine/lib/jasmine-2.1.3/boot');

  let paths = fs.listTreeSync(specPath);
  for (let i = 0, len = paths.length; i < len; i++) {
    let specFilePath = paths[i];
    if (/-spec\.js$/.test(specFilePath)) {
      require(specFilePath);
    }
  }

  window.jasmineExecute();
}
