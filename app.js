
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();
var conf = require('config');
var log4js =  require('./node_modules/log4js/lib/log4js');
console.log(conf.systemLog);
log4js.addAppender(log4js.fileAppender(conf.systemLog.filePath), 'SystemLog');
log4js.addAppender(log4js.fileAppender(conf.accessLog.filePath), 'AccessLog');
var accessLog = log4js.getLogger('AccessLog');
accessLog.setLevel('INFO');
var path = require('path');
// twitter
var oauth = new (require('oauth').OAuth)(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    conf.Application.twitter.consumerKey,
    conf.Application.twitter.consumerSecret,
    '1.0',
    'http://d.d.e.ze.gs/signin/twitter/callback',
    'HMAC-SHA1'
);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
//  app.use(express.logger());
//  app.use(log4js.connectLogger(log4js.getLogger('AccessLog'), { level: log4js.levels.INFO }));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: conf.Application.session.secret }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Helpers
app.dynamicHelpers({
    session: function(req, res) {
        return req.session;
    },
    loggedIn: function(req, res) {
        return req.session && req.session.user_profile;
    }
});


// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: conf.Application.title
  });
});

app.get('/signin/twitter', function(req, res) {
    oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
        if(error) {
            res.send(error)
        } else {
            req.session.oauth = {};
            req.session.oauth.token = oauth_token;
            req.session.oauth.token_secret = oauth_token_secret;
            res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token);
        }
    });
});

app.get('/signin/twitter/callback', function(req, res) {
    if(req.session.oauth) {
        req.session.oauth.verifier = req.query.oauth_verifier;

        oauth.getOAuthAccessToken(req.session.oauth.token, req.session.oauth.token_secret, req.session.oauth.verifier,
            function(error, oauth_access_token, oauth_access_token_secret, results) {
                if(error) {
                    res.send(error);
                } else {
                    req.session.oauth.access_token = oauth_access_token;
                    req.session.oauth.access_token_secret = oauth_access_token_secret;
                    req.session.user_profile = results
                    res.redirect('/');
                }
            }
        );
    }
});

app.get('/signout', function(req, res) {
    delete req.session.oauth;
    delete req.session.user_profile;
    res.redirect('/');
});

app.listen(conf.Application.port);
var socket = require('socket.io').listen(app);
socket
.of('/status')
.on('connection', function(socket) {
  console.log('connected');
  var updateStatus = function(msg,action,stat){
    msg = msg || {};
    msg.id = socket.id;
    msg.status = stat;
    console.log(msg);
    socket.broadcast.emit(action, msg);
  };
  socket.on('signin', function (msg) {
    accessLog.info("SIGNIN\t"+msg.screen_name+"\t"+msg.contents+"\t"+msg.miss+"\t"+msg.clear+"\t"+msg.studyTime);
    updateStatus(msg,'signin','sing in now');
  });
  socket.on('miss', function (msg) {
    accessLog.info("MISS\t"+msg.screen_name+"\t"+msg.contents+"\t"+msg.miss+"\t"+msg.clear+"\t"+msg.studyTime);
    updateStatus(msg,'miss','MISS!'+msg.miss);
  });
  socket.on('clear', function (msg) {
    accessLog.info("CLEAR\t"+msg.screen_name+"\t"+msg.contents+"\t"+msg.miss+"\t"+msg.clear+"\t"+msg.studyTime);
    updateStatus(msg,'clear','CLEAR!!:'+msg.clear);
  });
  socket.on('skip', function (msg) {
    accessLog.info("SKIP\t"+msg.screen_name+"\t"+msg.contents+"\t"+msg.miss+"\t"+msg.clear+"\t"+msg.studyTime);
    updateStatus(msg,'skip','SKIP');
  });
  socket.on('type start', function (msg) {
    accessLog.info("TYPE START\t"+msg.screen_name+"\t"+msg.contents+"\t"+msg.miss+"\t"+msg.clear+"\t"+msg.studyTime);
    updateStatus(msg,'type start','typing ...');
  });
  socket.on('type end', function (msg) {
    accessLog.info("TYPE END\t"+msg.screen_name+"\t"+msg.contents+"\t"+msg.miss+"\t"+msg.clear+"\t"+msg.studyTime);
    var sec = parseInt(parseInt(msg.studyTime)/1000);

    var hour= parseInt(sec/(60 * 60));
    if(hour > 0 ){sec    %= (hour * 60 * 60);}

    var min = parseInt(sec/60);
    if(min > 0 ){sec    %= (min * 60);}

    if(hour< 10){hour = "0"+hour};
    if(min < 10){min  = "0"+min};
    if(sec < 10){sec  = "0"+sec};
    updateStatus(msg,'type end',''+hour+":"+min+":"+sec);
  });
  socket.on('disconnect', function () {
    socket.broadcast.emit('signout', {id:socket.id,status:"signout"});
  });
});
