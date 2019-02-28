//require('electron-reload')(__dirname)

const {app, BrowserWindow, util, dialog} = require('electron')

const version ="v.0.3.9.17"

const path = require('path')
const url = require('url')
const port = "9191"

const port2 = "9292"
const child = require('child_process');
const MACOS = "darwin"
const WINDOWS = "win32"
const LINUX = "linux"
var confirmExit = false
var appPath = app.getAppPath()
var ptRPath = path.join(appPath, "assets/pointR/inst/App")

//const killStr = "taskkill /im Rscript.exe /f"
var killStr = ""
var execPath = "Rscript"
var rscriptLoadError=false
const newLocal = "/usr/bin/Rscript";
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
//const pointRProcess = child.spawn(execPath, ["-e", "library(shiny);shinyOptions(electron=TRUE);runApp('"+ptRPath+"', port="+port+")"])
const pointRProcess = child.spawn(execPath, ["-e", "library(shiny);shinyOptions(electron=TRUE);shiny::runApp(system.file('App', package = 'pointR'), port="+port+")"])
//const pointRProcess = child.spawn(execPath, ["-e", "library(shiny);shinyOptions(electron=TRUE);shiny::runApp(system.file('App', package = 'pointR'), port=9191)"])

pointRProcess.stdout.on('data', (data) => {
  console.log(`stdout:${data}`)
})
pointRProcess.stderr.on('data', (data) => {
  console.log('prR.stderr')
  console.log(`stderr:${data}`)
})

pointRProcess.on('error', function(err) {
  console.log('failure : ' + err);
  rscriptLoadError=true
});

// pointR BrowserWindow
let mainWindow

function createWindow () {
     console.log('create-window')
     let loading = new BrowserWindow({show: false, frame: false, 
      //icon: path.join(__dirname, 'build/icon.icns'),
      width:600, height:400
    })
    if(!!rscriptLoadError){ // simple check for loading pointR via Rscript
      dialog.showMessageBox(
        { 
          message: "Rscript load error :-(\nHave you installed R and pointR?", 
          buttons: ["OK"], 
        }, 
        (res, checked) => {cleanUpApplication()}
      )
      return null
    }
    console.log(new Date().toISOString()+'::showing loading');
    loading.loadURL(`file://${__dirname}/src/splash.html`);
    loading.once('show', () => {
      console.log(new Date().toISOString()+'::show loading')
      
      mainWindow = new BrowserWindow({
        //icon: path.join(__dirname, 'build/icon.icns'),
	      webPreferences: {
		    nodeIntegration: false,
		    preload: __dirname  + "/src/preloadPtr.js"   //"preload.js"
		},
	      show:false, 
	      width: 1200, 
	      height: 600, 
	      title:"pointeR   --version:"  +version
	}) 
	mainWindow.webContents.once('dom-ready', () => {
        console.log(new Date().toISOString()+'::mainWindow loaded')
        setTimeout( () => {
          mainWindow.show()	
          if(process.platform=MACOS){
            mainWindow.reload()
	    //childWindow.reload()
          }
          loading.hide()
          loading.close()
        }, 3000)

      })
      // console.log(port)
      // long loading html
      //childWindow.loadURL('http://127.0.0.1:'+port2)
      mainWindow.loadURL('http://127.0.0.1:' + port)
      //mainWindow.setMenu(null)
      mainWindow.setMenuBarVisibility(false)
      //mainWindow.setAutoHideMenuBar(true)
      mainWindow.webContents.on('did-finish-load', function() {
        console.log(new Date().toISOString()+'::did-finish-load')
	});
      mainWindow.webContents.on('did-start-load', function() {
        console.log(new Date().toISOString()+'::did-start-load')
      });
      mainWindow.webContents.on('did-stop-load', function() {
        console.log(new Date().toISOString()+'::did-stop-load')
      });
      mainWindow.webContents.on('dom-ready', function() {
        console.log(new Date().toISOString()+'::dom-ready')
      });
      
      // Open the DevTools.
        //mainWindow.webContents.openDevTools()
      
      mainWindow.on('close',  function(event){
	      console.log("mainWindow::close event")
	       console.log("confirmExit="+JSON.stringify(confirmExit))
	      if( !confirmExit ){
		      event.preventDefault();
		       console.log("mainWindow:: after e.preventDefault()")
		      mainWindow.webContents.send( 'appCloseCmd', 'now') 
	      }
	});
      
      // Emitted when the window is closed.
      mainWindow.on('closed', function () {
        console.log(new Date().toISOString()+'::mainWindow.closed()')
        cleanUpApplication()
      })
    })
    loading.show()
}

