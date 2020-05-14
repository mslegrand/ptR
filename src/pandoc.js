const {dialog}   =  require('electron')
const fs = require('fs')

const {dirname} =require('path')

exports.store =null

const {execSync} = require('child_process');

exports.onPath =  async (os) => {
    // based on the oswe execute one of the following
    // windows: where.exe pandoc.*
    // osx:   which pandoc
    // linux: which pandoc
    var ecmd;
    console.log('os='+os)
    if(os==='win32'){
        ecmd='where.exe pandoc.*'
    } else {
        ecmd='which pandoc'
    }
    try{
        let ppath = execSync(ecmd ).toString()
        console.log("ppath="+ppath);
        return !!ppath
    } catch {
        return false
    }
}

ask4PandocDialog = async ()=>{
    console.log('ask4PandocDialog')  
    const options={title: 'Navigate and select Pandoc file', 
        buttonLabel: 'Select File', 
        properties:["openFile"]
    }
    result= await dialog.showOpenDialog( options )        
    if(result.canceled===true){
        console.log('canceling')
        Promise.resolve(false);   
    } else {// save path here    
        filePaths=dirname(result.filePaths[0])
        console.log(JSON.stringify(filePaths))
        exports.store.set("pandocPath", filePaths)
        Promise.resolve(true)
    }      
}

exports.getPandocPath= async () => {  
    const path = require('path');
    let pdpath= exports.store.get("pandocPath")
    console.log('2: pandoc='+ JSON.stringify(pdpath))
    if( fs.existsSync(pdpath)  &&
        // && //add check for name ??
        'pandoc'===path.basename(pdpath,path.extname(pdpath))
    ){ 
        return  pdpath  
    } else {
        console.log('inside else')
            inputPathYN =  await dialog.showMessageBox({
                type: 'question',
                icon: "assets/images/32x32.png",
                message: "Pandoc was not found, -(\nIf indeed, Pandoc is  installed please supply location of the Pandoc executable." ,
                buttons: ["Supply Now", "Cancel"],
                defaultId: 0, // bound to buttons array
                cancelId:  1  // bound to buttons array
            })
            if(inputPathYN.response===0){
                await ask4PandocDialog()
            } else {
                console.log('should reject pandoc')
                throw(Error('MISSING-PANDOC'))
            }
            return exports.getPandocPath() 
    } 
}