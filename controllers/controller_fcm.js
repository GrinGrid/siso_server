var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var bCrypt = require('bcrypt-nodejs');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/wlogger');

exports.sendPush = function(req, res){

	var pushId = req.body.push_id;
	var message = req.body.message;

	var FCM = require('fcm').FCM;

	var apiKey = 'AIzaSyANZVFB2BhmFMM96FxPQXvmhmAyv2npzjQ';
	var fcm = new FCM(apiKey);

	var message = {
		to: pushId,
		data: {
			message: message
		}
	};

	fcm.send(message, function(err, messageId){
		if (err) {
			logger.info("Something has gone wrong!");
		} else {
			logger.info("Sent with message ID: ", messageId);
		}
	});

}






exports.sendSMS = function(req, res){

	var phone = req.body.phone;

	logger.info('SMS from phone : ' + phone);

        var redisc = redis.createClient(6379, '127.0.0.1');     //connect to Redis

        redisc.on('error', function(err) {
		logger.error("Error occured while processing logout...");
                logger.error(err);
		return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
        });

	var authNum = ((Math.random()+0.135789).toString()).substring(3,9);
        logger.info('authNum : ' + authNum);


logger.info("=========================================================");
logger.info("휴대폰 인증을 위해 " + authNum + " 을 입력해주세요.");
logger.info("=========================================================");

	var today = (new Date()).getDate();
	var hashKey = createHash(authNum+today);

	logger.info('hashKey : ' + hashKey);

	redisc.hmset(hashKey, {
		"phone" : phone,
		"authNum" : authNum
	}, redis.print);

	redisc.expire(hashKey, 180); // Key expires after 3 minutes

	return res.status(200).json({hashKey:hashKey});

        //redisc.quit();
}

exports.confirmSMS = function(req, res){

	var phone = req.body.phone;
	var hashKey = req.body.hashKey;
	var authNum = req.body.authNum;

	logger.info('SMS check from phone : ' + phone + ', authNum : ' + authNum + ', hashKey : ' + hashKey);

        var redisc = redis.createClient(6379, '127.0.0.1');     //connect to Redis

        redisc.on('error', function(err) {
		logger.error("Error occured while processing logout...");
                logger.error(err);
		return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
        });



	redisc.hgetall(hashKey, function(err, obj) {
	// When there is no session data in REDIS
		if (err) {
			redisc.quit();
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if ( obj == null || obj == "" ) {
			logger.error('SMS check - error : no matching hashKey value');
			return res.status(500).send(custMsg.getMsg("SMS_TIMEOUT"));
		} else {

			logger.info("phone : " + typeof(obj));
			logger.info("phone : " + obj.phone);
			logger.info("sms in : [" + authNum + "]");
			logger.info("sms origin : [" + obj.authNum + "]");
			logger.info('');

			if (authNum==obj.authNum) {
				logger.info('SMS check success : SMS number verified successfullly...');
				redisc.expire(hashKey, 0); // Key expires after 3 minutes
				return res.status(200).json({msg:"인증이 정상적으로 완료되었습니다."});
			} else {
				logger.error('SMS check - error : Wrong SMS number...');
				return res.status(500).send(custMsg.getMsg("SMS_ERROR"));
			}

		}

	});

        //redisc.quit();

}


//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
