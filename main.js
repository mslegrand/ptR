// inspired greatly by both
// https://github.com/ksasso/useR_electron_meet_shiny
// https://github.com/dirkschumacher/r-shiny-electron

//require('electron-reload')(__dirname) //convenient
//const chokidar = require("chokidar");
const { app, BrowserWindow,  dialog, shell } = require('electron')
const Store=require('./src/store.js')
const path = require('path')
const fs         = require('fs');
const portHelper = require('./src/portHelper')
const appRunner = require('./src/appRunner')
const pointRRunner = require('./src/pointRRunner')
const pandoc = require('./src/pandoc')
const pkgR = require('./src/pkgHelpR')
const child = require('child_process')
const MACOS = "darwin"
const WINDOWS = "win32"
const LINUX = "linux"
var confirmExit = false
//const killStr = "taskkill /im Rscript.exe /f"
const killStr = ""
const util = require('util');
const pev=process.env;
const R_LIBS_USER=pev.R_LIBS_USER
const testenv=pev.NO_EXIST

//const { clipboard } = require('electron')
//clipboard.writeText('Example String')
//clipboard.writeText('Another Example String', 'clipboard');
//clipboard.write({ text: 'test', html: '<b>test</b>' })
//console.log(clipboard.readText('selection'))


//var content = "Text that will be now on the clipboard as text";
//clipboard.writeText('hello');

//const util = require('util');
//const promise_exec = util.promisify(child.exec);
//const promise_exec = util.promisify(require('child_process').exec);

// Initialization of path to RScript
// Used to guess path to RScript 
// function defaultRscriptPath(){
//   if (process.platform===LINUX){
//       return('/usr/bin/Rscipt')
//   } else if(process.platform==MACOS){
//       return('/usr/local/bin/Rscript')
//   } else {
//      return('C:\\program Files\\R\\Rscript.exe') //or something????
//   }
// }

// const RscriptDefaults= {
//   "darwin": '/usr/local/bin/Rscript',
//   "linux": "'/usr/bin/Rscript'",
//   WINDOWS: 'C:\\program Files\\R\\Rscript.exe'
// }
// console.log('RscriptDefaults='+ JSON.stringify(RscriptDefaults))
// const pandocDefaults= {
//   MACOS: "/Applications/RStudio.app/Contents/MacOS/pandoc",
//   LINUX: "/usr/lib/rstudio/bin/pandoc",
//   WINDOWS: "/c/Program Files/RStudio/bin/pandoc"
// }

var getDefaultPath_Rscript = (os) => {
  if(os===MACOS){ return '/usr/local/bin/Rscript' }
  else if (os===LINUX){return '/usr/bin/Rscript' }
  else return 'C:\\program Files\\R\\Rscript.exe'
}

var getDefaultPath_PANDOC = (os)=>{
  if(os===MACOS){ return "/Applications/RStudio.app/Contents/MacOS/pandoc" }
  else if (os===LINUX){return "/usr/lib/rstudio/bin/pandoc" }
  else return "/c/Program Files/RStudio/bin/pandoc"
}


//Used to store rScript path and window dimensions
const ExecPath=require("./src/execPath")
const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    // 800x600 is the default size of our window
    windowBounds: { width: 800, height: 600 },
    rscriptPath: getDefaultPath_Rscript(process.platform),
    pandocPath:  getDefaultPath_PANDOC( process.platform)
  }
});

ExecPath.store=store
pandoc.store=store
console.log('\nstore=\n'+JSON.stringify(store))
const getRscriptPath =  require("./src/execPath").getRscriptPath //debugging only



process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
var loadingWindow=null

//______________    >> pointR Window >> _______________________________________

var pointRProcess = pointRRunner.process
var pointRWindow=null
var userGuideWindow=null

