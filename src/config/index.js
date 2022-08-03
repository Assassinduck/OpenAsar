const { ipcMain, app } = require('electron');

ipcMain.on('DISCORD_UPDATED_QUOTES', (e, c) => {
  if (c === 'o') exports.open();
});

exports.open = () => {
  const win = require('../utils/win')({
    width: 500,
    height: 650
  }, 'config');

  let config = settings.get('openasar', {});
  config.setup = true;
  settings.set('openasar', config);
  settings.save();

  ipcMain.on('cs', (e, c) => {
    config = c;
    settings.set('openasar', config);
    settings.save(); // Ensure saving
  });

  ipcMain.on('cg', e => {
    e.returnValue = config;
  });

  ipcMain.on('cr', () => {
    settings.save();
    app.relaunch();
    app.exit();
  });

  ipcMain.on('of', () => {
    const { shell } = require('electron')
    const { getUserData } = require('../paths')
    const {join} = require('path')
      shell.openPath(join(getUserData(), 'settings.json'))
  })
};