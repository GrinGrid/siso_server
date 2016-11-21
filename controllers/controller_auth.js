var bCrypt = require('bcrypt-nodejs');
var redis = require( 'redis' );
var custMsg = require( '../models/custom_msg' );
var logger = require( '../lib/wlogger' );

//Used for routes that must be authenticated.
exports.isAuthenticated = function (req, res, next) {
// if user is authenticated in the session, call the next() to call the next request handler 
// Passport adds this method to request object. A middleware is allowed to add properties to
// request and response objects
	
	logger.info('API Authentication - start');

	var headers = req.headers;
	var session_hash = headers['session-key'];

	logger.info('API Authentication - session_hash : ' + session_hash);

	if ( session_hash == undefined || session_hash == null || session_hash == "" ) {
		logger.error('API Authentication - error : no session value');
		// if the user is not authenticated then redirect him to the login page
	        return res.status(500).send(custMsg.getMsg("NO_SESSION"));
		//return res.redirect('/#login');
	} else {

		var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

		redisc.on('error', function(err) {
		        logger.error('Error ' + err);
	                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		});

		redisc.hget(session_hash, "email", function(err, value) {
			// When there is no session data in REDIS
			if (err) {
				redisc.quit();
	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			}

			if ( value == null || value == "" ) {
				logger.error('API Authentication - error : no matching session value');
	       			return res.status(500).send(custMsg.getMsg("INVALID_SESSION"));
			}

			EMAIL = value;
			logger.info("email : " + value);
			logger.info('API Authentication - finish');

			redisc.quit();

			return next();
		});
	}
}

//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
