
// set node env as production to avoid react warnings leaking in our console window & explode
process.env.NODE_ENV = 'development';

require('../renderer/app');
