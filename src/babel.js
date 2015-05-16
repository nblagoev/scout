
var crypto = require('crypto');
var fs = require('fs-plus');
var path = require('path');
var babel = require('babel-core');

var stats = {
  hits: 0,
  misses: 0
};

var defaultOptions = {
  sourceMap: 'inline',
  blacklist: [],
  stage: 0,
  optional: ['asyncToGenerator']
};

/*
 * shasum - Hash with an update() method.
 * value - Must be a value that could be returned by JSON.parse().
 */
function updateDigestForJsonValue(shasum, value) {
  var type = typeof value;
  if (type === 'string') {
    shasum.update('"', 'utf8');
    shasum.update(value, 'utf8');
    shasum.update('"', 'utf8');
  } else if (type === 'boolean' || type === 'number') {
    shasum.update(value.toString(), 'utf8');
  } else if (value === null) {
    shasum.update('null', 'utf8');
  } else if (Array.isArray(value)) {
    shasum.update('[', 'utf8');
    for (var i = 0, len = value.length; i < len; i++) {
      var item = value[i];
      updateDigestForJsonValue(shasum, item);
      shasum.update(',', 'utf8');
    }

    shasum.update(']', 'utf8');
  } else {
    var keys = Object.keys(value);
    keys.sort();
    shasum.update('{', 'utf8');
    for (var j = 0, len = keys.length; j < len; j++) {
      var key = keys[j];
      updateDigestForJsonValue(shasum, key);
      shasum.update(': ', 'utf8');
      updateDigestForJsonValue(shasum, value[key]);
      shasum.update(',', 'utf8');
    }

    shasum.update('}', 'utf8');
  }
}

function createBabelVersionAndOptionsDigest(version, options) {
  var shasum = crypto.createHash('sha1');
  shasum.update('babel-core', 'utf8');
  shasum.update('\0', 'utf8');
  shasum.update(version, 'utf8');
  shasum.update('\0', 'utf8');
  updateDigestForJsonValue(shasum, options);
  return shasum.digest('hex');
}

var cacheDir = path.join(fs.absolute(process.env.SCOUT_HOME), 'compile-cache');

var jsCacheDir = path.join(cacheDir, createBabelVersionAndOptionsDigest(babel.version, defaultOptions), 'js');

function getCachePath(sourceCode) {
  var digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');
  return path.join(jsCacheDir, digest + ".js");
}

function getCachedJavaScript(cachePath) {
  if (fs.isFileSync(cachePath)) {
    try {
      var cachedJavaScript = fs.readFileSync(cachePath, 'utf8');
      stats.hits++;
      return cachedJavaScript;
    } catch (_error) {}
  }

  return null;
}

function createOptions(filePath) {
  var options = {
    filename: filePath
  };

  for (var key in defaultOptions) {
    var value = defaultOptions[key];
    options[key] = value;
  }

  return options;
}

function compileFile(filePath) {
  var sourceCode = fs.readFileSync(filePath, 'utf8');

  if (!/^("use babel"|'use babel')/.test(sourceCode)) {
    return sourceCode;
  }

  var cachePath = getCachePath(sourceCode);
  var js = getCachedJavaScript(cachePath);

  if (!js) {
    var options = createOptions(filePath);

    try {
      js = babel.transform(sourceCode, options).code;
      stats.misses++;
    } catch (error) {
      console.error('Error compiling %s: %o', filePath, error);
      throw error;
    }

    try {
      fs.writeFileSync(cachePath, js);
    } catch (error) {
      console.error('Error writing to cache at %s: %o', cachePath, error);
      throw error;
    }
  }

  return js;
}

function loadFile(module, filePath) {
  var sourceCode = fs.readFileSync(filePath, 'utf8');

  if (!/^("use babel"|'use babel')/.test(sourceCode)) {
    module._compile(sourceCode, filePath);
    return;
  }

  var cachePath = getCachePath(sourceCode);
  var js = getCachedJavaScript(cachePath);

  if (!js) {
    var options = createOptions(filePath);
    try {
      js = babel.transform(sourceCode, options).code;
      stats.misses++;
    } catch (error) {
      console.error('Error compiling %s: %o', filePath, error);
      throw error;
    }

    try {
      fs.writeFileSync(cachePath, js);
    } catch (error) {
      console.error('Error writing to cache at %s: %o', cachePath, error);
      throw error;
    }
  }

  module._compile(js, filePath);
}

function register() {
  Object.defineProperty(require.extensions, '.js', {
    writable: false,
    value: loadFile
  });
}

module.exports = {
  register: register,

  getCacheMisses: function () {
    return stats.misses;
  },

  getCacheHits: function () {
    return stats.hits;
  },

  compileFile: compileFile,

  createBabelVersionAndOptionsDigest: createBabelVersionAndOptionsDigest
};
