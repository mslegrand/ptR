const {  dialog } = require('electron');
const child = require('child_process');
const csChild = require('cross-spawn');
const { app} = require('electron')

const util = require('util');
const path = require('path')
const normalize = require('normalize-path');

//var path2lib = path.join(path.dirname(app.getAppPath()), 'library').replace(/\\/g, "/");
//var setLibPath= ".libPaths(c('"+ path2lib+"' ,.libPaths() ) ); "
// var reqPackages="reqPk<-'shiny shinyjs R.utils jsonlite shinyFiles shinythemes colourpicker shinyWidgets bsplus fs knitr tidyverse';" // stringr is in tidyverse (so is jsonlite, but has issues)
// var missingPackages=reqPackages+ "tt<-setdiff(unlist(strsplit(reqPk,' ')),installed.packages()[,1]);" 
// var missingScript=missingPackages+"cat(paste0(tt, collapse=' '));"

const reqPackages="reqPk<-'stringr shiny shinyjs R.utils jsonlite shinyFiles shinythemes colourpicker shinyWidgets bsplus fs rmarkdown knitr tidyverse';"
const missingPackages=reqPackages+"tt<-setdiff(unlist(strsplit(reqPk, ' ')), installed.packages()[,1]);"
//const missingPackages=reqPackages+"tt<-unlist(strsplit(reqPk, ' '));"
const missingScript=missingPackages+"cat(paste0(tt, collapse=' '));"



const installScript=missingPackages+"cat(tt);i=1; for(pkg in tt){   i<-i+1;   cat(paste(i,'> installing', pkg, '\\n'));   Sys.sleep(1);   install.packages(pkg, lib=.libPaths()[1], repos='http://cran.rstudio.com'); };  cat('endInstall') ;"


// reading from file to get scripts  for install and missing files  didn't work :(, 
//  so I am embedding file contents as above const strings, should revisit this later

exports.execPath=""

exports.rVersion = function(){
  return new Promise((resolve, reject) => {
    const  versionScript = "if(getRversion()>='3.5.0'){cat('ok')} else {cat(unlist(getRversion()),sep='.') }"
    console.log("versionScript=" + versionScript )
    const  ecmd = exports.execPath + " -e \""+ versionScript + "\""
    console.log("rVersion: ecmd="+ecmd)
    try{
      let stdout = child.execSync(ecmd)
      console.log('stdout='+JSON.stringify(stdout))
      resolve(stdout)
    } catch( error){
      console.log('returning error='+JSON.stringify(error))
      resolve('quit')
    }
  })
}
  
  exports.getInitialLibPaths= function(){
    return new Promise((resolve, reject) => {
      const  libPatScript = " cat(paste( .libPaths() , collapse=';'))"
      console.log("libPatScript=" + libPatScript )
      const  ecmd = exports.execPath + " -e \""+ libPatScript + "\""
      console.log("libPatScript: ecmd="+ecmd)
      try{
        let stdout = child.execSync(ecmd).toString()
        console.log('libPath stdout='+JSON.stringify(stdout))
        resolve(stdout)
      } catch( error){
        console.log('returning error='+JSON.stringify(error))
        resolve(null)
      }
    })
  }

exports.pandocAvailable = function(){
  return new Promise((resolve, reject) => {
    const  pandocScript = 'if(rmarkdown::pandoc_available()){cat("ok")} else {cat("pandoc not found") }'
    console.log( pandocScript)
    const  ecmd = exports.execPath + " -e '"+ pandocScript + "'"
    console.log('ecmd='+ecmd)
    const result = child.exec(ecmd, {timeout:0}, function(err, stdout, stderr){
      if(err){ resolve('quit')}
      if(stderr){ resolve('quit')}
      resolve(stdout)
    })
  })
}


exports.getMissing = async(loadingWindow)=>{
  //var result=' '
  console.log('inside getMissing')
  const ecmd=exports.execPath+' -e "' + missingScript +'"'
  //const  pandocScript = "if(rmarkdown::pandoc_available()){cat('ok')} else {cat('pandoc not found') }"
  //const ecmd=exports.execPath+ ' -e "' +pandocScript +'"'
  //const  ecmd = exports.execPath + " -e '"+ pandocScript + "'"
  console.log('ecmd=\n'+ecmd)
  const result = child.exec(ecmd, {timeout:0}, function(err, stdout, stderr){
    if(err){ 
      console.log('child.exec(ecmd err')
       return 'quit'
    }
    if(stderr){ 
      console.log('stderr')
      return 'quit'
    }
    if(stdout){
      console.log('stdout')
      var missing= stdout;
      console.log('1900 missing='+missing)
      missing= missing.split(" ").filter(item=>item)
      if(missing.length>0){
        console.log('about to ask if we should install')
        const installNow =    dialog.showMessageBox(
          loadingWindow,
          {
            type: 'question',
            message: "The following packages need to be installed :-(\n" +
            JSON.stringify(missing) + "\n Install now?",
            buttons: ["Install Now","Quit"],
            defaultId: 0
          }
        )
        //pkgR.ask2Install(missing) // query befor installing?
        console.log("installNow=" + JSON.stringify(installNow ))
        if (installNow.response===0) { // do the installations
          console.log('\nAbout to enter installMissing')
          const installedPkgDone =   installMissing(loadingWindow, tryStartPointRWebserver)// run install Rscript
          resolve('ok')
        } else {
          console.log('about to throw install error')
          throw 'cancel-install-error'
        }
        
      } else {
        console.log('no missing packages')
        return tryStartPointRWebserver()
      }
    }
    
  })
  
}


exports.kinder=null

exports.installMissing = async ( loadingWindow , tryStartPointRWebserver) => {
  //return new Promise((resolve, reject) => {
    console.log('inside installing Missing')
    //console.log("installScript is")
    //console.log(installScript)
    var result=""
    exports.kinder = csChild.spawn(exports.execPath,["-e", installScript])
    exports.kinder.stdout.on('data', function (data) { 
      console.log('stdout.on data='+JSON.stringify(data))
      if(typeof(data) !== 'undefined'){
        let txt = data.toString()
        console.log('kinder.stdout.on='+JSON.stringify(txt))
        if(!!txt){
          console.log('installMissing: txt='+txt)
          if(txt.match(/endInstall/g)){
            console.log('installMissing: returning close')
            tryStartPointRWebserver()
            return 'close'
          } else {
            result += (txt + '<br>')
            //console.log('about to send' + result)
            loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
          }
        }
      } 
      return 'close'
    })
  //})
}

