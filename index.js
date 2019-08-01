const port = process.env.PORT || 8098;

// Init variables and server

const fs = require('fs');
const moment = require('moment');
const request = require('request');
const app = require('express')();
const path = require('path');
const jsonfile = require('jsonfile');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

const http = require('http').Server(app);
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.printf(info => `${moment(new Date()).format('M/DD HH:mm:ss')}: ${info.level}: ${info.message}`)
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'error.log'), 
      level: 'error',
      format: winston.format.printf(info => `${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}: ${info.level}: ${info.message}`)
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'combined.log'),
      format: winston.format.printf(info => `${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}: ${info.level}: ${info.message}`)
    })
  ]
});

// End of init

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/*', function(req, res){
  let reqPath = req.path.slice(1).split('/'); 
  if(fs.existsSync(path.join(__dirname, 'public', ...reqPath))){
    res.sendFile(path.join(__dirname, 'public', ...reqPath));
  }
  else{
    res.status(404).sendFile(path.join(__dirname, 'protected', '404.html'));
  }
});

http.listen(port, function(){
    logger.info('Starting server...');
    logger.info('Now listening on localhost:'+port);
});