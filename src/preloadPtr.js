// ptRelectronIPC.js




window.ipcRenderer = require('electron').ipcRenderer;
window.shell = require('electron').shell;

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

