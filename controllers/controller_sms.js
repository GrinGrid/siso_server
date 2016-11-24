var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var bCrypt = require('bcrypt-nodejs');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/wlogger');

var c = require('./sms_conf');

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


	var https = require("https");
	var credential = 'Basic '+new Buffer(c.APPID+':'+c.APIKEY).toString('base64');

	var content = "시소 본인 인증번호 [" + authNum + "]를 입력해주세요";
	var content_buffer = new Buffer(content);

	logger.info("content [" + content +"]");

	var receivers = [];
	receivers.push(phone);

	var data = {
		"sender"     : c.SENDER,
		"receivers"  : receivers,
		"content"    : content_buffer.toString()
	}

	var body = JSON.stringify(data);

	var options = {
		host: 'api.bluehouselab.com',
		port: 443,
		path: '/smscenter/v1.0/sendsms',
		headers: {
		'Authorization': credential,
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(body)
		},
		method: 'POST'
	};

	var sms_req = https.request(options, function(sms_res) {

		logger.info(sms_res.statusCode);

		var body = "";

		sms_res.on('data', function(d) {
			body += d;
		});

		sms_res.on('end', function(d) {
		  	if(sms_res.statusCode==200) {
				logger.log(JSON.parse(body));

				var today = (new Date()).getDate();
				var prefix = "sms.";
				var hashKey = createHash(authNum+today);
				hashKey = prefix + hashKey;

				logger.info('hashKey : ' + hashKey);

				redisc.hmset(hashKey, {
					"phone" : phone,
					"authNum" : authNum
				}, redis.print);

				redisc.expire(hashKey, 180); // Key expires after 3 minutes

				return res.status(200).json({hashKey:hashKey});

			        //redisc.quit();
			} else {
				logger.error(body);
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			}
		});
	});

	sms_req.write(body);
	sms_req.end();
	sms_req.on('error', function(e) {
		logger.err(e);
		return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
	});
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
