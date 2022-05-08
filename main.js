// inspired greatly by both
// https://github.com/ksasso/useR_electron_meet_shiny
// https://github.com/dirkschumacher/r-shiny-electron

//require('electron-reload')(__dirname) //convenient for devel
// const chokidar = require("chokidar"); //USE FOR EXTERNAL FILE UPDATE 
const { app, BrowserWindow,  dialog, shell, globalShortcut } = require('electron')
const Store=require('./src/store.js')
const path = require('path')
const fs         = require('fs');
const portHelper = require('./src/portHelper')
const appRunner = require('./src/appRunner')
const pointRRunner = require('./src/pointRRunner')
const pandoc = require('./src/pandoc')
const pkgR = require('./src/pkgHelpR')
const child = require('child_process')
const log = require('electron-log');
//const userGuide=require('./src/userGuide')
const MACOS = "darwin"
const WINDOWS = "win32"
const LINUX = "linux"
const fileWatcher=require('./src/fileWatcher')
var confirmExit = false
//const killStr = "taskkill /im Rscript.exe /f"
const killStr = ""
const util = require('util');
const pev=process.env;
var R_LIBS_USER=pev.R_LIBS_USER
const testenv=pev.NO_EXIST
var RSTUDIO_PANDOC=null;
// log.info( "argv="+JSON.stringify(process.argv));
var initialPointRProject=null;
if(process.os==WINDOWS){
  if (process.argv[1]&&process.argv[1].indexOf('-')==0) process.argv.unshift('')
  initialPointRProject=process.argv[1];
} else {

}

// console.log('initialPointRProject='+JSON.stringify(initialPointRProject));

//const { clipboard } = require('electron')
//clipboard.writeText('Example String')
//clipboard.writeText('Another Example String', 'clipboard');
//clipboard.write({ text: 'test', html: '<b>test</b>' })
//console.log(clipboard.readText('selection'))

var wPath="/Users/sup/AA/mysillychart"
wPath=""
//fileWatcher.startWatcher(wPath)
var chokidar = require("chokidar");

var watchSize=0;
var watchMtime={};
var watcher = null;
watcher=chokidar.watch("./*", {
    ignored: /[\/\\]\./,
    persistent: true,
    ignoreInitial: true,
    alwaysStat: true
});
require('@electron/remote/main').initialize()

resetWatcher = async ( listToWatch)=>{
  // console.log('inside resetWatcher')
  // console.log(JSON.stringify( listToWatch))
       var watchedPaths = watcher.getWatched();
       if(watchedPaths.length>0){
        await watcher.unwatch(watchedPaths); //removes watched files
       }
      //  console.log('unwatched')
       watcher.add(listToWatch); // adds new fileList 
       var watch_Mtime={};
      //  console.log('typeof(listToWatch)='+typeof(listToWatch))
       if(typeof(listToWatch)=='string'){
        listToWatch=[listToWatch]
       }
      //  console.log('listToWatch.length='+listToWatch.length)
      //  console.log('typeof(listToWatch)='+typeof(listToWatch))
      //  console.log('listToWatch='+JSON.stringify(listToWatch))
       if(typeof(listToWatch)==='object' && listToWatch.length>0){
          listToWatch.forEach(function(path){
            console.log('path='+JSON.stringify(path))
            stats=fs.statSync(path)
            watch_Mtime[path]=stats.mtimeMs;
          }
       )}
      //  console.log('---watch_Mtime='+JSON.stringify(watch_Mtime))
       watchMtime=watch_Mtime;
       return watch_Mtime;
  }





watcher.on('change', function(path, stats) {
  // send message to ptR that  path has changed
  console.log('pre file change:'+JSON.stringify(path))
  
  
  //console.log(JSON.stringify(watchMtime))
  if(typeof watchMtime[path] == 'undefined'){
    watchMtime[path]=stats.mtime;
  }
  // console.log("stats.mtime"+JSON.stringify(stats.mtime))
  // console.log("watchMtime[path]"+JSON.stringify(watchMtime[path]))
  if(watchMtime[path]<stats.mtime){
    watchMtime[path]=stats.mtime
    watchSize = stats.size;
    // console.log('Sending to pointR: File', path, 'has been changed');
    pointRWindow.webContents.send('fileChanged',path)
  }
  
})
.on('unlink', function(path) {
  // send mmessage to ptR that path has been removed
  pointRWindow.webContents.send('fileDeleted',path)
  //  console.log('File', path, 'has been removed');
})
.on('unlinkDir', function(path) {
  // send mmessage to ptR that path has been removed
  // pointRWindow.webContents.send('pathDeleted',path)
   console.log('Directory', path, 'has been removed');
})
.on('error', function(error) {
   console.log('Error happened', error);
})

