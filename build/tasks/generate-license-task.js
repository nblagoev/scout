
var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {
  var spawn = require('./task-helpers')(grunt).spawn;
  var rm = require('./task-helpers')(grunt).rm;
  var mkdir = require('./task-helpers')(grunt).mkdir;
  var cp = require('./task-helpers')(grunt).cp;

  grunt.registerTask('generate-license', 'Generate the license, including the licenses of all dependencies', function (mode) {
    var legalEagle = require('legal-eagle');
    var done = this.async();
    var options = {
      path: process.cwd(),
      overrides: require('./license-overrides')
    };

    legalEagle(options, function (err, dependencyLicenses) {
      if (err != null) {
        console.error(err);
        exit(1);
      }

      var licenseText = getLicenseText(dependencyLicenses);
      if (mode === 'save') {
        var targetPath = path.join(grunt.config.get("scout.appDir"), 'LICENSE');
        fs.writeFileSync(targetPath, licenseText);

        // NB: We need to copy this to the directory above the appDir too so that
       // we have a copy that we can use in mkdeb
        cp(targetPath, path.join(grunt.config.get("scout.shellAppDir"), 'LICENSE'));
      } else {
        console.log(licenseText);
      }

      done();
    });
  });
};

var getLicenseText = function (dependencyLicenses) {
  var keys = require('underscore-plus').keys;
  var text = (fs.readFileSync('LICENSE', 'utf8')) + "\n\nThis application bundles the following third-party packages in accordance\nwith the following licenses:\n\n";
  var names = keys(dependencyLicenses).sort();

  for (var i = 0, len = names.length; i < len; i++) {
    var name = names[i];
    var license = dependencyLicenses[name].license;
    var source = dependencyLicenses[name].source;
    var sourceText = dependencyLicenses[name].sourceText;
    text += "-------------------------------------------------------------------------\n\n";
    text += "Package: " + name + "\n";
    text += "License: " + license + "\n";

    if (source != null) {
      text += "License Source: " + source + "\n";
    }

    if (sourceText != null) {
      text += "Source Text:\n\n";
      text += sourceText;
    }

    text += '\n';
  }

  return text;
};
