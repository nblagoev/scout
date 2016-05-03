const app = require('app')
const path = require('path')
const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const {MenuManager} = require('./MenuManager')
const Config = require('../package.json')
const _ = require('lodash')
const ipc = electron.ipcMain
const dialog = require('dialog')
const {argv} = require('yargs')
                .usage('Usage: $0 [options]')

                .boolean('d')
                .alias('d', 'debug')
                .describe('d', 'Run in debug mode')

                .help('h')
                .alias('h', 'help')
                .epilog(`Made by Nikolay Blagoev
copyright 2015-2016
                  `)

const windowCache = {}
const dockNotificationCache = {}
const menuManagerCache = {}
let windowCount = 0
let promptOnClose = false

// set application root path as current working directory
process.chdir(app.getAppPath())
global.shellStartTime = Date.now()

function onCloseWindow(e, title, detail) {
  // save history
  const window = BrowserWindow.getFocusedWindow()
  let ret = promptOnClose
  if (promptOnClose) {
    try {
      ret = !!dialog.showMessageBox(window, {
        title: title || 'Close Window',
        buttons: ['Close', 'Cancel'],
        type: 'question',
        message: title || 'Close Window',
        detail: detail || 'Do you want to close this window?'
      })
    } catch (e) {
      ret = false
    }
  }
  if (ret) {
    e.preventDefault()
  }
  e.returnValue = !ret
}

function onFocusWindow(e) {
  e.sender.webContents.send('application:focus')
}

process.on('uncaughtException', (error) => {
  if (error == null) {
    error = {}
  }

  if (error.message != null) {
    console.log(error.message)
  }

  if (error.stack != null) {
    console.log(error.stack)
  }
})

app.on('window-all-closed', () => {
  promptOnClose = false
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (e) => {
  var windows = BrowserWindow.getAllWindows()
  if (!windows.length) {
    return
  }
  var window = BrowserWindow.getFocusedWindow()
  if (!window) {
    windows[0].show()
  }
  onCloseWindow(e, 'Quit Scout', 'Do you want to quit?')
  if (e.returnValue) {
    promptOnClose = false
  } else {
    e.preventDefault()
  }
})

app.on('browser-window-blur', (event, window) => { window.$focus = false })

app.on('browser-window-focus', (event, window) => {
  window.$focus = true
  dockNotificationCache[window.id] = 0
  if (process.platform === 'darwin') {
    app.dock.setBadge('')
  }
})

ipc.on('application:prompt-on-close', (event, flag) => { promptOnClose = flag })

const processParamHandler = (browser) => {
  if (argv.d) {
    console.log('Running in debug mode')
  }
}

app.on('ready', (label) => {
  onReady(label !== 'new-window' ? processParamHandler : null)
})

app.on('ready-action', onReady)

app.on('activate', (event, hasVisibleWindows) => {
  if (!hasVisibleWindows) {
    onReady()
  }
})

ipc.on('application:message-box', function(event, options) {
  dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options)
})

function onReady(fun) {
  let {width, height} = require('screen').getPrimaryDisplay().workAreaSize
  let options = {
    width: Math.floor(width * 0.75),
    height: Math.floor(height * 0.75),
    minHeight: Math.floor(height * 0.5),
    minWidth: Math.floor(width * 0.5),
    resizable: true,
    show: false,
    webPreferences: {
      blinkFeatures: 'OverlayScrollbars',
      plugins: true,
      experimentalFeatures: true,
      experimentalCanvasFeatures: true,
      webgl: true
    }
  }

  if (process.platform === 'linux') {
    options.icon = path.resolve(__dirname, '..', 'icons', 'scout.png')
  }

  let mainWindow = new BrowserWindow(options)
  let id = mainWindow.id
  windowCache[id] = mainWindow
  menuManagerCache[id] = new MenuManager(argv)

  mainWindow.loadURL(`file://${__dirname}/../static/index.html`)
  mainWindow.flashFrame(true)
  mainWindow.setTitle(`${_.capitalize(Config.productName)} - ${windowCount}`)
  windowCount += 1

  mainWindow.on('closed', () => { windowCache[id] = menuManagerCache[id] = null })
  mainWindow.on('close', onCloseWindow)
  mainWindow.on('focus', onFocusWindow)
  mainWindow.flashFrame(true)

  mainWindow.webContents.on('did-finish-load', () => {
    let totalActiveWindows = _.keys(windowCache).length
    if (totalActiveWindows > 1) {
      let fixPos = (axis, adj) => {
        let naxis = axis + adj
        return naxis <= 0 ? axis : naxis
      }
      let [x, y] = mainWindow.getPosition()
      let adj = parseInt(Math.random() * 50) * (Math.random() > 0.3 ? -1 : 1)
      let [nx, ny] = [fixPos(x, adj), fixPos(y, adj)]
      mainWindow.setPosition(nx, ny, true)
    }
    mainWindow.show()
    // Mac only
    if (process.platform === 'darwin') {
      mainWindow.showDefinitionForSelection(true)
      // mainWindow.setVisibleOnAllWorkspaces(true)
    }

    if (typeof fun === 'function') {
      fun(mainWindow)
    }
  })

  console.log(`Scout load time: ${(Date.now() - global.shellStartTime)}ms`)
}
