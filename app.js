
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var FileStreamRotator = require('file-stream-rotator');
var resBodyLogger = require('./lib/resBodyLogger');

var app = express();
var prefix = "";

//initialize mongoose schemas
require('./models/db_models');

/******************************************************************************** 
 * Acces Log[Date, Request Body, Response Body etc...]
 ********************************************************************************/
var logDir = __dirname + '/logs/access';

// create a rotating write stream 
var accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: logDir + '/access_%DATE%.log',
  frequency: 'daily',
  verbose: false
});

logger.token('req-body', function getBody(req){
  return JSON.stringify(req.body, null, 4);
});
logger.token('req-header', function getBody(req){
  return JSON.stringify(req.headers, null, 4);
});

app.use(logger('=============== [:date[iso]] [:method] [:url] '+
      '[:status][:res[content-length]][:response-time ms] =============== \\n'+
      '[REQUEST HEADER]\\n:req-header\\n'+ 
      '[REQUEST BODY]\\n:req-body\\n', 
      {stream: accessLogStream}));

app.use(resBodyLogger(accessLogStream));

//var appLogger = require('./lib/appLogger');
//app.use(appLogger("app"));

/********************************************************************************
 * Routers
 ********************************************************************************/
var _user = require('./routes/user')(passport);			// all kind of transactions
var _sitter = require('./routes/sitter');			// sitter list or detail
var _parent = require('./routes/parent');			// parent list or detail
var _testimonial = require('./routes/testimonial');		// testimonial list or detail
var _memo = require('./routes/memo');				// memo list or detail
var _contact = require('./routes/contact');			// contact list or detail
var _favorite = require('./routes/favorite');			// contact list or detail
var _sms = require('./routes/sms');				// handles sms verification
var _push = require('./routes/push');				// handles push
var _img = require('./routes/img');				// img uploading
var _exec = require('./routes/exec');				// system job like batch from outside
var _config = require('./routes/config');			// config file management 
var _session = require('./routes/session');			// session management 

var mongoose = require('mongoose');				//add for Mongo support
mongoose.connect('mongodb://localhost/siso');			//connect to Mongo

//var wlogger = require('./lib/wlogger');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));


//app.use(logger({
//  format: 'dev',
//  stream: fs.createWriteStream('./logs/app.log', {'flags': 'w'})
//}));

// session control for web applications later.
/*
app.use(session({
  secret: 'keyboard cat'
}));
*/
var date = new Date();
console.log("############### Node.js restarted at "+date.toLocaleTimeString()+" "+date.toLocaleDateString()+" #################");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

/********************************************************************************
 * URL routing
 ********************************************************************************/
app.use(prefix+'/user', _user);
app.use(prefix+'/sitter', _sitter);
app.use(prefix+'/parent', _parent);
app.use(prefix+'/testimonial', _testimonial);
app.use(prefix+'/memo', _memo);
app.use(prefix+'/contact', _contact);
app.use(prefix+'/favorite', _favorite);
app.use(prefix+'/sms', _sms);
app.use(prefix+'/push', _push);
app.use(prefix+'/img', _img);
app.use(prefix+'/exec', _exec);
app.use(prefix+'/config', _config);
app.use(prefix+'/session', _session);

//// Initialize Passport
var initPassport = require('./passport-init');
initPassport(passport);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


/********************************************************************************
 * error handlers
 ********************************************************************************/

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}


// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
