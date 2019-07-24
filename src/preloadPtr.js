// ptRelectronIPC.js

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
	const replaceText = (selector, text) => {
	  const element = document.getElementById(selector)
	  if (element) element.innerText = text
	} 
	
	for (const type of ['chrome', 'node', 'electron']) {
	  replaceText(`${type}-version`, process.versions[type])
	}
  })
  


window.ipcRenderer = require('electron').ipcRenderer;
window.shell = require('electron').shell;
window.clipboard = require('electron').clipboard;

window.sendToElectron = function(channel, arg1, arg2) {
	window.ipcRenderer.send(channel, arg1, arg2);
}

window.sendExitConfirmation=function(){
	console.log('window.sendExitConfirmation');
	let exitVal= window.ipcRenderer.sendSync('confirmExitMssg', 'true');
	console.log('exitVal='+exitVal);
	return exitVal
}

window.openLinkInExtBrower=function(link){
	window.shell.openExternal(link)
}

window.writeText=function(text){
	console.log('window.writeText');
	window.clipboard.writeText(text);
}

window.readText=function(){
	console.log('window.readText');
	return window.clipboard.readText();
}
