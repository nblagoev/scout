"use babel";

var fs = require('fs-plus');
var path = require('path');
var {Disposable} = require('event-kit');
var _ = require('underscore-plus');

class StyleManager {

  constructor(resourcePath) {
    this.resourcePath = resourcePath;
    this.styleElementsBySourcePath = {};
    this.styleSheetDisposablesBySourcePath = {};
  }

  /*
   * Resolve and apply the stylesheet specified by the path.
   *
   * This supports both CSS and Less stylsheets.
   *
   * * `stylesheetPath` A {String} path to the stylesheet that can be an absolute
   *   path or a relative path that will be resolved against the load path.
   *
   * Returns a {Disposable} on which `.dispose()` can be called to remove the
   * required stylesheet.
   */
  requireStylesheet(stylesheetPath) {
    let fullPath = this.resolveStylesheet(stylesheetPath);
    if (fullPath) {
      let content = this.loadStylesheet(fullPath);
      return this.applyStylesheet(fullPath, content);
    } else {
      throw new Error(`Could not find a file at path '${stylesheetPath}'`);
    }
  }

  loadBaseStylesheets() {
    this.requireStylesheet('static/styles/main');
  }

  resolveStylesheet(stylesheetPath) {
    if (path.extname(stylesheetPath).length > 0) {
      return fs.resolveOnLoadPath(stylesheetPath);
    } else {
      return fs.resolveOnLoadPath(stylesheetPath, ['css', 'less']);
    }
  }

  loadStylesheet(stylesheetPath) {
    if (path.extname(stylesheetPath) == '.less') {
      return this.loadLessStylesheet(stylesheetPath);
    } else {
      return fs.readFileSync(stylesheetPath, 'utf8');
    }
  }

  loadLessStylesheet(lessStylesheetPath) {
    if (this.lessCache == null || this.lessCache == undefined) {
      let LessCache = require('less-cache');
      let cacheOptions = {
        resourcePath: this.resourcePath,
        cacheDir: path.join(fs.absolute('~/.scout'), 'compile-cache', 'less'),
        importPaths: [ path.join(this.resourcePath, 'static/styles') ],
        fallbackDir: path.join(this.resourcePath, 'less-compile-cache')
      };

      this.lessCache = new LessCache(cacheOptions);
    }

    try {
      return this.lessCache.readFileSync(lessStylesheetPath);
    } catch (error) {
      let message = `Error loading Less stylesheet: '${lessStylesheetPath}'`;
      let detail = error.message;
      //scout.notifications.addError(message, {detail, dismissable: true});
      throw error
    }
  }

  removeStylesheet(stylesheetPath) {
    let disposableSheet = this.styleSheetDisposablesBySourcePath[stylesheetPath];
    if (disposableSheet) {
      disposableSheet.dispose();
    }
  }

  applyStylesheet(sourcePath, source) {
    let styleElement = this.styleElementsBySourcePath[sourcePath];
    let updated = false;

    if (sourcePath && styleElement) {
      updated = true;
    } else {
      styleElement = document.createElement('style');
      styleElement.setAttribute('source-path', sourcePath);
    }

    styleElement.textContent = source;

    if (!updated) {
      document.head.appendChild(styleElement);
      this.styleElementsBySourcePath[sourcePath] = styleElement;
    }

    this.styleSheetDisposablesBySourcePath[path] = new Disposable(() => {
      document.head.removeChild(styleElement);
      let sourcePath = styleElement.getAttribute('source-path');
      if (this.styleElementsBySourcePath[sourcePath]) {
        delete this.styleElementsBySourcePath[sourcePath];
      }
    });
  }
}

module.exports = StyleManager;
