 const MACOS   = "darwin"
 const WINDOWS = "win32"
 const LINUX   = "linux"

const child      = require('child_process')
const portHelper = require('./portHelper')

exports.execPath=""

const {  BrowserWindow } = require('electron')

exports.process  = null
exports.window   = null
var portAppRunner=null

createAppRunnerProcess=function (appPath2, argTabId, ptRWin) { //refers to pointRWindow
  console.log('inside createAppRunnerProcess')
  portAppRunner = portHelper.randomPort()
  console.log("portAppRunner=" + portAppRunner)
  let childProcess2 = child.spawn(exports.execPath, ["-e", "shiny::runApp('" + appPath2 + "', port=" + portAppRunner + ")"])
  childProcess2.stdout.on('data', (data) => {
    ptRWin.webContents.send('appRunnerLog', `${data}`, argTabId)
  })
  childProcess2.stderr.on('data', (data) => {
    ptRWin.webContents.send('appRunnerLog', `${data}`, argTabId)
  })
  return childProcess2
}

createAppRunnerWindow =function () { // may need to redo this with a delay screen simililary to pointRWindow.
  console.log('inside createAppRunnerWindow')
  if(!portAppRunner){
      throw('app runner port is bad')
  }
  let runnerWindow = new BrowserWindow({ webPreferences: { nodeIntegration: false }, show: false, width: 1200, height: 600, title: "appRunner" })
  runnerWindow.webContents.openDevTools()
  runnerWindow.loadURL('http://127.0.0.1:' + portAppRunner)
  return runnerWindow
}

exports.launch = async function(argPath, argTabId, pointRWindow){
  console.log('inside appRunner launch ' + argPath + " " + argTabId)
  if (!exports.process) { // create appRunner if not running 
    exports.process = createAppRunnerProcess(argPath, argTabId, pointRWindow)
  }  //wait here
  var alive = await( portHelper.isAlive(portAppRunner) )
  if (!exports.window) {
    exports.window = createAppRunnerWindow()
    exports.window.webContents.once('dom-ready', () => {
      console.log(new Date().toISOString() + '::appRunnerWindow loaded')
      setTimeout(() => {
        exports.window.show()
        if (process.platform = MACOS) {
          exports.window.reload()
        }
      }, 500)
    }) // endof once dom-ready
    exports.window.setMenuBarVisibility(false)
    exports.window.webContents.on('dom-ready', () => {
      pointRWindow.webContents.send('appRunner', 'loaded', argTabId);
    });    // endof ondom-ready  
  } // endof !appRunner
  exports.window.on('closed', function () {
    console.log(new Date().toISOString() + '::appRunnerWindow.closed()')
    pointRWindow.webContents.send('appRunner', 'unloaded', '');
    exports.process.kill();
    exports.process = null
    exports.window = null
  })
  return(exports.window)
}