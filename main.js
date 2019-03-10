// inspired by https://github.com/ksasso/useR_electron_meet_shiny
//require('electron-reload')(__dirname)

const { app, BrowserWindow,  dialog, shell } = require('electron')
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


//const util = require('util');
//const promise_exec = util.promisify(child.exec);
//const promise_exec = util.promisify(require('child_process').exec);

const util = require('util');
const exec2 = util.promisify(require('child_process').exec);


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
 
startPointRProcess =()=>{
  pointRProcess = child.spawn(execPath, ["-e",
  "library(shiny);shinyOptions(electron=TRUE);shiny::runApp(system.file('App', package = 'pointR'), port=" + port + ")"
  ])
  pointRProcess.stdout.on('data', (data) => {
    console.log(`stdout:${data}`)
  })
  pointRProcess.stderr.on('data', (data) => {
    console.log('ptR.stderr')
    console.log(`stderr:${data}`)
  })
  pointRProcess.on('error', function (err) { // todo: handle error
    console.log('failure : ' + err);
    rscriptLoadError = true
  });
}

let loadingWindow=null
let pointRWindow=null

//--------------->> Main------------------------------------
// note to self : put in  a  pointRWindow.js file???
function createMainWindow(){
  pointRWindow = new BrowserWindow({
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
  pointRWindow.webContents.once('dom-ready', () => {
    console.log(new Date().toISOString() + '::pointRWindow loaded')
    setTimeout(() => {
      pointRWindow.show()
      if (process.platform = MACOS) {
        pointRWindow.reload()
      }
      loadingWindow.hide()
      loadingWindow.close()
    }, 7000) // kludge to try to ensure that the shiny server (pointRProcess) is running before launching the browser
    // todo: rewrite to use http.head with 200 return to launch pointRWindow: see https://github.com/dirkschumacher/r-shiny-electron
  })
  console.log('pointRWindow port='+port)
  pointRWindow.loadURL('http://127.0.0.1:' + port)
  //pointRWindow.setMenu(null)
  pointRWindow.setMenuBarVisibility(false)
  //pointRWindow.setAutoHideMenuBar(true)
  pointRWindow.webContents.on('did-finish-load',  ()=> {console.log(new Date().toISOString() + '::did-finish-load')});
  pointRWindow.webContents.on('did-start-load',   ()=> {console.log(new Date().toISOString() + '::did-start-load')});
  pointRWindow.webContents.on('did-stop-load',    ()=> {console.log(new Date().toISOString() + '::did-stop-load')});
  pointRWindow.webContents.on('dom-ready',        ()=> {console.log(new Date().toISOString() + '::dom-ready')});
  //pointRWindow.webContents.openDevTools() // Open the DevTools.
  pointRWindow.on('close', function (event) {
    console.log("pointRWindow::close event")
    console.log("confirmExit=" + JSON.stringify(confirmExit))
    if (!confirmExit) {
      event.preventDefault();
      console.log("pointRWindow:: after e.preventDefault()")
      pointRWindow.webContents.send('appCloseCmd', 'now')
    }
  });
  // Emitted when the window is closed.
  pointRWindow.on('closed', function () {
    console.log(new Date().toISOString() + '::pointRWindow.closed()')
    cleanUpApplication()
  })
} //end createMainWindow
//---------------<< Main------------------------------------



// ------------------->> appRunner------------------------------
// Note to self: put appRunner in src/appRunner.js file???
var appRunnerProcess = null
var appRunnerWindow = null

function createAppRunnerProcess(appPath2, argTabId) { //refers to pointRWindow
  console.log('inside createAppRunnerProcess')
  port2 = portHelper.randomPort()
  console.log("portAppRunner=" + port2)
  let childProcess2 = child.spawn(execPath, ["-e", "shiny::runApp('" + appPath2 + "', port=" + port2 + ")"])
  childProcess2.stdout.on('data', (data) => {
    pointRWindow.webContents.send('appRunnerLog', `${data}`, argTabId)
  })
  childProcess2.stderr.on('data', (data) => {
    pointRWindow.webContents.send('appRunnerLog', `${data}`, argTabId)
  })
  return childProcess2
}

function createAppRunnerWindow(port2) { // may need to redo this with a delay screen simililary to pointRWindow.
  console.log('inside createAppRunnerWindow')
  let runnerWindow = new BrowserWindow({ webPreferences: { nodeIntegration: false }, show: false, width: 1200, height: 600, title: "appRunner" })
  runnerWindow.webContents.openDevTools()
  runnerWindow.loadURL('http://127.0.0.1:' + port2)
  return runnerWindow
}


//------------------>> ipcMain------------------------------------
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
      }, 5000)

    }) // endof once dom-ready
    appRunnerWindow.setMenuBarVisibility(false)
    appRunnerWindow.webContents.on('dom-ready', () => {
      pointRWindow.webContents.send('appRunner', 'loaded', argTabId);
    });    // endof ondom-ready  
  } // endof !appRunner
  appRunnerWindow.on('closed', function () {
    console.log(new Date().toISOString() + '::appRunnerWindow.closed()')
    pointRWindow.webContents.send('appRunner', 'unloaded', '');
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
    pointRWindow.setTitle(arg1 + " " + arg2)
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
      appRunnerWindow=null //?
    }
  }
)
//------------------<< ipcMain------------------------------------





