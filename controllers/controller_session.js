var bCrypt = require('bcrypt-nodejs');
var redis = require( 'redis' );
var custMsg = require( '../models/custom_msg' );
var logger = require( '../lib/appLogger' );

exports.checkSession = function (req, res) {
	
	logger.info(req, "[세션정보 확인]");

	var headers = req.headers;
	var session_hash = headers['session-key'];

	logger.info(req, "세션 해쉬값 [" + session_hash + "]");

	if ( session_hash == undefined || session_hash == null || session_hash == "" ) {
		logger.error(req, "사용자 헤더에 세션정보가 존제하지 않습니다.");
		// if the user is not authenticated then redirect him to the login page
	       	return res.status(200).json({result:"NONE"});
//	        return res.status(500).json(custMsg.getMsg("NO_SESSION"));
		//return res.redirect('/#login');
	} else {
		var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

		redisc.on('error', function(err) {
		        logger.error(req, "세션정보를 위한 레디스 접근시 오류 - " + err);
			redisc.quit();
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		});

		redisc.hget(session_hash, "email", function(err, value) {
			if (err) {
		        	logger.error(req, "세션정보를 위한 레디스 조회시 오류 - " + err);
				redisc.quit();
	                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			}
			if ( value == null || value == "" ) {
				logger.info(req, "레디스에 해당 해쉬값이 존재하지 않습니다");
				redisc.quit();
	       			return res.status(200).json({result:"NONE"});
			} else {
				logger.info(req, value + " 사용자의 접속정보가 연장되었습니다");
				redisc.expire(session_hash, 86400); // Key expires after 24 hours
				redisc.quit();
	       			return res.status(200).json({result:"RENEWAL"});
			}
		});
	}
}
