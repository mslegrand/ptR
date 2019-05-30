//const axios = require('axios');
//import http from 'axios'


const randomInt = (min, max) => {
  return Math.round(Math.random() * ((max + 1) - min) + min)
}

exports.randomPort = () => {
  // Those forbidden ports are in line with shiny
  // https://github.com/rstudio/shiny/blob/288039162086e183a89523ac0aacab824ef7f016/R/server.R#L734
  const forbiddenPorts = [3659, 4045, 6000, 6665, 6666, 6667, 6668, 6669, 6697];
  while (true) {
    let port = randomInt(3000, 8000)
    //console.log('port='+JSON.stringify(port))
    if (forbiddenPorts.includes(port))
      continue
    return port
  }
}

waitFor = (milliseconds) => {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, milliseconds);
  })
}

const axios = require('axios');
//import http from 'axios'

exports.isAlive = async function (port){
  let url = `http://127.0.0.1:${port}`
  //console.log(url);
  for (let i = 0; i <= 15; i++) { // tries fifteen times, 1/2 sec each, with 1 sec head (20.25 secs total)
    await waitFor(500)
    try {
      const res = await axios.head(url, {timeout: 1000})
      //console.log('isAlive: i='+i)
      //console.log('wow')
      //console.info(res)
      //console.log('res='+JSON.stringify(res.status))
      // TODO: check that it is really shiny and not some other webserver
      //console.log(typeof(res.status))
      if (res.status == 200) {
        return true;
      }
    } catch (e) { }
  }
  return false;
}

