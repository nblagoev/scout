// import React from 'react'
// import ReactDOM from 'react-dom'
import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import remote from 'remote'

import ContextMenu from '../menus/context-menu.json';

(() => {
  let contextMenu = _.cloneDeep(ContextMenu)
  const menu = remote.require('menu').buildFromTemplate(contextMenu)

  window.addEventListener('contextmenu', onContextMenu, false)

  function onContextMenu(e) {
    e.preventDefault()
    if (e.target.tagName.toLowerCase() === 'input' &&
        (e.target.type === 'text' || e.target.type === 'password')) {
      menu.popup(remote.getCurrentWindow())
    }
  }
})();

(() => {
  // Temporary fix for node bug : https://github.com/nodejs/node/issues/3158
  let ownPropertyNames = Object.getOwnPropertyNames.bind(Object)

  Object.getOwnPropertyNames = (o) => {
    let result = ownPropertyNames(o)
    let keys = Object.keys(o)
    let difference = _.difference(keys, result)
    return difference.length ? result.concat(difference) : result
  }
})();

(() => {
  if (!process.env.SCOUT_HOME) {
    let home = (process.platform === 'win32') ? process.env.USERPROFILE : process.env.HOME
    let scoutHome = path.join(home, '.scout')
    try {
      scoutHome = fs.realpathSync(scoutHome)
    } catch (error) {
      // Ignore since the path might just not exist yet.
    }

    process.env.SCOUT_HOME = scoutHome
  }
})()

window.onload = () => {
  let startTime = Date.now()
  let Scout = require('./scout')
  global.scout = new Scout()
  global.scout.initialize()
  global.scout.loadTime = Date.now() - startTime
}
