var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Push = mongoose.model('Push');
//var Push_History = mongoose.model('Push_History');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/appLogger');
var push = require('../lib/push');

exports.sendPushMsg = function(req, res){

        logger.info(req, "[푸쉬 메시지 발송]");

        if (req.body.sender==null || req.body.sender==undefined || req.body.sender=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.body.email==null || req.body.email==undefined || req.body.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.body.type==null || req.body.type==undefined || req.body.type=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.body.msg==null || req.body.msg==undefined || req.body.msg=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        var query = User.findOne({"personal_info.email":req.body.email}, function(err, user){

                if(err) {
                        logger.error(req, err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
                } else if(user==null) {
                        logger.error(req, "수신자 정보가 존재하지 않습니다.");
			return res.status(500).json(custMsg.getMsg("RECEIVER_ERROR"));
                }

		if (user.personal_info.push_id!=undefined) {

			push.sendPush(req.body.sender, req.body.email, req.body.type, user.personal_info.push_id, req.body.msg, function(err){
				if (err==null) {
					logger.info(req, "푸쉬가 성공적으로 발송되었습니다.");
					return res.status(200).json({msg:"Success"});
				} else {
					logger.error(req, "푸쉬발송중 FCM 오류접수 ["+err+"]");
					return res.status(500).json(custMsg.getMsg("PUSH_ERROR"));
				}
			});
		} else {
			logger.info(req, "수신받을 푸쉬ID가 존재하지 않습니다.");
			return res.status(500).json(custMsg.getMsg("RECEIVER_ERROR"));
		}
	});

}

exports.sendManyPushMsgs = function(req, res){

        logger.info(req, "[푸쉬 메시지 발송]");

        if (req.body.sender==null || req.body.sender==undefined || req.body.sender=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.body.email==null || req.body.email==undefined || req.body.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.body.type==null || req.body.type==undefined || req.body.type=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.body.msg==null || req.body.msg==undefined || req.body.msg=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        var query = User.findOne({"personal_info.email":req.body.email}, function(err, user){

                if(err) {
                        logger.error(req, err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
                } else if(user==null) {
                        logger.error(req, "수신자 정보가 존재하지 않습니다.");
			return res.status(500).json(custMsg.getMsg("RECEIVER_ERROR"));
                }

		if (user.personal_info.push_id!=undefined) {

			push.sendPush(req.body.sender, req.body.email, req.body.type, user.personal_info.push_id, req.body.msg, function(err){
				if (err==null) {
					logger.info(req, "푸쉬가 성공적으로 발송되었습니다.");
					return res.status(200).json({msg:"Success"});
				} else {
					logger.error(req, "푸쉬발송중 FCM 오류접수 ["+err+"]");
					return res.status(500).json(custMsg.getMsg("PUSH_ERROR"));
				}
			});
		} else {
			logger.info(req, "수신받을 푸쉬ID가 존재하지 않습니다.");
			return res.status(500).json(custMsg.getMsg("RECEIVER_ERROR"));
		}
	});

}

exports.getPushListByEmail = function(req, res){

        logger.info(req, "[푸쉬 리스트 조회]");

        if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.params.count==null || req.params.count==undefined || req.params.count=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.params.key==null || req.params.key==undefined || req.params.key=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	var email = req.params.email;
	var count = req.params.count*1;
	var key = req.params.key==0?Date.now():req.params.key;
    
	var query = Push.find({"email":email, "sys_req_date":{$lt:key}}, null, {"limit":count}, function(err, result){
                if(err){
			logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
                } else if(result==null){
			logger.error(req, "푸쉬내역이 존재하지 않습니다.");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
                } else if(result.length==0){
			logger.error(req, "푸쉬내역이 존재하지 않습니다.");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
                }

		logger.info(req, "푸쉬내역 조회 성공");

		for (var i=0;i<result.length;i++) {
			result[i].req_date = result[i].sys_req_date.getTime();
			result[i].read_date = result[i].sys_read_date==null?"":result[i].sys_read_date.getTime();
			result[i].confirm_date = result[i].sys_confirm_date==null?"":result[i].sys_read_date.getTime();
		}

		query = Push.update({"email":req.params.email, "is_read":"N"}, {$set:{"is_read":"Y", "sys_read_date":Date.now()}}, {multi:true, upsert:false, new:true}, function(err, updatedPush){
			if(err) {
				logger.error(req, "푸쉬 읽음 표시를 위한 업데이트중 오류 - " + err);
				return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			}

			logger.info(req, "푸쉬내역 읽음 상태 업데이트 성공");

                        var listEmail = new Array();

                        for (var i=0; i<result.length; i++) 
                                listEmail.push(result[i].sender);

			query = User.find({"personal_info.email":{"$in":listEmail}}, function(err, users){
				if(err) {
					logger.error(req, "푸쉬 리스트에 사진 표시를 위해 조회중 오류 - " + err)
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				} else if(users==null) {
					logger.error(req, "푸쉬 리스트에 표시할 사진정보가 없습니다.");
					return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
				} else {
					var pushResult = [];

                        		for (var i=0; i<result.length; i++) {

						var tempPush = {};

						tempPush._id = result[i]._id;
						tempPush.sys_confirm_date = result[i].sys_confirm_date;
						tempPush.sys_read_date = result[i].sys_read_date;
						tempPush.sys_req_date = result[i].sys_req_date;
						tempPush.confirm_date = result[i].confirm_date;
						tempPush.read_date = result[i].read_date;
						tempPush.req_date = result[i].req_date;
						tempPush.is_confirm= result[i].is_confirm;
						tempPush.is_send_success = result[i].is_send_success;
						tempPush.msg = result[i].msg;
						tempPush.type = result[i].type;
						tempPush.sender = result[i].sender;
						tempPush.email = result[i].email;
						tempPush.__v = result[i].__v;
						tempPush.is_read = result[i].is_read;

                        			for (var j=0; j<users.length; j++) {
							if (users[j].personal_info.email==tempPush.sender) {
								tempPush.prf_img_url = users[j].image_info.prf_img_url;
								break;
							}
						}

						pushResult.push(tempPush);
					}
					logger.info(req, "푸쉬 리스트 및 사진정보 조회 성공 완료");
					return res.status(200).json(pushResult);
				}
			});

		});
	});
};


exports.getUnreadPushCountByEmail = function(req, res){

        logger.info(req, "[미확인 푸쉬 메시지 카운트]");

        if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	var query = Push.count({"email":req.params.email, "is_read":"N"}, function(err, pushCount){
                if(err){
			logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
                } 

		logger.info("미확인 푸쉬 숫자 [" + pushCount + "]");
                return res.status(200).json({count: pushCount});
	});
};


exports.updatePushReadStatus = function( req, res) {

        logger.info(req, "[푸쉬 메시지 수신 확인]");

        if (req.body._id==null || req.body._id==undefined || req.body._id=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	logger.info(req, "수신확인대상 ID : " + req.body._id);

/*
	//find a user in mongo with provided username
	Push.findOne({'email': req.body.email, 'writer_email': req.body.writer_email }, function(err, testimonial) {
	//In case of any error, return using the done method
		if (err){
			logger.error(err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		//already exists
		if (testimonial==null) {
			logger.error('Push request does not exist...: '+req.body.email);
	                return res.status(500).json(custMsg.getMsg("ID_EXIST"));
		} else {
*/

	var query = Push.findOneAndUpdate({"_id":req.body._id}, {$set:{"is_confirm":"Y", "is_read":"Y", "sys_confirm_date":Date.now(), "sys_read_date":Date.now()}}, {upsert:false, new:true}, function(err, updatedPush){
		if(err) {
			logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(updatedPush==null) {
			logger.error(req, "푸쉬 수신확인 대상 데이터가 없습니다");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		return res.status(200).json(custMsg.getMsg("SUCCESS"));
	});

/*
		};
	}); 
*/ 
};

exports.deletePush = function(req, res){

        logger.info(req, "[푸쉬 메시지 발송]");

        if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	logger.info(req, '[Push reject]');  
	logger.info(req, JSON.stringify(req.body));  

	Push.findOne({'email': req.body.email, 'writer_email': req.body.writer_email }, function(err, testimonial) {

		if(err) {
                	logger.error(req, err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(testimonial==null) {
			logger.error(req, "No data found....");
                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info(req, "[TESTIMONIAL INFO]"+testimonial);

		var testimonialHistory = new Push_History();

		testimonialHistory.email = testimonial.email;
		testimonialHistory.writer_email = testimonial.writer_email;
		testimonialHistory.writer_name = testimonial.writer_name;
		testimonialHistory.content = testimonial.content;
		testimonialHistory.sys_reg_date = testimonial.sys_reg_date;

		testimonialHistory.save(function(err){

			if (err) {
	                	logger.error(req, err);
	                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info(req, 'Push information copied for backup successfully');

			var query = Push.remove({'email': req.body.email, 'writer_email': req.body.writer_email}, function(err) {

				if (err) {
					logger.error(req, err);
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				} 
				logger.info(req, 'Push information deleted successfully');

				updatePushCount(req.body.email, "reduce");

				res.status(200).json({msg:"deleted successfully..."});
			});
		});
	});
};


var updatePushCount = function(email, gubun) {

        var query = User.findOne({"personal_info.email":email}, function(err, user){
                if(err) {
                        logger.error(req, err);
                } else if(user==null) {
                        logger.error(req, "No data found....");
                }

                var count = user.personal_info.testimonial_count;

                logger.info(req, "User["+email+"] testimonial Count["+count+"]");

		if (gubun=="add")
			count++;
		else if (gubun=="reduce")
			count--;

		if (count<0) count = 0;

		user.personal_info.testimonial_count = count;

                logger.info(req, "User["+email+"] testimonial Count after ["+gubun+"] is ["+count+"]");

                user.save(function(err, user){
                        if (err) {
                                logger.error(req, err);
                        } 
                	logger.info(req, "User["+email+"] testimonial Count updated successfully..");
                });
        });
};
