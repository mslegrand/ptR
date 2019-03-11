// inspired by both
// https://github.com/ksasso/useR_electron_meet_shiny
// https://github.com/dirkschumacher/r-shiny-electron

//require('electron-reload')(__dirname)

const { app, BrowserWindow,  dialog, shell } = require('electron')
const path = require('path')
const axios = require('axios');
const portHelper = require('./src/portHelper')
const appRunner = require('./src/appRunner')
const pointRRunner = require('./src/pointRRunner')
const pkgR = require('./src/pkgHelpR')
const child = require('child_process')
const MACOS = "darwin"
const WINDOWS = "win32"
const LINUX = "linux"
var confirmExit = false
//var appPath = app.getAppPath()


//const killStr = "taskkill /im Rscript.exe /f"
const killStr = ""
const execPath = "Rscript"
//const util = require('util');
//const promise_exec = util.promisify(child.exec);
//const promise_exec = util.promisify(require('child_process').exec);

const util = require('util');
//const exec2 = util.promisify(require('child_process').exec);


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


process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
var loadingWindow=null
//--------------->> pointR ------------------------------------
var pointRProcess = pointRRunner.process
//var pointRWindow  = pointRRunner.window 
var pointRWindow=null

//eventually would like to move this into pointRRunner
function createPointRWindow(){
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
    }, 500) 
  })
  console.log('pointRWindow port='+ pointRRunner.port)
  pointRWindow.loadURL('http://127.0.0.1:' + pointRRunner.port)
  //pointRWindow.setMenu(null)
  pointRWindow.setMenuBarVisibility(false)
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
} //end createPointRWindow

//---------------<< pointR ------------------------------------



// ------------------->> appRunner------------------------------
var appRunnerProcess = appRunner.process
var appRunnerWindow  = appRunner.window
// -------------------<< appRunner------------------------------


//------------------>> ipcMain------------------------------------
// note to self ----- keep all ipcMain in main.js all ipcMain
const { ipcMain } = require('electron')

ipcMain.on('cmdAppRun', (event, argPath, argTabId) => {
  console.log('inside electron main ' + argPath + " " + argTabId)
    try{
      appRunner.launch(argPath, argTabId, pointRWindow)
    } catch(err){
      asyncStartUpErr('Aborting', 'Failed to start App')
      pointRWindow.webContents.send('appRunner', 'unloaded', '');
      if(!!appRunner.window){
        appRunner.window.close()
      }
      if(!!appRunner.process){
        appRunner.process.kill()
        appRunner.process=null
      }
    }
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
const errorBox2= util.promisify(dialog.showErrorBox)
const asyncStartUpErr = async (title, mssg)=>{
  const rtv =await errorBox2( title, mssg)         
}


// checks for r
// checks for packages
// installs packages if necessary
// starts pointRProcess
const tryStartPointRWebserver = async () =>{
  // check for R
  const rversion  = await pkgR.rVersion()
  if(rversion=='quit'){
    throw 'R-version-error'
  }
  // check for required packages
  const missing = await pkgR.missing() //returns array of missing
  //console.log('missing.length=', missing.length)
  if (missing.length > 0) { // if some packages are missing , need to install them. 
    var installNow = await pkgR.ask2Install() // query befor installing?
    if (installNow) { // do the installations
      //console.log('installNow')
      await pkgR.installMissing(loadingWindow)// run install Rscript
    } else {
      throw 'cancel-install-error'
    }
  }
  // finally spawn pointRProcess
  // console.log('calling startPointRProcess')
  pointRRunner.startPointRProcess()
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
  //console.log(new Date().toISOString() + '::showing loading');
  loadingWindow.loadURL(`file://${__dirname}/src/splash.html`);
  //loadingWindow.webContents.openDevTools()  //for debugging only
  loadingWindow.once('show', async () => {
    var abortStartUp=null
    console.log('waiting for tryStartPointRWebserve')
    try{
      await tryStartPointRWebserver()
      console.log('calling createPointRWindow')
      // wait for webServer() here
      await portHelper.isAlive(pointRRunner.port )
      createPointRWindow( )
      
    
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
      } else if (abortStartUp==='dead'){
        let result="Cannot estabish pointR-server connection<br>ABORTING..."
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
        await asyncStartUpErr( "Aborting", "Cannot estabish pointR-server")
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
    //pointRRunner.
    createPointRWindow()
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






