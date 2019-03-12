//simple kludge for now
const fs = require('fs')
exports.getRscriptPath= async function(){
    if( fs.existsSync('/usr/local/bin/Rscript')){
        rpath= '/usr/local/bin/Rscript'
    } else if (fs.existsSync('/usr/bin/Rscript')){
        rpath= '/usr/bin/Rscript'
    } else {
       rpath='Rscript'
    }
    return rpath 
}

// const MACOS = "darwin"
// const WINDOWS = "win32"
// const LINUX = "linux"

// const platform = process.platform
// const child      = require('child_process')
// runTypeCmd = function(cmd){
//     return new Promise((resolve, reject) => {
        
//         const result = child.exec(cmd, {timeout:0}, function(err, stdout, stderr){
//           if(err){ resolve('quit')}
//           if(stderr){ resolve('quit')}
//           resolve(stdout)
//         })
//     })
// }

// exports.getRscriptPath = async function(){
//     let rtv=''
//     console.log(platform)
//     if(platform===MACOS || platform===LINUX){
//         let  cmd = 'type Rscript | cat'
//         rtv = await  runTypeCmd(cmd )
//         rtv = await (async function(rtv){
//             rtv = rtv.split(/(\s+)/);
//             rtv = rtv[4]
//             return rtv
//         })(rtv)
//         // TODO:: need to handle case where it is in 2 locations
//         return rtv;
//     } else if(platform===WINDOWS){ // something else for windos???
//         let  cmd = 'where Rscript' // UNTESTED, probably won't work
//         rtv = await  runTypeCmd(cmd )
//         return rtv
//     } else {
//         return "Rscript"
//     }
// }

