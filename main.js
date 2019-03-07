// inspired by https://github.com/ksasso/useR_electron_meet_shiny
//require('electron-reload')(__dirname)

const { app, BrowserWindow, util, dialog, shell } = require('electron')
const path = require('path')
const portHelper = require('./src/portHelper')
const pkgR = require('./src/pkgHelpR')
const url = require('url')
const port = portHelper.randomPort()
console.log('portMain=' + port)
let port2 = null
const child = require('child_process')
const MACOS = "darwin"
const WINDOWS = "win32"
const LINUX = "linux"
var confirmExit = false
var appPath = app.getAppPath()
//var ptRPath = path.join(appPath, "assets/pointR/inst/App")
//const killStr = "taskkill /im Rscript.exe /f"
var killStr = ""
var execPath = "Rscript"
var rscriptLoadError = false

/*
if(process.platform == WINDOWS){
  //killStr = "taskkill /im Rscript.exe /f"
  appPath = appPath.replace(/\\/g, "\\\\");
  execPath = path.join(app.getAppPath(), "R-Portable-Win", "bin", "RScript.exe" )
} else if(process.platform == MACOS){
  //killStr = 'pkill -9 "R"'
  //execPath = "export PATH=\""+path.join(app.getAppPath(), "R-Portable-Win")+":$PATH\"
  var macAbsolutePath = path.join(app.getAppPath(), "R-Portable-Mac")
  var env_path = macAbsolutePath+((process.env.PATH)?":"+process.env.PATH:"");
  var env_libs_site = macAbsolutePath+"/library"+((process.env.R_LIBS_SITE)?":"+process.env.R_LIBS_SITE:"");
  process.env.PATH = env_path
  process.env.R_LIBS_SITE = env_libs_site
  process.env.NODE_R_HOME = macAbsolutePath
  
  //process.env.R_HOME = macAbsolutePath
  execPath = path.join(app.getAppPath(), "R-Portable-Mac", "bin", "R" )
} else if ( process.platform == LINUX){
  execPath = Rscript //"/usr/bin/Rscript"	
}else {
  console.log("not on windows or mac os or linux os?")
  throw new Error("not on windows or mac os or linux os?")
}
*/
//execPath ="/usr/bin/Rscript";
//execPath="xxx"

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// pointRProcess
var pointRProcess = null
 
startPointProcess =()=>{
  pointRProcess = child.spawn(execPath, ["-e",
  "library(shiny);shinyOptions(electron=TRUE);shiny::runApp(system.file('App', package = 'pointR'), port=" + port + ")"
  ])
  pointRProcess.stdout.on('data', (data) => {
    console.log(`stdout:${data}`)
  })
  pointRProcess.stderr.on('data', (data) => {
    console.log('prR.stderr')
    console.log(`stderr:${data}`)
  })
  pointRProcess.on('error', function (err) { // todo: handle error
    console.log('failure : ' + err);
    rscriptLoadError = true
  });
}

let loadingWindow
let mainWindow

// note to self : put in  a  mainWindow.js file???
function createMainWindow(){
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'build/icons/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      preload: __dirname + "/src/preloadPtr.js"   //"preload.js"
    },
    show: false,
    width: 1200,
    height: 600,
    title: "ptR"
  })
  mainWindow.webContents.once('dom-ready', () => {
    console.log(new Date().toISOString() + '::mainWindow loaded')
    setTimeout(() => {
      mainWindow.show()
      if (process.platform = MACOS) {
        mainWindow.reload()
      }
      loadingWindow.hide()
      loadingWindow.close()
    }, 3000)

  })
  mainWindow.loadURL('http://127.0.0.1:' + port)
  //mainWindow.setMenu(null)
  mainWindow.setMenuBarVisibility(false)
  //mainWindow.setAutoHideMenuBar(true)
  mainWindow.webContents.on('did-finish-load',  ()=> {console.log(new Date().toISOString() + '::did-finish-load')});
  mainWindow.webContents.on('did-start-load',   ()=> {console.log(new Date().toISOString() + '::did-start-load')});
  mainWindow.webContents.on('did-stop-load',    ()=> {console.log(new Date().toISOString() + '::did-stop-load')});
  mainWindow.webContents.on('dom-ready',        ()=> {console.log(new Date().toISOString() + '::dom-ready')});
  //mainWindow.webContents.openDevTools() // Open the DevTools.
  mainWindow.on('close', function (event) {
    console.log("mainWindow::close event")
    console.log("confirmExit=" + JSON.stringify(confirmExit))
    if (!confirmExit) {
      event.preventDefault();
      console.log("mainWindow:: after e.preventDefault()")
      mainWindow.webContents.send('appCloseCmd', 'now')
    }
  });
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    console.log(new Date().toISOString() + '::mainWindow.closed()')
    cleanUpApplication()
  })
} //end createMainWindow



// appRunner
// Note to self: put appRunner in src/appRunner.js file???
let appRunnerProcess = null
let appRunnerWindow = null
function createAppRunnerProcess(appPath2, argTabId) {
  console.log('inside createAppRunnerProcess')
  port2 = portHelper.randomPort()
  console.log("portAppRunner=" + port2)
  let childProcess2 = child.spawn(execPath, ["-e", "shiny::runApp('" + appPath2 + "', port=" + port2 + ")"])
  childProcess2.stdout.on('data', (data) => {
    mainWindow.webContents.send('appRunnerLog', `${data}`, argTabId)
  })
  childProcess2.stderr.on('data', (data) => {
    mainWindow.webContents.send('appRunnerLog', `${data}`, argTabId)
  })
  return childProcess2
}