//eventually may want to move this into pointRRunner
function createPointRWindow(){
  let {width, height} = store.get('windowBounds')
  pointRWindow = new BrowserWindow({
    icon: path.join(__dirname, 'build/icons/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      //zoomFactor: 1.Y0,
      preload: __dirname + "/src/preloadPtr.js"   //"preload.js"
    },
    show: false,
    width: width,
    height: height,
    title: "ptR"
  }) // browserWindow 
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
  }) //webcContents 
  console.log('pointRWindow port='+ pointRRunner.port)
  pointRWindow.loadURL('http://127.0.0.1:' + pointRRunner.port)
  //pointRWindow.setMenu(null)
  pointRWindow.setMenuBarVisibility(false)
  //pointRWindow.webContents.setZoomFactor(0.5)
  //pointRWindow.webContents.openDevTools() // Open the DevTools for debugging
  pointRWindow.on('close', function (event) {
    console.log("pointRWindow::close event")
    console.log("confirmExit=" + JSON.stringify(confirmExit))
    if (!confirmExit) {
      event.preventDefault();
      console.log("pointRWindow:: after e.preventDefault()")
      pointRWindow.webContents.send('appCloseCmd', 'now')
    }
  });
  pointRWindow.on('resize', ()=>{
    let {width, height}=pointRWindow.getBounds();
    store.set('windowBounds', {width, height})
  })
  // Emitted when the window is closed.
  pointRWindow.on('closed', function () {
    console.log(new Date().toISOString() + '::pointRWindow.closed()')
    cleanUpApplication()
  })
} //end createPointRWindow

//______________    << pointR Window << _______________________________________

//______________ >> ipcMain >> _______________________________________

// note to self ----- probably want to keep all ipcMain in main.js 
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

ipcMain.on('cmdOpenWindow',
  (event, arg1, arg2) => {
    console.log(new Date().toISOString() + ':: ipcMain.on cmdOpenWindow')
    if(!userGuideWindow && arg1=='svgRUserGuide'){
      userGuideWindow = new BrowserWindow({
        width:1000, height:600, show: false,
        title: "svgR User Guide",
        webPreferences: {
          nodeIntegration: false,
          preload: __dirname + "/src/preloadUserGuide.js"
        }
      })
      userGuideWindow.loadURL(path.join('file:///',__dirname, 'assets', 'UserGuide.html'  ))
      //userGuideWindow.loadFile(path.join(__dirname, 'assets', 'UserGuide.html'  ))
      userGuideWindow.setMenuBarVisibility(false)
      //userGuideWindow.webContents.openDevTools()
      userGuideWindow.once( 'ready-to-show', ()=> {userGuideWindow.show()})
      userGuideWindow.on('closed', ()=>{userGuideWindow=null})      
    }
  }
)

ipcMain.on('cmdStopAppRunner',
  (event, arg1, arg2) => {
    console.log(new Date().toISOString() + ':: ipcMain.on cmdStopAppRunner')
    console.log(arg1 + 'arg2')
    if (!!appRunner.window) {
      console.log('!!cmdStopAppRunner==true')
      appRunner.window.close()
      appRunner.window=null //?
    } else{
      console.log('!!cmdStopAppRunner==false')
    }
  }
)
//______________    << ipcMain <<_______________________________________

//______________    << startup <<_______________________________________

// function definitions for startup

// error Box to report errors
const errorBox2= util.promisify(dialog.showErrorBox)
const asyncStartUpErr = async (title, mssg)=>{
  const rtv =await errorBox2( title, mssg)         
}

// start pointR webserver
// ------->> tryStartPointRWebserver-------------
const tryStartPointRWebserver = async () =>{
  console.log('-->> tryStartPointRWebserver')

  // check for R installation 
  const rversion  = await pkgR.rVersion()
  console.log('rversion='+rversion)
  if(rversion=='quit'){
    console.log('throwing quit')
    throw 'R-not-found'
  }
  if(rversion!='ok'){
    console.log('throwing rversion')
    let versionError = Error(rversion)
    versionError.name='BAD-R-VERSION'
    throw versionError
  }
  pandocPath = await  pandoc.getPandocPath(); 
  console.log(JSON.stringify(pandocPath))
  var RSTUDIO_PANDOC=pandocPath;
  // check for required packages
  const missing = await pkgR.missing() //returns array of missing
  console.log('missing.length=', missing.length)
  if (missing.length > 0) { // if some packages are missing , need to install them. 
    var installNow = await pkgR.ask2Install() // query befor installing?
    if (installNow) { // do the installations
      //console.log('installNow')
      await pkgR.installMissing(loadingWindow)// run install Rscript
    } else {
      throw 'cancel-install-error'
    }
  }

  
  // const pandocAvail  = await pkgR.pandocAvailable();
  // console.log('pandocAvail='+pandocAvail); 
  // if(pandocAvail!='ok'){
  //  let pandocError = Error(pandocAvail);
  //  pandocError.name='MISSING-PANDOC';
  //  throw pandocError
  // }

  // use R cmd 'pandoc_available(version=NULL, error)
  // if RStudio is installed can use Sys.getenv("RSTUDIO_PANDOC") to find
  // ow. download and install from https://pandoc.org/installing.html

  // finally spawn pointRProcess
  //var path2lib = path.join(__dirname,  'assets', 'library')
  var path2lib = path.join(path.dirname(app.getAppPath()), 'library')
  console.log('path2lib='+path2lib)

  pointRRunner.startPointRProcess(path2lib, R_LIBS_USER, RSTUDIO_PANDOC)
  //console.log(' pointRRunner.port='+  JSON.stringify(pointRRunner.port));
  let alive=false;
  console.log('about to loop')
  

  for( let i=0;  i<10; i++){
    //await waitFor(500);
    //console.log('inside loop')
    //console.log('i='+i);
    alive= await portHelper.isAlive( pointRRunner.port)
    // if(!alive){ } //message with i
    if(alive){ break}
  }
  console.log('end of loop')
  console.log('finally alive='+alive)
  if(!alive){
    throw('dead')
  } 
  
  return('success')
} 
// -------<< tryStartPointRWebserver-------------