//var content = "Text that will be now on the clipboard as text";
//clipboard.writeText('hello');

//const util = require('util');
//const promise_exec = util.promisify(child.exec);
//const promise_exec = util.promisify(require('child_process').exec);

//Used to store rScript path and window dimensions
const ExecPath=require("./src/execPath")

console.log('-------------covid-29-----------------')
const store = new Store({ 
  configName: 'user-preferences',
  os: process.platform
})

let initOpenFileQueue = [];
pointRRunner.initOpenFileQueue=initOpenFileQueue;

ExecPath.store=store
pandoc.store=store
//console.log('\nstore=\n'+JSON.stringify(store))
const getRscriptPath =  require("./src/execPath").getRscriptPath //debugging only

var path2lib = path.join(path.dirname(app.getAppPath()), 'library').replace(/\\/gi, '/')
console.log('path2lib='+path2lib)



process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
var loadingWindow=null

//______________    >> pointR Window >> _______________________________________

var pointRProcess = pointRRunner.process
var pointRWindow=null
var userGuideWindow=null

const nDirName = path.normalize(__dirname)

//eventually may want to move this into pointRRunner
function createPointRWindow(){
  let {width, height} = store.get('windowBounds')
  
  pointRWindow = new BrowserWindow({
    icon: path.join(nDirName, 'build/icons/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      //zoomFactor: 1.Y0,
      preload: path.join(nDirName , "src/preloadPtr.js" )  //"preload.js"
      //preload: `${__dirname}/src/preloadPtr.js`
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
      if (process.platform === MACOS) {
        pointRWindow.reload()
      }
      loadingWindow.hide()
      loadingWindow.close()
    }, 500) 
  }) //webcContents 
  console.log('pointRWindow port='+ pointRRunner.port)
  pointRWindow.loadURL('http://127.0.0.1:' + pointRRunner.port)
  pointRWindow.setMenu(null)
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
      console.log('after pointRWindow.webContents.send appCloseCmd')
    }
  });
  pointRWindow.on('resize', ()=>{
    let {width, height}=pointRWindow.getBounds();
    store.set('windowBounds', {width, height})
  })
  // Emitted when the window is closed.
  pointRWindow.on('closed', function () {
    // console.log(new Date().toISOString() + '::pointRWindow.closed()')
    cleanUpApplication()
  })
} //end createPointRWindow

//______________    << pointR Window << _______________________________________

//______________ >> ipcMain >> _______________________________________

// note to self ----- probably want to keep all ipcMain in main.js 
const { ipcMain } = require('electron');
const { stringify } = require('querystring');


