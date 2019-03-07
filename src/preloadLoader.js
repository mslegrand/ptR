// preloadLoader

window.ipcRenderer = require('electron').ipcRenderer;

window.ipcRenderer.on('updateSplashTextBox', function(event, data){
    //console.log('updateSplashTextBox  window.ipcRender: arg=', data.msg)
    document.getElementById('splashTextBox').innerHTML = data.msg;
})