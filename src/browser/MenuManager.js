
import app from 'app'
import Menu from 'menu'
import _ from 'lodash'
import EventEmitter from 'events'
import {join} from 'path'
import BrowserWindow from 'browser-window'

let platformMenu = require(`../menus/${process.platform}.json`)

export class MenuManager extends EventEmitter {

  constructor(argv) {
    super()
    this.argv = argv
    _.each(['bindMenuItems', 'systemMenuItems', 'addImages', 'attachToWindow',
      'buildMenuSelectorActions'], (fun) => {
      this[fun] = this[fun].bind(this)
    })

    this.attachToWindow()
  }

  attachToWindow() {
    this.menuSelectorActions = this.buildMenuSelectorActions()
    let menuTemplate = _.cloneDeep(platformMenu)
    this.bindMenuItems(menuTemplate)
    this.systemMenuItems(menuTemplate)
    this.addImages(menuTemplate)
    this.menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(this.menu)
  }

  buildMenuSelectorActions() {
    return {
      'application:new-window': this.openNewWindow,
      'application:quit': this.quitApplication,
      'window:close': this.closeWindow,
      'window:reload': this.windowReload,
      'window:toggle-full-screen': this.toggleFullScreen,
      'application:minimize': this.minimizeWindow,
      'application:maximize': this.maximizeWindow
    }
  }

  bindMenuItems(menuItems) {
    for (let menuItem of menuItems) {
      if ((menuItem.role && !menuItem.submenu) ||
        menuItem.type === 'separator' ||
        menuItem.selector) {
        continue
      }

      if (menuItem.submenu) {
        this.bindMenuItems(menuItem.submenu)
        continue
      }

      menuItem.click = this.menuSelectorActions[menuItem.command] || this.forward
    }
  }

  addImages(menuItems) {
    if (process.platform !== 'darwin') {
      return
    }

    const nativeImage = require('electron').nativeImage
    let promptMenu = menuItems[4]
    let langMenu = _.find(promptMenu.submenu, (item) => item.label === 'Language')
    _.each(langMenu.submenu, (menu) => {
      menu.icon = nativeImage.createFromPath(join(__dirname, '..', 'logos', `${menu.value}.png`))
    })
  }

  openNewWindow() {
    app.emit('ready', 'new-window')
  }

  forward(item, focusedWindow) {
    let callback = (browser) => browser.webContents.send(item.command, item.value)
    if (!focusedWindow) {
      let [window] = BrowserWindow.getAllWindows()
      if (!window) {
        app.emit('ready-action', callback)
      } else {
        window.show()
        callback(window)
      }
    } else {
      callback(focusedWindow)
    }
  }

  windowReload(item, focus) {
    if (!focus) {
      return
    }

    focus.reload()
  }

  toggleFullScreen(item, focusedWindow) {
    let isFullScreen = focusedWindow.isFullScreen()
    focusedWindow.setFullScreen(!isFullScreen)
  }

  quitApplication() {
    app.quit()
  }

  closeWindow(item, window) {
    window.close()
  }

  minimizeWindow(item, window) {
    window.minimize()
  }

  maximizeWindow(item, window) {
    window.maximize()
  }

  systemMenuItems(menuItems) {
    if (this.argv.debug) {
      let devTools = {
        label: 'Toggle Developer Tools',
        accelerator: (() => process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I')(),
        click: function(item, window) {
          if (window) {
            window.toggleDevTools()
          }
        }
      }
      // view menu
      let pos = process.platform === 'darwin' ? 3 : 2
      let {submenu} = menuItems[pos]
      submenu.push(devTools)
    }
  }
}