ipcMain.on('resetWatcher', (event, arg1) => {
  console.log('inside electron main resetWatcher: ' + JSON.stringify(arg1 ))
    try{
      tmp=resetWatcher(arg1).then({ })
      
      console.log('after resetWatcher')
      //console.log('tmp='+JSON.stringify(tmp));
      //watchMtime=tmp
      console.log(JSON.stringify(watchMtime));
    } catch(err){
      asyncStartUpErr('Aborting', 'Failed to start watcher')
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

ipcMain.on('cmdAppRun', (event, argPath, argTabId) => {
  console.log('inside electron main: cmdAppRun ')
   console.log('inside electron main ' + argPath + " " + argTabId)
    try{
      // arg1 is the list of paths to watch
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
    // console.log(new Date().toISOString() + ':: ipcMain.on cmdSetTitle')
    pointRWindow.setTitle(arg1 + " " + arg2)
  }
)

ipcMain.on('cmdOpenLink',
  (event, arg1, arg2) => {
    // console.log(new Date().toISOString() + ':: ipcMain.on cmdOpenLink')
    shell.openExternal(arg1 + arg2)
  }
)

ipcMain.on('cmdOpenWindow',
  (event, arg1, arg2) => {
    console.log(new Date().toISOString() + ':: ipcMain.on cmdOpenWindow')
    // userGuide.launch(arg1);
    newUserGuideWindow(arg1);
  }
)

ipcMain.on('cmdStopAppRunner',
  (event, arg1, arg2) => {
    // console.log(new Date().toISOString() + ':: ipcMain.on cmdStopAppRunner')
    // console.log(arg1 + 'arg2')
    if (!!appRunner.window) {
      // console.log('!!cmdStopAppRunner==true')
      appRunner.window.close()
      appRunner.window=null //?
    } else{
      // console.log('!!cmdStopAppRunner==false')
    }
  }
)

ipcMain.on('splashQuit', (event, arg1, arg2) => {
  // console.log(new Date().toISOString() + ':: ipcMain.on splashQuit')
  // console.log(arg1 + 'arg2')
  if(!!pkgR.kinder){
    pkgR.kinder.kill()
    pkgR.kinder=null
  }
  loadingWindow.hide()
  loadingWindow.close()
  cleanUpApplication()
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

//--->pkgLoader-----------
const pkgLoader = async(loadingWindow) => {
  console.log('\n Inside  pkgLoader \n')

  console.log('\nprior to pkgR.missing\n')
  // check for required packages
  const missing = await pkgR.getMissing(loadingWindow) //returns array of missing
  

}

//--->tryBoot Proc---------
const tryBooting = async() =>{
  console.log('-->> tryBooting')
  // check for R installation 
  const rversion  = await pkgR.rVersion()
  // const tmp=await fileWatcher.resetWatch(watcher, ["/Users/sup/AA/mysillychart"]);
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
  const pdocOnpath = await pandoc.onPath(process.platform);
  console.log("pDocOnpath="+JSON.stringify(pdocOnpath))
  
  if(!!pdocOnpath){
    pandocPath = await  pandoc.getPandocPath(); 
    console.log(JSON.stringify(pandocPath))
    RSTUDIO_PANDOC=pandocPath;
  } else {
    RSTUDIO_PANDOC=null;
  }

  console.log("\n\n ***** In main RSTUDIO_PANDOC=" + JSON.stringify(RSTUDIO_PANDOC) )
  

  
  
  pkgR.getInitialLibPaths().then( function(stdout){
    var libPaths=stdout.toString()
    console.log("libPaths="+libPaths)
    if(!!R_LIBS_USER){
      R_LIBS_USER=libPaths+";"+R_LIBS_USER
    } else {
      R_LIBS_USER=libPaths
    }
    //await pkgLoader(loadingWindow)
    pkgR.installMissing(loadingWindow,  tryStartPointRWebserver )
  })
  
}

// start pointR webserver
// ------->> tryStartPointRWebserver-------------
const tryStartPointRWebserver = async (loadingWindow) =>{
  console.log('-->> tryStartPointRWebserver')

  // use R cmd 'pandoc_available(version=NULL, error)
  // if RStudio is installed can use Sys.getenv("RSTUDIO_PANDOC") to find
  // ow. download and install from https://pandoc.org/installing.html

  console.log('prior to pointRRunner.startPointRProcess')
  console.log('----path2lib='+JSON.stringify(path2lib))
  console.log('----R_LIBS_USER'+JSON.stringify(R_LIBS_USER))
  console.log('----RSTUDIO_PANDOC'+JSON.stringify(RSTUDIO_PANDOC))
  pointRRunner.startPointRProcess(path2lib, R_LIBS_USER, RSTUDIO_PANDOC, initialPointRProject);
  console.log(' pointRRunner.port='+  JSON.stringify(pointRRunner.port));
  let alive=false;
  console.log('about to loop')
  
  for( let i=0;  i<10; i++){
    //await waitFor(500);
    console.log('inside loop')
    console.log('i='+i);
    alive= await portHelper.isAlive( pointRRunner.port)
     if(!alive){ } //message with i
    if(alive){ break}
  }
   console.log('end of loop')
   console.log('finally alive='+alive)
  if(!alive){
    throw('dead')
  } 
  await portHelper.isAlive(pointRRunner.port )
  console.log('about to createPointRWindow')
  createPointRWindow( )
  return('success')
} 
// -------<< tryStartPointRWebserver-------------

if(process.platform === MACOS){
  app.on('will-finish-launching', () => { // for mac, this occurs prior to ready
    console.log('will-finish-launching')
    app.on("open-file", (event, file) => {
      if (app.isReady() === false) {
        //initOpenFileQueue.push(file);
        initialPointRProject=file
      } 
    })
  })
}


// ------>> app.on('ready')-------------------
// this is where we invoke the startup
app.on('ready', async () => {
  console.log('ready')
  // launch loading browser 
  //await resetWatch( [ "/Users/sup/AA/mysillychart" ] )
  loadingWindow = new BrowserWindow({
    show: false, frame: false,
    //icon: path.join(__dirname, 'build/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      preload: path.join(nDirName , "src/preloadLoader.js")   //"preload.js"
    },
    width: 750, height: 400, title: 'svgR User Guide'
  })
  //console.log(new Date().toISOString() + '::showing loading');
  loadingWindow.loadURL(`file://${nDirName}/src/splash.html`);
  //loadingWindow.webContents.openDevTools()  //for debugging only
  loadingWindow.once('show', async () => {
    var abortStartUp=null;
    //console.log('waiting for tryStartPointRWebserve')
    try{
      console.log('--->>loading once try')
      
      execPath= await getRscriptPath()
      if(execPath.indexOf(' ')>0){
        execPath=`\"${execPath}\"`
      }
      
      loadingWindow.webContents.send('updateSplashTextBox', {msg: 'Rscript located'});
      await async function(){
        console.log("00 execPath="+ execPath)
        pkgR.execPath=execPath
        appRunner.execPath=execPath
        pointRRunner.execPath=execPath
        console.log('01 pkgR.execPath='+ pkgR.execPath)
      }()

      await tryBooting()
      //console.log('calling createPointRWindow')
      // wait for webServer() here
      // await portHelper.isAlive(pointRRunner.port )
      // createPointRWindow( )
    
    } 
    catch( err){
      abortStartUp=err
      console.log(`err is: ${err}`)
      setTimeout(() => {
        console.log('and here')
        loadingWindow.hide()
        loadingWindow.close()
        cleanUpApplication()
      },3000) //die after 5 seconds
      console.log('abortStartup')
      console.log('found err is:'+abortStartUp)
      if(abortStartUp==='R-not-found'){
        console.log('found err is:'+abortStartUp)
         let result="R was not found!<br>ABORTING..."
         loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
      } else if (abortStartUp==='cancel-install-error'){
        let result="Package installation canceled<br>ABORTING..."
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
      } else if (abortStartUp==='dead'){
        let result="Cannot estabish pointR-server connection<br>ABORTING..."
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
        console.log('loading window once '+ abortStartUp)
      } else if(abortStartUp.name == 'BAD-R-VERSION'){
        let result = 'R version is '+ abortStartUp.message + '. Please upgrade R to 3.5.3 or greater' 
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
      } else if(abortStartUp.name == 'MISSING-PANDOC'){
        let result = 'Unable to locate Pandoc \n Please install and place on your PATH.\n'+
        'Pandoc is available at "https://pandoc.org/installing.html" '
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
      } else {
        let result=abortStartUp.toString()
        loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
      }
    }
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

function newUserGuideWindow(arg1) {
  if (!userGuideWindow ) {
    let helpTitle=''
    let helpFile=''
    if(arg1 == 'svgRUserGuide'){
      helpTitle="svgR User Guide"
      helpFile='UserGuide.html'
    } else if ( arg1=="preprocPtHelp" ){
      helpTitle="Point Preprocessing Help"
      helpFile='preprocPtHelp.html'
    } else if (arg1== "preprocAttrHelp"){
      helpTitle="Attribute Preprocessing Help"
      helpFile='preprocAttrHelp.html'
    }
    userGuideWindow = new BrowserWindow({
      width: 1000, height: 600, show: false,
      title: helpTitle,
 
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,

        contextIsolation: false,
        defaultFontFamily: 'Times New Roman',
        preload: path.join(nDirName, "src/preloadUserGuide.js")
      }
    });
    // console.log('loading UserGuide...')
    
    userGuideWindow.loadURL(path.join('file:///', nDirName, 'assets', helpFile));

    userGuideWindow.setMenuBarVisibility(false);
    // userGuideWindow.webContents.openDevTools()
    require("@electron/remote/main").enable(userGuideWindow.webContents)
    userGuideWindow.once('ready-to-show', () => { userGuideWindow.show(); });
    userGuideWindow.on('focus', () => {
      globalShortcut.register('CommandOrControl+F', function () {
        if (userGuideWindow && userGuideWindow.webContents) {
          console.log('CommandOrControl+F sending on-find')
          let r=Math.random()
          userGuideWindow.webContents.send('on-find', r);
        }
      });
    });
    userGuideWindow.on('blur', () => {
      globalShortcut.unregister('CommandOrControl+F');
    });
    userGuideWindow.on('closed', () => { userGuideWindow = null; });
  }
}

// ------<< app.on('activate')-------------------

//______________    << startup <<_______________________________________


//______________    >> cleanUp >>_______________________________________

function cleanUpApplication() {
  console.log(new Date().toISOString() + '::cleanUpApplication')
  watcher.close() //this is required to prevent SIGABRT error code 1
  app.quit()
  if (!!appRunner.process) {
    appRunner.process.kill();
    appRunner.process=null
  }
  if (!!pointRProcess) {
    if (killStr != "")
      child.execSync(killStr)
    pointRProcess.kill();
    pointRProcess=null;
  }
  
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  console.log('EVENT::window-all-closed')
  globalShortcut.unregister('CommandOrControl+F')
  /*	if( !confirmExit ){
            
            //event.preventDefault();
             console.log("pointRWindow:: after e.preventDefault()")
            //confirmed=true;
            pointRWindow.webContents.send( 'appCloseCmd', 'now') 
    }
    */
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  cleanUpApplication()
})
//------------------<< cleanUp------------------------------------