function createAppRunnerWindow(port2) { // may need to redo this with a delay screen simililary to mainwindow.
  console.log('inside createAppRunnerWindow')
  let runnerWindow = new BrowserWindow({ webPreferences: { nodeIntegration: false }, show: false, width: 1200, height: 600, title: "appRunner" })
  runnerWindow.webContents.openDevTools()
  runnerWindow.loadURL('http://127.0.0.1:' + port2)
  return runnerWindow
}

// note to self ----- keep all ipcMain in main.js all ipcMain
const { ipcMain } = require('electron')

ipcMain.on('cmdAppRun', (event, argPath, argTabId) => {
  console.log('inside electron main ' + argPath + " " + argTabId)
  if (!appRunnerProcess) { // create appRunner if not running 
    appRunnerProcess = createAppRunnerProcess(argPath, argTabId)
  }
  if (!appRunnerWindow) {
    appRunnerWindow = createAppRunnerWindow(port2)
    appRunnerWindow.webContents.once('dom-ready', () => {
      console.log(new Date().toISOString() + '::appRunnerWindow loaded')
      setTimeout(() => {
        appRunnerWindow.show()
        if (process.platform = MACOS) {
          appRunnerWindow.reload()
        }
      }, 2000)

    }) // endof once dom-ready
    appRunnerWindow.setMenuBarVisibility(false)
    appRunnerWindow.webContents.on('dom-ready', () => {
      mainWindow.webContents.send('appRunner', 'loaded', argTabId);
    });    // endof ondom-ready  
  } // endof !appRunner
  appRunnerWindow.on('closed', function () {
    console.log(new Date().toISOString() + '::appRunnerWindow.closed()')
    mainWindow.webContents.send('appRunner', 'unloaded', '');
    appRunnerProcess.kill();
    appRunnerProcess = null
    appRunnerWindow = null
  })
})

ipcMain.on('confirmExitMssg', (event, arg) => {
  console.log(new Date().toISOString() + ':: ipcMain.on confirmExit')
  confirmExit = true;
  console.log(new Date().toISOString() + ':: confirmExit=' + confirmExit)
  event.returnValue = 'hello';
})

ipcMain.on('cmdSetTitle',
  (event, arg1, arg2) => {
    console.log(new Date().toISOString() + ':: ipcMain.on cmdSetTitle')
    mainWindow.setTitle(arg1 + " " + arg2)
  }
)

ipcMain.on('cmdOpenLink',
  (event, arg1, arg2) => {
    console.log(new Date().toISOString() + ':: ipcMain.on cmdOpenLink')
    shell.openExternal(arg1 + arg2)
  }
)

ipcMain.on('cmdStopAppRunner',
  (event, arg1, arg2) => {
    console.log(new Date().toISOString() + ':: ipcMain.on cmdStopAppRunner')
    console.log(arg1 + 'arg2')
    if (!!appRunnerWindow) {
      appRunnerWindow.close()
    }
  }
)


function cleanUpApplication() {
  console.log(new Date().toISOString() + '::cleanUpApplication')
  app.quit()
  if (pointRProcess) {
    pointRProcess.kill();
    if (killStr != "")
      child.execSync(killStr)
  }
  if (appRunnerProcess) {
    appRunnerProcess.kill();
  }
}

// keep here or put in pkgHelpeR.js?
const tryStartPointRWebserver = async () =>{
  // pkgR.runCmd returns a Promise
  try { //check that R is installed
    var res = await pkgR.runCmd(execPath, ['-e', "cat(strsplit( R.version.string, '\\\\s')[[1]][3])"])
    console.log("R version=" + res); // we will adjust this later   
  } catch (error) { //Rscript not there, exit with prejudice
    dialog.showMessageBox(
      {
        message: "Rscript load error :-(\nHave you installed R and pointR?",
        buttons: ["OK"],
      },
      (i) => { cleanUpApplication() }
    )
    return null
  }
  

  // check for required packages
  let missing = await pkgR.missing()
  console.log('missing.length=', missing.length)
  if (missing.length > 0) { // if some packages are missing , need to install them. 
    var installNow = await pkgR.ask2Install() // query befor installing?
    if (installNow) { // do the installations
      console.log('installNow')
      await pkgR.installMissing(loadingWindow)// run install Rscript
    } else {
      // exit with grace
      loadingWindow.hide()
      loadingWindow.close()
      cleanUpApplication() // or possibly reject('User package installtion terminated')
    }
  }
  // finally spawn pointRProcess
  startPointProcess()
}

app.on('ready', async () => {
  // launch loading browser 
  loadingWindow = new BrowserWindow({
    show: false, frame: false,
    //icon: path.join(__dirname, 'build/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      preload: __dirname + "/src/preloadLoader.js"   //"preload.js"
    },
    width: 750, height: 400
  })
  console.log(new Date().toISOString() + '::showing loading');
  loadingWindow.loadURL(`file://${__dirname}/src/splash.html`);
  //loadingWindow.webContents.openDevTools()  //for debugging only
  loadingWindow.once('show', async () => {
    await tryStartPointRWebserver()
    createMainWindow()
  })
  loadingWindow.show()
}) 

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  console.log('EVENT::window-all-closed')
  /*	if( !confirmExit ){
            
            //event.preventDefault();
             console.log("mainWindow:: after e.preventDefault()")
            //confirmed=true;
            mainWindow.webContents.send( 'appCloseCmd', 'now') 
    }
    */
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // cleanUpApplication()
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})


