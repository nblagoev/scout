var path = require('path');
var pkg = require('../../package.json');

if (process.platform === 'win32') {
  process.env.ATOM_HOME = path.join(process.env.USERPROFILE, '.' + pkg.name);
  process.env.SCOUT_HOME = path.join(process.env.USERPROFILE, '.scout');
} else {
  process.env.ATOM_HOME = path.join(process.env.HOME, '.' + pkg.name);
  process.env.SCOUT_HOME = path.join(process.env.HOME, '.scout');
}
