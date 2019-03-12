
const MACOS   = "darwin"
const WINDOWS = "win32"
const LINUX   = "linux"

const child      = require('child_process')
const portHelper = require('./portHelper')
//var execPath     = "Rscript"
//const {  BrowserWindow } = require('electron')
const path = require('path')

exports.execPath=null
exports.port=null
exports.process  = null
//exports.window   = null

exports.startPointRProcess =()=>{
  if(!!exports.process){ //idiot check
    console.log('cannot startPointRProcess: already started?')
    return;
  }
  exports.port = portHelper.randomPort()
  console.log('portMain=' + exports.port)
  console.log('execPath=' + exports.execPath)
  exports.process = child.spawn(exports.execPath, ["-e",
  "library(shiny);shinyOptions(electron=TRUE);shiny::runApp(system.file('App', package = 'pointR'), port=" + exports.port + ")"
  ])
  exports.process.stdout.on('data', (data) => {
    console.log(`stdout:${data}`)
  })
  exports.process.stderr.on('data', (data) => {
    console.log('ptR.stderr')
    console.log(`stderr:${data}`)
  })
  exports.process.on('error', function (err) { // todo: handle error
    console.log('failure : ' + err);
    rscriptLoadError = true
  });
  return exports.process
}

// exports.createPointRWindow = function(loadingWindow, cleanUpApplication, exitConfirmed) {
//   exports.window = new BrowserWindow({
//     icon: path.join(__dirname, '../build/icons/icon.icns'),
//     webPreferences: {
//       nodeIntegration: false ,
//       preload: __dirname + "preloadPtr.js"   //"preload.js"
//     },
//     show: false,
//     width: 1200,
//     height: 600,
//     title: "ptR"
//   })
//   exports.window.webContents.once('dom-ready', () => {
//     console.log(new Date().toISOString() + '::window loaded')
//     setTimeout(() => {
//       exports.window.show()
//       if (process.platform = MACOS) {
//         exports.window.reload()
//       }
//       loadingWindow.hide()
//       loadingWindow.close()
//     }, 500) 
//   })
//   console.log('window port='+exports.port)
//   exports.window.loadURL('http://127.0.0.1:' + exports.port)
//   //window.setMenu(null)
//   exports.window.setMenuBarVisibility(false)
//   //window.setAutoHideMenuBar(true)
//   // exports.window.webContents.on('did-finish-load',  ()=> {console.log(new Date().toISOString() + '::did-finish-load')});
//   // exports.window.webContents.on('did-start-load',   ()=> {console.log(new Date().toISOString() + '::did-start-load')});
//   // exports.window.webContents.on('did-stop-load',    ()=> {console.log(new Date().toISOString() + '::did-stop-load')});
//   // exports.window.webContents.on('dom-ready',        ()=> {console.log(new Date().toISOString() + '::dom-ready')});
//   //window.webContents.openDevTools() // Open the DevTools.
//   // exports.window.on('close', function (event) {
//   //   console.log("window::close event")
//   //   console.log("confirmExit=" + JSON.stringify(exitConfirmed()))
//   //   if (!exitConfirmed()) {
//   //     event.preventDefault();
//   //     console.log("window:: after e.preventDefault()")
//   //     exports.window.webContents.send('appCloseCmd', 'now')
//   //   }
//   // });
//   // // Emitted when the window is closed.
//   // exports.window.on('closed', function () {
//   //   console.log(new Date().toISOString() + '::window.closed()')
//   //   cleanUpApplication()
//   // })
//   //exports.window=window
//   return exports.window
// } //end createPointRWindow
