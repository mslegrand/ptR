const {  dialog } = require('electron')
const child = require('child_process');
var execPath = "Rscript"
const path = require('path')

const missingScript="packageMatrix<-installed.packages(); requirePackages<-c(   \"shiny\",   \"shinyjs\",     \"R.utils\",   \"svgR\",   \"shinyAce\",   \"stringr\",     \"jsonlite\",    \"shinyDMDMenu\",   \"shinyFiles\",   \"shinythemes\",   \"colourpicker\",   \"shinyWidgets\",   \"bsplus\",   \"fs\",   \"knitr\",    \"tidyverse\",   \"shinyjqui\",   \"pointR\");    pm<-packageMatrix[,1]; tt<-setdiff( requirePackages,pm ); if(length(tt)==0){    tt<-NULL  } else {   tt <-paste0('\"',tt,'\"', collapse=\", \") };  cat(paste0(\"[\",tt,\"]\")) "
const installScript="packageMatrix<-installed.packages(); if(!(\"devtools\" %in% packageMatrix)){   install.packages(\"devtools\") }; library(devtools);  cranPackages<-c(   \"shiny\",   \"shinyjs\",     \"R.utils\",   \"shinyAce\",   \"stringr\",     \"jsonlite\",    \"shinyFiles\",   \"shinythemes\",   \"colourpicker\",   \"shinyWidgets\",   \"bsplus\",   \"fs\",   \"knitr\",    \"tidyverse\",   \"shinyjqui\" );  gitPackages<-c(   \"svgR\",   \"shinyDMDMenu\",   \"pointR\" );  pm<-packageMatrix[,1]; tt1<-setdiff( cranPackages,pm ); i=1; for(pkg in tt1){   i<-i+1;   cat(paste(i,\"> installing\", pkg));   Sys.sleep(1);   install.packages(pkg); }; tt2<-setdiff( gitPackages,pm ); for(pkg in tt2){   i<-i+1;   cat(paste(i,\"> installing\", pkg));   Sys.sleep(1);   install_github(paste0(\"mslegrand/\",pkg)); };  cat(\"endInstall\") "


 
exports.runCmd = (cmd, arg) => {
    return new Promise((resolve, reject) => {
      var command = child.spawn(cmd, arg)
      var result = ''
      command.stdout.on('data', function (data) {
        result += data.toString()
      })
      command.on('close', function (code) {
        resolve(result)
      })
      command.on('error', function (err) { reject(err) })
    })
}
  
//const replaceString = require('replace-string');
//import fs from 'fs';
//const fs = require('fs');
//const util = require('util');
//const readFile = util.promisify(fs.readFile);

// reading from file didn't work, so I am embedding file contents as above const strings
// async  function exeRfile(fileName) {
//     console.log('fileName='+ path.join(__dirname, '..','assets', fileName))
//     var script = await readFile(path.join(__dirname, '..','assets', fileName))
//     console.log('typeOf(script)=', typeof(script))
//     script = "'" + replaceString(script, "\n", '') + "'"; //turn into one liner
//     console.log('script='+script)
//     return child.spawn(execPath, ["-e", script])
// }

exports.missing =() => {
    return new Promise((resolve, reject) => {
      var result = ''
      let command = child.spawn(execPath,["-e", missingScript])
      command.stdout.on('data', function (data) { result += data.toString() })
      command.on('close', function () {
        console.log('missing pkg='+ result +';')
        missing = eval(result)
        resolve(missing)
      })
      command.on('error', function (err) { reject(err) })
    })
}

// todo: move to pkgHelper.js
exports.installMissing =( loadingWindow ) => {
  return new Promise((resolve, reject) => {
    var result = ''
    let command = child.spawn(execPath,["-e", installScript])
    command.stdout.on('data', function (data) { 
      let txt = data.toString()
      if(!!txt){
        if(txt=='endInstall'){
          console.log('endInstall')
          resolve('close')
        } else {
          result += (txt + '<br>')
          console.log('about to send' + result)
          loadingWindow.webContents.send('updateSplashTextBox', {msg: result});
        }
      } 
    })
    command.on('close', function () {
      resolve('close')
    })
    command.on('error', function (err) { reject(err) })
  })
}

exports.ask2Install =()=>{
  return new Promise(  (resolve, reject) =>{
    dialog.showMessageBox(
      {
        type: 'question',
        message: "The following packages need to be installed :-(\n" +
        JSON.stringify(missing) + "\n Install now?",
        buttons: ["Install Now","Quit"],
      },
      (i) => { 
          console.log('> ask2Install response='+i)
        if(i==0){
            resolve(true)
        } else {
            resolve(false)
        }
        //cleanUpApplication() 
      }
    )
    //resolve('ok')
  })
}