// ------>> app.on('ready')-------------------
// this is where we invoke the startup
app.on('ready', async () => {
  // launch loading browser 
  loadingWindow = new BrowserWindow({
    show: false, frame: false,
    //icon: path.join(__dirname, 'build/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      preload: __dirname + "/src/preloadLoader.js"   //"preload.js"
    },
    width: 750, height: 400, title: 'svgR User Guide'
  })
  //console.log(new Date().toISOString() + '::showing loading');
  loadingWindow.loadURL(`file://${__dirname}/src/splash.html`);
  //loadingWindow.webContents.openDevTools()  //for debugging only
  loadingWindow.once('show', async () => {
    var abortStartUp=null;
    //console.log('waiting for tryStartPointRWebserve')
    try{
      console.log('--->>loading once try')
      
      execPath= await getRscriptPath()
      loadingWindow.webContents.send('updateSplashTextBox', {msg: 'Rscript located'});
      await async function(){
        console.log("00 execPath="+ execPath)
        pkgR.execPath=execPath
        appRunner.execPath=execPath
        pointRRunner.execPath=execPath
        console.log('01 pkgR.execPath='+ pkgR.execPath)
      }()

      await tryStartPointRWebserver()
      //console.log('calling createPointRWindow')
      // wait for webServer() here
      await portHelper.isAlive(pointRRunner.port )
      createPointRWindow( )
      
    
    } 
    catch( err){
      abortStartUp=err
      console.log(`err is: ${err}`)
      setTimeout(() => {
        console.log('and here')
        loadingWindow.hide()
        loadingWindow.close()
        cleanUpApplication()
      },1000) //die after 5 seconds
    } 
    if(!!abortStartUp){
      console.log('abortStartup')
      console.log('founds err is:'+abortStartUp)
      // let result="R was not found!<br>ABORTING..."
      // loadingWindow.webContents.send('updateSplashTextBox', {msg: "R was not found!<br>ABORTING..."});
      if(abortStartUp==='R-not-found'){
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
      } else if(abortStartUp.name == 'BAD-R-VERSION'){
        let result = 'R version is '+ abortStartUp.message + '. Please upgrade R to 3.5.3 or greater' 
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
        await asyncStartUpErr( "Aborting", result)
      } else if(abortStartUp.name == 'MISSING-PANDOC'){
        let result = 'Unable to locate Pandoc \n Please install and place on your PATH.\n'+
        'Pandoc is available at "https://pandoc.org/installing.html" '
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
        await asyncStartUpErr( "Aborting", result)
      }
    }
    // setTimeout(() => {
    //   console.log('and here')
    //   loadingWindow.hide()
    //   loadingWindow.close()
    //   cleanUpApplication()
    // },100) //die after 5 seconds
  })
  loadingWindow.show()
  loadingWindow.webContents.send('updateSplashTextBox', {msg: 'hello'});
}) 
// ------<< app.on('ready')-------------------

// ------>> app.on('activate')-------------------
app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (pointRWindow === null) {
    //pointRRunner.
    createPointRWindow()
  }
})
// ------<< app.on('activate')-------------------

//______________    << startup <<_______________________________________


//______________    >> cleanUp >>_______________________________________

function cleanUpApplication() {
  console.log(new Date().toISOString() + '::cleanUpApplication')
  app.quit()
  if (!!appRunner.process) {
    appRunner.process.kill();
    appRunner.process=null
  }
  if (!!pointRProcess) {
    pointRProcess.kill();
    pointRProcess=null;

    if (killStr != "")
      child.execSync(killStr)
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






