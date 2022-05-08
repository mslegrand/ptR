

const {  ipcRenderer } = require('electron');
const remote =require('@electron/remote')
const FindInPage = require('electron-find').FindInPage;
//import { remote, ipcRenderer } from 'electron'
//import { FindInPage } from 'electron-find'

//var $ = require(jquery);

window.Clipboard = require('electron').clipboard;

// window.addEventListener("keydown", (e) => {
//             if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
// 		let findInPage = new FindInPage(remote.getCurrentWebContents());
// 		findInPage.openFindWindow()
//             }
// }, false);

ipcRenderer.on('on-find', (arg) => {
      //console.log('new Find in Page');
      let findInPage = new FindInPage(remote.getCurrentWebContents(), {
            boxBgColor: '#333',
            boxShadowColor: '#000',
            inputColor: '#aaa',
            inputBgColor: '#222',
            inputFocusColor: '#555',
            textColor: '#aaa',
            textHoverBgColor: '#555',
            caseSelectedColor: '#555'
          });
      //console.log('about to open findInPage')
      findInPage.openFindWindow()
      //console.log('findInPage should be open')
});


window.findWindow=function(){
      let findInPage = new FindInPage(remote.getCurrentWebContents());  
      findInPage.openFindWindow();
}

window.copySelection=function( text){
      //let text=remote.getCurrentWebContents();
      //console.log( JSON.stringify(text));
      if(!!text){
            window.clipboard.writeText(text, 'clipboard');
      }
};

