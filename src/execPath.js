const {dialog}   =  require('electron')
const fs = require('fs')

exports.store =null

ask4Rscript = async ()=>{
    console.log('ask4Rscript')
    
    const options={title: 'Navigate and select Rscript', 
        buttonLabel: 'Select Rscript', 
        //icon: "assets/images/32x32.png",
        properties:["openFile"]
    }
    result= await dialog.showOpenDialog( options )        
    if(result.canceled===true){
        return false;   
    } else {// save file here
        
        filePaths=result.filePaths[0]
        console.log(JSON.stringify(filePaths))
        exports.store.set("rscriptPath", filePaths)
        return true
    }      
}

inputRscriptLocationYN = function() {
    return new Promise((resolve, reject)=>{
        dialog.showMessageBox({
            type: 'question',
            message: "Rscript was not found, -(\nIf indeed, R is  installed please supply path to your Rscript Executable." ,
            buttons: ["Supply Now", "Cancel"],
            icon: "assets/images/32x32.png",
            defaultId: 0, // bound to buttons array
            cancelId:  1  // bound to buttons array
        }).then(result => {
            if (result.response === 0) {
              // bound to buttons array
              console.log("Default button (0) clicked.");
              resolve(true)
            } else if (result.response === 1) {
              // bound to buttons array
              console.log("Cancel button clicked.");
              resolve(false)
            }})
    })
}


exports.getRscriptPath= async function(){
    const path = require('path');
    rscriptPath= exports.store.get("rscriptPath")
    // let tScriptPath=rscriptPath
    let dbgMssg= 'Trying rscriptPath='+ JSON.stringify(rscriptPath);
    console.log(dbgMssg)
    //loadingWindow.webContents.send('updateSplashTextBox', {msg: dbgMsg});
    let dbgMssg2=`Checking if  Rscript==${JSON.stringify(path.basename(rscriptPath, path.extname(rscriptPath)))}`
    console.log(dbgMssg2)
    let equalTst= ('Rscript'===path.basename(rscriptPath,path.extname(rscriptPath)))
    if(equalTst){
        console.log('the Rscripts are equal')
    } else {
        console.log('the Rscripts are NOT equal')
    }
    let rscriptExists = fs.existsSync(rscriptPath)
    console.log('result of fs.existsSync(rscriptPath)=' + JSON.stringify(rscriptExists))

    // if(tScriptPath.indexOf(' ')>0){
    //     tScriptPath=`\\"${tScriptPath}\\"`
    // }

    // tScriptExists = fs.existsSync(tScriptPath)
    // console.log('result of fs.existsSync(tScriptPath)=' + JSON.stringify(tScriptExists))
    //loadingWindow.webContents.send('updateSplashTextBox', {msg: dbgMsg2});
    if( !!rscriptExists 
        && //add check for name ??
        equalTst
    ){ 
        console.log( 'returning rscriptpath=' +  JSON.stringify(rscriptPath))
        return  rscriptPath  
    } else {
        console.log('inside else')
        enterLocation =  await inputRscriptLocationYN()
        console.log('enterLocation='+ enterLocation)
        if(enterLocation===true){
            console.log("enterLocation is true")
            goOn = await ask4Rscript()
            console.log('goOn='+ goOn)
            if(goOn===false){
                throw(Error('R-not-found'))
            } else {
                return exports.getRscriptPath() 
            }
        } else {
            throw(Error('R-not-found'))
        }
    } 
}