// appRunner
let appRunnerProcess =null
let appRunnerWindow=null
function createAppRunnerProcess( appPath2, argTabId){
	console.log('inside createAppRunnerProcess')
	let  childProcess2 = child.spawn(execPath, ["-e", "shiny::runApp('"+appPath2+"', port="+port2+")"])
	childProcess2.stdout.on('data', (data) => {
	  mainWindow.webContents.send( 'appRunnerLog', `${data}`, argTabId) 
	})
	childProcess2.stderr.on('data', (data) => {
	  mainWindow.webContents.send( 'appRunnerLog', `${data}`, argTabId) 
	})
	return childProcess2
}

function createAppWindow(port2 ){ // may need to redo this with a delay screen simililary to mainwindow.
	console.log('inside createAppWindow')
	let runnerWindow = new BrowserWindow({webPreferences:{nodeIntegration:false}, show:false, width: 1200, height: 600, title:"appRunner"}) 
	runnerWindow.webContents.openDevTools()
	runnerWindow.loadURL('http://127.0.0.1:'+port2)
	return runnerWindow
}

const { ipcMain } = require('electron')

ipcMain.on('cmdAppRun', (event, argPath, argTabId) => {
  console.log('inside electron main ' + argPath + " " + argTabId) // prints "ping"
  //event.sender.send('asynchronous-reply', 'pong')
  // create appRunner if not running 
  if(!appRunnerProcess){
	appRunnerProcess=createAppRunnerProcess(argPath, argTabId) 
  }
  if(!appRunnerWindow  ){
	appRunnerWindow=createAppWindow(port2 )
	 appRunnerWindow.webContents.once('dom-ready', () => {
        console.log(new Date().toISOString()+'::appRunnerWindow loaded')
        setTimeout( () => {
          appRunnerWindow.show()
          if(process.platform=MACOS){
            appRunnerWindow.reload()
          }
	}, 2000)

      }) 
	appRunnerWindow.setMenuBarVisibility(false)  
	appRunnerWindow.webContents.on('dom-ready', () => {
	    mainWindow.webContents.send('appRunner', 'loaded', argTabId);
	});      
  }
  
  
  
 appRunnerWindow.on('closed', function () {
        console.log(new Date().toISOString()+'::appRunnerWindow.closed()')
	 mainWindow.webContents.send('appRunner', 'unloaded', '');
	 appRunnerProcess.kill();
	 appRunnerProcess=null
	 appRunnerWindow=null
	})
})

ipcMain.on('confirmExitMssg', (event, arg)=>{
	console.log(new Date().toISOString()+':: ipcMain.on confirmExit')
	confirmExit=true;  
	console.log(new Date().toISOString()+':: confirmExit='+confirmExit )
	event.returnValue='hello';
})



function cleanUpApplication(){
   console.log(new Date().toISOString()+'::cleanUpApplication')
  
  app.quit()
  
  if(pointRProcess){
    pointRProcess.kill();
    if(killStr != "")
      child.execSync(killStr)      
  }
   if(appRunnerProcess){
    appRunnerProcess.kill();
  }
  
}

app.on('ready', createWindow)

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


      