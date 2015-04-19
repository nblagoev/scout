"use babel";

var app = require('app');
var ipc = require('ipc');
var Menu = require('menu');
var path = require('path');
var season = require('season');
var _ = require('underscore-plus');
var {Emitter} = require('event-kit');

class ApplicationMenu extends Emitter {
  constructor(options) {
    super();
    let menuJson = season.resolve(path.join(process.resourcesPath, 'app.asar', 'menus', process.platform + ".json"))
    let template = season.readFileSync(menuJson);

    this.template = this.translateTemplate(template.menu, options.pkg);
  }

  attachToWindow(window) {
    this.menu = Menu.buildFromTemplate(_.deepClone(this.template));
    Menu.setApplicationMenu(this.menu);
  }

  wireUpMenu(menu, command) {
    menu.click = () => this.emit(command);
  }

  translateTemplate(template, pkgJson) {
    let emitter = this.emit;

    for (let i = 0, len = template.length; i < len; i++) {
      let item = template[i];

      if (item.metadata == null) {
        item.metadata = {};
      }

      if (item.label) {
        item.label = (_.template(item.label))(pkgJson);
      }

      if (item.command) {
        this.wireUpMenu(item, item.command);
      }

      if (item.submenu) {
        this.translateTemplate(item.submenu, pkgJson);
      }
    }

    return template
  }

  acceleratorForCommand(command, keystrokesByCommand) {
    let keystrokes = keystrokesByCommand[command];
    let firstKeystroke = keystrokes != null ? keystrokes[0] : undefined;

    if (!firstKeystroke) {
      return null;
    }

    let modifiers = firstKeystroke.split('-');
    let key = modifiers.pop();

    modifiers = modifiers.map((modifier) => {
      return modifier.replace(/shift/ig, "Shift")
                     .replace(/cmd/ig, "Command")
                     .replace(/ctrl/ig, "Ctrl")
                     .replace(/alt/ig, "Alt");
    });

    let keys = modifiers.concat([key.toUpperCase()]);
    return keys.join("+");
  }
}

module.exports = ApplicationMenu;
