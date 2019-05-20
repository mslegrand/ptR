
const MACOS   = "darwin"
const WINDOWS = "win32"
const LINUX   = "linux"

const child      = require('child_process')
const portHelper = require('./portHelper')
const fs         = require('fs')  
const os         = require('os')     
//var execPath     = "Rscript"
//const {  BrowserWindow } = require('electron')
const path = require('path')

exports.execPath=null
exports.port=null
exports.process  = null
//exports.window   = null

var getPtRVersion=function (path2lib){
  var filePath=path.join(  path2lib, 'pointR', 'DESCRIPTION');
  console.log('DESCRIPTION filePath='+ filePath)
	var data = fs.readFileSync(filePath);
  var fileContents=data.toString();
  console.log('DESCRIPTION fileContents')
  console.log(JSON.stringify(fileContents))
	var rx = /\nVersion:(.*)\n/m;
  //var ptR_version=fileContents.match(rx) || ['Infinity']
  var ptR_version=rx.exec(fileContents);
  ptR_version= "'"+ptR_version[1]+"'";
  console.log("ptR_version" + JSON.stringify(ptR_version))
	return ptR_version;
}

exports.startPointRProcess =(path2lib)=>{
  if(!!exports.process){ //idiot check
    console.log('cannot startPointRProcess: already started?')
    return;
  }
  exports.port = portHelper.randomPort()
  console.log('portMain=' + exports.port)
  console.log('path2lib=' + JSON.stringify(path2lib));
  var ptR_Version = getPtRVersion (path2lib);
  console.log('pathptR_Version=' + JSON.stringify(ptR_Version));
  var erLib = path2lib; //' //path.join(app.getAppPath(), 'assets', 'library');
  var libShinyCmd     = "library(shiny);library(pointR);";
  var optionsCmd  = "shiny::shinyOptions(electron=TRUE, ptRVersion=" + ptR_Version +"," + "HOME='" + os.homedir() + "');";
  var libPathCmd="";
  var path2pointR="";
  console.log('hello')
  if( fs.existsSync(erLib) ){
    console.log('electron internal R lib exists')
    libPathCmd  = ".libPaths(c(Sys.getenv('E_LIB'), .libPaths()));"
    path2pointR=  path.join(erLib, 'pointR','App') 
    
    //path2pointR=  path.join('.', 'assets', 'library', 'pointR', 'App'); //path.join(erLib, 'pointR','App') 
  } else {
    console.log('electron internal R lib does not exist')
    libPathCmd=""
    path2pointR = "system.file('App', package = 'pointR')"
  } 
  console.log('there')
  var hbCmd =  "host = '127.0.0.1', launch.browser = FALSE," 
  //var runPtrCmd = "shiny::runApp(Sys.getenv('E_PTR_PATH'), " + hbCmd +"  port = as.integer(Sys.getenv('E_PTR_PORT')) )"
  var runPtrCmd = "shiny::runApp(system.file('App', package = 'pointR'), " + hbCmd +"  port = as.integer(Sys.getenv('E_PTR_PORT')) )"
  var processCmd  = libPathCmd + libShinyCmd + optionsCmd + runPtrCmd;

  //console.log('execPath=' + exports.execPath)

  /* //alternatively
  fs.access(erLib, (err) => {
    if (err) {
        console.log('does not exist')
      } else {
        console.log('exists')
      }
  })
  */

  



  
  //".libPaths(c('" + path2lib +"', .libPaths() ));";
  //var libPathCmd  = ".libPaths(); .libPaths('" + libPath +"');";
  
  
  //var runAppCmd   = "shiny::runApp(system.file('App', package = 'pointR'), port=" + exports.port + ")";
  //var path2pointR = path2lib + "/pointR/App/";
  //console.log( path2pointR);
  //var runAppCmd   = "shiny::runApp('" + path2pointR +"', port=" + exports.port + ")";
  //var runAppCmd   = "shiny::runApp(system.file('App', package = 'pointR'), port=" + exports.port + ")";
  
  
  //var processCmd  =  libsCmd + optionsCmd + runAppCmd;
  //console.log(libPathCmd)
  console.log('execPath=' + exports.execPath)
  console.log("\nrunPtrCmd")
  console.log(runPtrCmd)
  console.log("\nprocessCmd")
  console.log(processCmd)
  console.log("\npath2pointR")
  console.log(path2pointR)
  console.log("\nerLib")
  console.log(erLib)
  console.log("\nexports.port")
  console.log(exports.port)
  exports.process = child.spawn(exports.execPath, ["-e", processCmd], {
    env: {
      'E_PTR_PATH':  path2pointR,
      'E_PTR_PORT':  exports.port,
      'E_LIB': erLib,
      'HOME': os.homedir()
    }
  }
  );
  //exports.process = child.spawn(exports.execPath, ["-e",
  //"library(shiny);shinyOptions(electron=TRUE);shiny::runApp(system.file('App', package = 'pointR'), port=" + exports.port + ")"
  //])
  exports.process.stdout.on('data', (data) => {
    console.log(`stdout:${data}`)
  })
  exports.process.stderr.on('data', (data) => {
    console.log('ptR.stderr')
    console.log(`ouch stderr:${data}`)
  })
  exports.process.on('error', function (err) { // todo: handle error
    console.log('failure : ' + err);
    rscriptLoadError = true
  });
  return exports.process
}

