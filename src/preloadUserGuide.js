
const remote = require('electron').remote;
const FindInPage = require('electron-find').FindInPage;

window.clipboard = require('electron').clipboard;

window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
		let findInPage = new FindInPage(remote.getCurrentWebContents());
		findInPage.openFindWindow()
            }
}, false);

window.findWindow=function(){
      let findInPage = new FindInPage(remote.getCurrentWebContents());  
      findInPage.openFindWindow()
}

window.copySelection=function( text){
      //let text=remote.getCurrentWebContents();
      //console.log( JSON.stringify(text));
      if(!!text){
            window.clipboard.writeText(text, 'clipboard');
      }
};

