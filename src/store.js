// credit https://medium.com/cameron-nokes/how-to-store-user-data-in-electron-3ba6bf66bc1e

const electron = require('electron');
const path = require('path');
const fs = require('fs');
const child = require('child_process');
const MACOS = "darwin"
const WINDOWS = "win32"
const LINUX = "linux"

var getDefaultPath_Rscript = (os) => {
  if(os===MACOS){ 
    // let ecmd= 'find /Users/sup/test -name dog.txt'
    // let stdout = child.execSync(ecmd)
    // stdout=stdout.toString().split(/(?:\r\n|\r|\n)/g);
    // if(stdout.length>0){
    //   stdout=stdout[0]
    // }
    // console.log('stdout='+JSON.stringify(stdout))
    // if (!(stdout instanceof Buffer)) {
    //   console.log('stdout not instance of not a instanceof Buffer');
    // }
    // console.log('stdout.length='+JSON.stringify(stdout.length))
    return '/usr/local/bin/Rscript' 
  }
  else if (os===LINUX){return '/usr/bin/Rscript' }
  else if (os===WINDOWS){
    let ecmd= 'cd "C:\\Program Files\\R" && dir/s/B Rscript.exe'
    let stdout = child.execSync(ecmd)
    stdout=stdout.toString().split(/(?:\r\n|\r|\n)/g); 
    if(stdout.length>0){
      stdout=stdout[0]
    }
    console.log('stdout='+JSON.stringify(stdout))
    return stdout
  }
  else {return ""}
}

var getDefaultPath_PANDOC = (os)=>{
  if(os===MACOS){ return "/Applications/RStudio.app/Contents/MacOS/pandoc" }
  else if (os===LINUX){return "/usr/lib/rstudio/bin/pandoc" }
  else return "/Program Files/RStudio/bin/pandoc"
}

var getStoreDefaults = (os) => {
  return {
    // 800x600 is the default size of our window
    windowBounds: { width: 1200, height: 600 },
    rscriptPath: getDefaultPath_Rscript(process.platform),
    pandocPath:  getDefaultPath_PANDOC( process.platform)
  }
}


class Store {
  constructor(opts) {
    // Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
    // app.getPath('userData') will return a string of the user's app data directory path.
    const userDataPath = (electron.app ).getPath('userData');
    // We'll use the `configName` property to set the file name and path.join to bring it all together as a string
    this.path = path.join(userDataPath, opts.configName + '.json');
    var storeDefaults = getStoreDefaults(opts.os)
    this.data = parseDataFile(this.path, storeDefaults );
    //this.data = opts.defaults;
  }
  
  // This will just return the property on the `data` object
  get(key) {
    return this.data[key];
  }
  
  // ...and this will set it
  set(key, val) {
    this.data[key] = val;
    // Wait, I thought using the node.js' synchronous APIs was bad form?
    // We're not writing a server so there's not nearly the same IO demand on the process
    // Also if we used an async API and our app was quit before the asynchronous write had a chance to complete,
    // we might lose that data. Note that in a real app, we would try/catch this.
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data));
    } catch (error){
      // notify user about error
    }
    
  }
}

function parseDataFile(filePath, defaults) {
  // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
  // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
  try {
    // throw('err')
    var rtv = JSON.parse(fs.readFileSync(filePath));
    if (typeof rtv['windowBounds'] === "undefined"){
      rtv['windowBounds']=defaults['windowBounds']
    }
    if (typeof rtv['rscriptPath'] === "undefined"){
      rtv['rscriptPath']=defaults['rscriptPath']
    }if (typeof rtv['pandocPath'] === "undefined"){
      rtv['pandocPath']=defaults['pandocPath']
    }
    return defaults;
  } catch(error) {
    // if there was some kind of error, return the passed in defaults instead.
    return defaults;
  }
}

// expose the class
module.exports = Store;
