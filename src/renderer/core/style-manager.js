import path from 'path'
import fs from 'fs-plus'
import {Disposable} from 'event-kit'

/**
 * An instance of this class is always available as the `scout.styles` global.
 */
export default class StyleManager {

  constructor(resourcePath) {
    this.resourcePath = resourcePath
    this.styleElementsBySourcePath = {}
    this.styleSheetDisposablesBySourcePath = {}
  }

  /**
   * Resolve and apply the stylesheet specified by the path.
   *
   * This supports both CSS and Less stylsheets.
   *
   * @param {string} stylesheetPath - A {String} path to the stylesheet that
   *    can be an absolute path or a relative path that will be resolved against the load path.
   *
   * @returns a {Disposable} on which `.dispose()` can be called to remove the
   *    required stylesheet.
   */
  requireStylesheet(stylesheetPath) {
    let fullPath = this.resolveStylesheet(stylesheetPath)
    if (fullPath) {
      let content = this.loadStylesheet(fullPath)
      return this.applyStylesheet(fullPath, content)
    } else {
      let message = `Could not resolve stylesheet '${stylesheetPath}'`
      global.scout.notifications.addError(message, {dismissable: true})
    }
  }

  loadBaseStylesheets(theme) {
    if (!theme || theme === 'light') {
      return this.requireStylesheet('static/styles/scout-light')
    } else if (theme === 'dark') {
      return this.requireStylesheet('static/styles/scout-dark')
    } else {
      global.scout.notifications.addWarning(`Could not find theme '${theme}'`)
      return this.requireStylesheet('static/styles/scout-light')
    }
  }

  resolveStylesheet(stylesheetPath) {
    let extensions = ['css', 'less']
    let pathHasExtension = path.extname(stylesheetPath).length > 0

    if (this.resourcePath) {
      let fullPath = path.join(this.resourcePath, stylesheetPath)
      return pathHasExtension ? fullPath : fs.resolveExtension(fullPath, extensions)
    } else {
      return fs.resolveOnLoadPath(stylesheetPath, pathHasExtension ? void 0 : extensions)
    }
  }

  loadStylesheet(stylesheetPath) {
    if (path.extname(stylesheetPath) === '.less') {
      return this.loadLessStylesheet(stylesheetPath)
    } else {
      return fs.readFileSync(stylesheetPath, 'utf8')
    }
  }

  loadLessStylesheet(lessStylesheetPath) {
    if (this.lessCache == null) {
      let LessCache = require('less-cache')
      let cacheOptions = {
        resourcePath: this.resourcePath,
        cacheDir: path.join(fs.absolute(process.env.SCOUT_HOME), 'compile-cache', 'less'),
        importPaths: [ path.join(this.resourcePath, 'static', 'styles') ],
        fallbackDir: path.join(this.resourcePath, 'less-compile-cache')
      }

      this.lessCache = new LessCache(cacheOptions)
    }

    try {
      return this.lessCache.readFileSync(lessStylesheetPath)
    } catch (error) {
      let message = `Error loading Less stylesheet: '${lessStylesheetPath}'`
      let detail = error.message
      global.scout.notifications.addError(message, {detail, dismissable: true})
    }
  }

  removeStylesheet(stylesheetPath) {
    let disposableSheet = this.styleSheetDisposablesBySourcePath[stylesheetPath]
    if (disposableSheet) {
      disposableSheet.dispose()
    }
  }

  applyStylesheet(sourcePath, source) {
    let styleElement = this.styleElementsBySourcePath[sourcePath]
    let updated = false

    if (sourcePath && styleElement) {
      updated = true
    } else {
      styleElement = document.createElement('style')
      styleElement.setAttribute('source-path', sourcePath)
    }

    styleElement.textContent = source

    if (!updated) {
      document.head.appendChild(styleElement)
      this.styleElementsBySourcePath[sourcePath] = styleElement
    }

    this.styleSheetDisposablesBySourcePath[sourcePath] = new Disposable(() => {
      document.head.removeChild(styleElement)
      let sourcePath = styleElement.getAttribute('source-path')
      if (this.styleElementsBySourcePath[sourcePath]) {
        delete this.styleElementsBySourcePath[sourcePath]
      }
    })

    return this.styleSheetDisposablesBySourcePath[sourcePath]
  }
}
