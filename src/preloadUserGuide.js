
const remote = require('electron').remote;
const FindInPage = require('electron-find').FindInPage;



window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
		let findInPage = new FindInPage(remote.getCurrentWebContents());
		findInPage.openFindWindow()
            }
}, false);