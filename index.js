const port = process.env.PORT || 8099;

// Init variables and server

const fs = require('fs');
const moment = require('moment');
const request = require('request');
const app = require('express')();
const path = require('path');
const jsonfile = require('jsonfile');

const session = require('express-session')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
let whitelist = require('./whitelist.json'); 

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

const MongoClient = require('mongodb').MongoClient;
const MongoURL = 'mongodb://localhost:27017/frhmediaserver';
const dbName = 'frhmediaserver';
const dbClient = new MongoClient(MongoURL, {useNewUrlParser: true}); 
let mdb, vdb; 

dbClient.connect((e) => {
  if(e){logger.error('Failed to connect to local MongoDB server (localhost:27017)', e); require('process').exit()}
  logger.info('Connected to local MongoDB server (localhost:27017).')
  mdb = dbClient.db(dbName);
})

let sess_MongoStore = require('connect-mongo')(session); 
let sess = {
  secret: 'this is a very secure secret look it even has numbers - 12305789',
  store: new sess_MongoStore({
    url: 'mongodb://localhost:27017/frhmediaserver', 
    stringify: false
  }),
  saveUninitialized: false, 
  resave: false,
  cookie: {}
}
 
app.use(session(sess));

// End of init

let reqOptions = {
  method: 'GET',
  url: 'https://graph.microsoft.com/v1.0/me',
  headers: {
    authorization: ''
  }
};

function lookupUser(token){
  return new Promise((res, rej) => {
    reqOptions.headers.authorization = 'Bearer ' + token; 
    request(reqOptions, function (error, resp, body) {
      if (error) rej(error); 
      res(JSON.parse(body)); 
    });
  })
}

function validateUser(email){
  if(!whitelist[email]) return false; 
  return whitelist[email]; 
}

// OAuth / SSO Validation

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/verify', function(req, res){
  if(!req.body.token){
    res.json({'type': 'error', 'message': 'No token provided'}); 
  }
  else{
    lookupUser(req.body.token).then(user => {
      if(validateUser(user.mail)){
        req.session.cookie.maxAge = 3600000; // Tokens last only for one hour
        req.session.auth = {
          name: user.displayName, 
          access: validateUser(user.mail)
        }; 
      }
      res.json({
        'type': 'success', 
        'name': user.displayName, 
        'mail': user.mail, 
        'UID': user.id, 
        'access': validateUser(user.mail)
      }); 
    }); 
  }
})

app.post('/signout', function(req, res){
  delete req.session.auth; 
  setTimeout(function(){ // it makes it feel like something is happening
    res.json({'type': 'success'})
  }, 400); 
}); 

app.get('/public/*', function(req, res){
  let reqPath = req.path.slice(1).split('/').slice(1); 
  if(fs.existsSync(path.join(__dirname, 'public', ...reqPath))){
    res.sendFile(path.join(__dirname, 'public', ...reqPath));
  }
  else{
    res.status(404).sendFile(path.join(__dirname, 'protected', '404.html'));
  }
});

app.get('/secure/*', function(req, res){
  if(!req.session.auth){
    res.status(302).redirect('../#permError'); 
  }
  else{
    let reqPath = req.path.slice(1).split('/').slice(1); 
    if(fs.existsSync(path.join(__dirname, 'protected', ...reqPath))){
      res.sendFile(path.join(__dirname, 'protected', ...reqPath));
    }
    else{
      res.status(404).sendFile(path.join(__dirname, 'protected', '404.html'));
    }
  }

});

http.listen(port, function(){
    logger.info('Starting server...');
    logger.info('Now listening on localhost:'+port);
});