//----------------->> startup ---------------------------------------
const tryStartPointRWebserver = async () =>{
  const rversion  = await pkgR.rVersion()
  if(rversion=='quit'){
    console.log('prior to throw')
    throw 'R-version-error'
  }
  // check for required packages
  const missing = await pkgR.missing()
  console.log('missing.length=', missing.length)
  if (missing.length > 0) { // if some packages are missing , need to install them. 
    var installNow = await pkgR.ask2Install() // query befor installing?
    if (installNow) { // do the installations
      console.log('installNow')
      await pkgR.installMissing(loadingWindow)// run install Rscript
    } else {
      throw 'cancel-install-error'
    }
  }
  // finally spawn pointRProcess
  console.log('calling startPointRProcess')
  startPointRProcess()
  // insert delay here ???
  return('success')
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
    var abortStartUp=null
    console.log('waiting for tryStartPointRWebserve')
    try{
      await tryStartPointRWebserver()
      console.log('calling createMainWindow')
      createMainWindow()
    } 
    catch( err){
      abortStartUp=err
      console.log('err is:'+err)
      setTimeout(() => {
      console.log('and here')
      loadingWindow.hide()
      loadingWindow.close()
      cleanUpApplication()
      },5000) //die after 5 seconds
    } 
    if(!!abortStartUp){
      if(abortStartUp==='R-version-error'){
        console.log('founds err is:'+abortStartUp)
        let result="R was not found!<br>ABORTING..."
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
        await asyncStartUpErr( "Aborting", "Rscript Load Error Have you installed R?")
        
      } else if (abortStartUp==='cancel-install-error'){
        let result="Package installation canceled<br>ABORTING..."
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
        await asyncStartUpErr( "Aborting", "Package Installation Aborted by User")
      } else {
        console.log('loading window once '+ abortStartUp)
      }

      //app.quit()
      //loadingWindow.close()
      //cleanUpApplication()
    }
    
  })
  loadingWindow.show()
}) 

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (pointRWindow === null) {
    createMainWindow()
  }
})
//-----------------<< startup ---------------------------------------

//------------------>> cleanUp------------------------------------
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

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  console.log('EVENT::window-all-closed')
  /*	if( !confirmExit ){
            
            //event.preventDefault();
             console.log("pointRWindow:: after e.preventDefault()")
            //confirmed=true;
            pointRWindow.webContents.send( 'appCloseCmd', 'now') 
    }
    */
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // cleanUpApplication()
})
//------------------<< cleanUp------------------------------------






