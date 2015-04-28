
module.exports = function (grunt) {

  grunt.registerTask('check-licenses', 'Report the licenses of all dependencies', function () {

    var legalEagle = require('legal-eagle');
    var _ = require('underscore-plus');

    var done = this.async();
    var options = {
      path: process.cwd(),
      omitPermissive: true,
      overrides: require('./license-overrides')
    };

    legalEagle(options, function (err, summary) {

      if (err != null) {
        console.error(err);
        process.exit(1);
      }

      for (var key in summary) {
        if (key.match(/^scout@/)) {
          delete summary[key];
        }
      }

      if (_.size(summary)) {
        console.error("Found dependencies without permissive licenses:");

        var sorted = _.keys(summary).sort();
        for (var i = 0, len = sorted.length; i < len; i++) {
          var name = sorted[i];
          console.error("" + name);
          console.error("  License: " + summary[name].license);
          console.error("  Repository: " + summary[name].repository);
        }

        process.exit(1);
      }

      done();
    });

  });

};
