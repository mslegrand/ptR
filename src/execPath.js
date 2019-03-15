const {dialog}   = require('electron')
const fs = require('fs')

exports.store =null




exports.ask4Rscript =()=>{
    return new Promise(  (resolve, reject) =>{
        dialog.showMessageBox(
            {
                type: 'question',
                message: "Rscript was not found, -(\nIf indeed, R is  installed please supply path to your Rscript." ,
                buttons: ["Supply path to Rscript Now","Later"],
            },
            (i) => { 
                if(i==0){
                    const options={title: 'Navigate and select Rscript', buttonLabel: 'Select'}
                    dialog.showOpenDialog(null, options, (filePaths)=>{
                        // check that selected is Rscipte
                        // save file here
                        if(filePaths.length>0){
                            filePaths=filePaths[0]
                            exports.store.set("rscriptPath", filePaths)
                            resolve(true)
                        } else {
                            resolve(false)
                        } 
                    })
                } else {
                    resolve(false)
                }
            }
        )
    })
}


exports.getRscriptPath= async function(){
    var again =true
    var rscriptPath='yyy'
    for(let i=0; i<3; i++){
        //if(i>0) //for testing
        rscriptPath=exports.store.get("rscriptPath")
        if( fs.existsSync(rscriptPath)){ //add check for name ??
            return rscriptPath
        } else {
            again =  await exports.ask4Rscript()
            if(!again){
                rscriptPath
            }
        }
    }
    return rscriptPath 
}


