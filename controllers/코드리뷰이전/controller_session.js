var bCrypt = require('bcrypt-nodejs');
var redis = require( 'redis' );
var custMsg = require( '../models/custom_msg' );
var logger = require( '../lib/wlogger' );

exports.checkSession = function (req, res) {
	
	logger.info('Session check - start');

	var headers = req.headers;
	var session_hash = headers['session-key'];

	logger.info('Session check - session_hash : ' + session_hash);

	if ( session_hash == undefined || session_hash == null || session_hash == "" ) {
		logger.error('Session check - error : no session value');
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
				logger.error('Session check - no matching session value');
				redisc.quit();
	       			return res.status(200).json({result:"NONE"});
			} else {
				logger.error('Session check - Session expriation has been extended for user ['+value+']');
				redisc.expire(session_hash, 86400); // Key expires after 24 hours
				redisc.quit();
	       			return res.status(200).json({result:"RENEWAL"});
			}
		});
	}
}

//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
