//simple kludge for now
// const fs = require('fs')
// exports.getRscriptPath= async function(){
//     if( fs.existsSync('/usr/local/bin/Rscript')){
//         rpath= '/usr/local/bin/Rscript'
//     } else if (fs.existsSync('/usr/bin/Rscript')){
//         rpath= '/usr/bin/Rscript'
//     } else {
//        rpath='Rscript'
//     }
//     return rpath 
// }

const MACOS = "darwin"
const WINDOWS = "win32"
const LINUX = "linux"

// const platform = process.platform
const child      = require('child_process')
runTypeCmd = function(cmd, params){
    console.log('cmd='+cmd)
    console.log('params='+params)
    
    return new Promise((resolve, reject) => {
        const result = child.exec(cmd, { timeout:0}, function(err, stdout, stderr){
          if(err){ 
              console.log(err)
              resolve('err')}
          if(stderr){ 
              console.log(erstderrr)
              resolve('quit')}
          resolve(stdout)
        })
    })
}

const extractLocation = function(str){
    return new Promise((resolve,reject)=>{
        str=str.split(/(\s+)/);
        let rtv=str[4]
        resolve(rtv)
    })
}

exports.getRscriptPath = async function(){
    let rtv=''
    //console.log(platform)
    if(process.platform===MACOS){
        let cmd= '/usr/bin/type "Rscript" | /bin/cat'
        let rtv = await  runTypeCmd(cmd )
        rtv = await extractLocation(rtv)
        return rtv
    } else if (process.platform===LINUX){ 
        cmd='type "Rscript" | cat'  
        let rtv = await  runTypeCmd(cmd )
        rtv = await extractLocation(rtv)
        return rtv
    } else if(process.platform===WINDOWS){ // something else for windos???
        let  cmd = 'where' // UNTESTED, probably won't work
        params="Rscript"
        let rtv = await  runTypeCmd(cmd )
        return rtv
    } else {
        return rtv
    }
}

