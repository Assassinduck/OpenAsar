const { app } = require('electron');

log('Bootstrap', 'Forcing Electron props');
app.name = 'discord'; // Force name as sometimes breaks data path even with "discord" name (also fixes kernel?)

const requireNative = require('./utils/requireNative');

const paths = require('./paths');
global.moduleDataPath = paths.getModuleDataPath(); // Global because discord

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', 'Loaded build info', buildInfo);

// Just required for startup
const appSettings = require('./appSettings');
const GPUSettings = require('./GPUSettings');
const crashReporterSetup = require('./crashReporterSetup');
const splashScreen = require('./splash/splashScreen');
const Constants = require('./Constants');
const autoStart = require('./autoStart');

const updater = require('./updater/updater');
const moduleUpdater = require('./updater/moduleUpdater');
const appUpdater = require('./updater/appUpdater');

const settings = appSettings.getSettings();
if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();

let desktopCore;
const startCore = () => {
  desktopCore = requireNative('discord_desktop_core');
  log('Bootstrap', 'Required desktop_core:', desktopCore);

  desktopCore.startup({
    paths,
    splashScreen,
    moduleUpdater,
    autoStart,
    buildInfo,
    appSettings,
    Constants,
    GPUSettings,
    updater,
    crashReporterSetup
  });
};

const startUpdate = () => {
  appUpdater.update(false, () => {
    startCore();
  }, () => {
    log('Bootstrap', 'Setting main window visible');
    desktopCore.setMainWindowVisible(true);

    setTimeout(() => { // Try to update our asar
      if (!oaConfig.autoupdate) return; // If autoupdate disabled, don't update

      const asarUpdate = require('./asarUpdate');

      try {
        asarUpdate();
      } catch (e) {
        log('AsarUpdate', 'Failed to update', e);
      }
    }, 1000);
  });
};

const hasArgvFlag = (flag) => (process.argv || []).slice(1).includes(flag);

module.exports = () => {
  // Paths logging
  log('Paths', `Init! Returns:
getUserData: ${paths.getUserData()}
getUserDataVersioned: ${paths.getUserDataVersioned()}
getResources: ${paths.getResources()}
getModuleDataPath: ${paths.getModuleDataPath()}
getInstallPath: ${paths.getInstallPath()}`);

  const instanceLock = app.requestSingleInstanceLock();
  const allowMultiInstance = hasArgvFlag('--multi-instance') || oaConfig.multiInstance; // argv flag or config

  if (!instanceLock && !allowMultiInstance) {
    log('Bootstrap', 'Non-first instance, quitting (multi-instance disabled)');
    return app.quit();
  }

  if (app.isReady()) {
    startUpdate();
  } else {
    app.once('ready', startUpdate);
  }
};