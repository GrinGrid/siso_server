var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var bCrypt = require('bcrypt-nodejs');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/appLogger');

var c = require('../conf/sms_conf');

exports.sendSMS = function(req, res){

        logger.info(req, "[전화인증을 위한 SMS 발송]");

        if (req.body.phone==null || req.body.phone==undefined || req.body.phone=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	var phone = req.body.phone;

	logger.info(req, "SMS 인증대상 전화번호 : " + phone);

	var credential = 'Basic '+new Buffer(c.APPID+':'+c.APIKEY).toString('base64');

	var authNum = ((Math.random()+0.135789).toString()).substring(3,9);

	var content = "시소 본인 인증번호 [" + authNum + "]를 입력해주세요";
	var content_buffer = new Buffer(content);

	logger.info(req, "발송내용 [" + content +"]");

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

	sendHTTPS(options, body, function(err, result) {
		if (!err) {
			var deliveryid = result.sent[0][1];
			logger.info(req, "전화번호 [" + phone + "] 송신ID [" + deliveryid + "]");

			sendResult(req, res, 0, authNum);
/*
			options = {
				host: 'api.bluehouselab.com',
				port: 443,
				path: '/smscenter/v1.0/result/'+deliveryid,
				headers: {
				'Authorization': credential,
				},
				method: 'GET'
		};

			sendHTTPS(options, null, function(err, result) {
				if (!err) {
					var sms_status = result.status;
					// 재시도 필요
					if (sms_status==-1) {
						setTimeout(sendHTTPS(options, null, function(err, result) {
							if (!err) {
								sms_status = result.status;
								// 한번 더 시도 필요
								if (sms_status==-1) {
									setTimeout(sendHTTPS(options, null, function(err, result) {
										if (!err) {
											sendResult(res, req, sms_status, authNum);
										} else {
											return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
										}
									}), 2000);
								} else {
									sendResult(res, req, sms_status, authNum);
								}
							} else {
								return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
							}
						}), 2000);
					} else {
						sendResult(res, req, sms_status, authNum);
					}
				} else {
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				}

			});
*/
		} else {
			logger.error(req, custMsg.getMsg(err));
			return res.status(500).json(custMsg.getMsg(err));
		}

	});
};

var sendHTTPS = function (options, data, callback) { 

	var https = require("https");

	logger.info(req, "OPTION [" + options + "]");
	logger.info(req, "DATA [" + data + "]");

	var req = https.request(options, function(res) {

		var body = "";

		res.on('data', function(d) {
			body += d;
		});

		res.on('end', function(d) {
			if(res.statusCode==200) {
				var bodyObj = JSON.parse(body);
				return callback(null, bodyObj);
			} else {
				return callback("SYS_ERROR", null);
			}
		});
	});

	if (data!=null)
		req.write(data);
	req.end();
	req.on('error', function(e) {
		return callback("SYS_ERROR", null);
	});
}

var sendResult = function (req, res, sms_status, authNum) {

/*
 * -1	확인 불가 (재시도 필요)
 *  0	성공
 *  10000	실패 (알수 없는 이유)
 *  10001	서비스 불가 단말기
 *  10002	NPDB (번호이동DB) 관련 에러
 *  10003	서비스 일시 정지
 *  10004	단말기 문제
 *  10005	System 에러
 *  10006	발송 제한시간 초과
*/
	var phone = req.body.phone;

	if(sms_status==0) {

        	var redisc = redis.createClient(6379, '127.0.0.1');     //connect to Redis

	        redisc.on('error', function(err) {
			logger.error(req, "SMS 발송을 위한 레디스 작업중 오류 발생 - " + err);
			redisc.quit();
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
	        });

		var today = (new Date()).getDate();
		var prefix = "sms.";
		var hashKey = createHash(authNum+today);
		hashKey = prefix + hashKey;

		logger.info(req, "SMS 처리를 위한 해쉬값 : " + hashKey);

		redisc.hmset(hashKey, {
			"phone" : phone,
			"authNum" : authNum
		}, redis.print);

		redisc.expire(hashKey, 180); // Key expires after 3 minutes

		logger.info(req, "SMS 발송 및 레디스 처리 완료");
		redisc.quit();
		return res.status(200).json({hashKey:hashKey});


	} else if (sms_status==-1) {
		return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
	} else if (sms_status==10000) {
		return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
	} else {
		return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
	}
};

exports.resultSMS = function(req, res){

	var https = require("https");
	var credential = 'Basic '+new Buffer(c.APPID+':'+c.APIKEY).toString('base64');

	var deliveryid = req.params.deliveryid;

	logger.info("송신ID [" + deliveryid + "]");

	options = {
		host: 'api.bluehouselab.com',
		port: 443,
		path: '/smscenter/v1.0/result/'+deliveryid,
		headers: {
			'Authorization': credential,
		},
		method: 'GET'
	};

	var result_req = https.request(options, function(result_res) {

		logger.info(result_res.statusCode);

		var body = "";

		result_res.on('data', function(d) {
			body += d;
		});

		result_res.on('end', function(d) {
			if(result_res.statusCode==200) {
/*
 * -1	확인 불가 (재시도 필요)
 *  0	성공
 *  10000	실패 (알수 없는 이유)
 *  10001	서비스 불가 단말기
 *  10002	NPDB (번호이동DB) 관련 에러
 *  10003	서비스 일시 정지
 *  10004	단말기 문제
 *  10005	System 에러
 *  10006	발송 제한시간 초과
*/
				var bodyObj = JSON.parse(body);
				logger.info(bodyObj);

				return res.status(200).json(bodyObj);

			} else {
				return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			}
		});
	});

	result_req.end();
	result_req.on('error', function(e) {
		logger.err(req, e);
		return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
	});
}


exports.confirmSMS = function(req, res){

        logger.info(req, "[전화인증을 위한 SMS 발송번호 확인]");

        if (req.body.phone==null || req.body.phone==undefined || req.body.phone=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.body.authNum==null || req.body.authNum==undefined || req.body.authNum=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.body.hashKey==null || req.body.hashKey==undefined || req.body.hashKey=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	var phone = req.body.phone;
	var hashKey = req.body.hashKey;
	var authNum = req.body.authNum;

	logger.info(req, "전화번호 : " + phone + ", 인증번호 : " + authNum + ", hashKey : " + hashKey);

        var redisc = redis.createClient(6379, '127.0.0.1');     //connect to Redis

        redisc.on('error', function(err) {
		logger.error(req, "SMS 인증번호 검증을 위한 처리중 레디스 오류 - " + err);
		redisc.quit();
		return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
        });



	redisc.hgetall(hashKey, function(err, obj) {
	// When there is no session data in REDIS
		if (err) {
			logger.error(req, "SMS 인증번호 검증을 위한 처리중 레디스 오류 - " + err);
			redisc.quit();
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if ( obj == null || obj == "" ) {
			logger.error(req, "인증가능한 SMS 정보가 레디스에 존재하지 않습니다.");
			redisc.quit();
			return res.status(500).json(custMsg.getMsg("SMS_TIMEOUT"));
		} else {

			logger.info(req, "발급 SMS번호 : [" + obj.authNum + "]");

			if (authNum==obj.authNum) {
				logger.info(req, "SMS 인증이 정상적으로 완료되었습니다.");
				redisc.expire(hashKey, 0); // Key expires after 3 minutes
				redisc.quit();
				return res.status(200).json(custMsg.getMsg("SUCCESS"));
			} else {
				logger.error(req, "SMS 인증번호가 올바르지 않습니다.");
				redisc.quit();
				return res.status(500).json(custMsg.getMsg("SMS_ERROR"));
			}

		}

	});
}


//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
