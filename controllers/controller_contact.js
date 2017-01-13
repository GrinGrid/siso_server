var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Contact = mongoose.model('Contact');
var Contact_History = mongoose.model('Contact_History');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/appLogger');
var push = require('../lib/push');

exports.requestContact = function(req, res){

	logger.info(req, "[연락처 요청]");  

        if (req.body.req_email==null || req.body.req_email==undefined || req.body.req_email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.body.rcv_email==null || req.body.rcv_email==undefined || req.body.rcv_email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	logger.info(req, JSON.stringify(req.body));  

	Contact.findOne({ 'req_email' :  req.body.req_email, 'rcv_email': req.body.rcv_email, "status":{"$in":[0,1]}}, function(err, contact) {
		if (err){
			logger.error(req, err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if (contact) {
			logger.error(req, "요청중이거나 수락완료된 요청이 이미 존재합니다.");
	                return res.status(500).json(custMsg.getMsg("CONTACT_EXIST"));
		} 

		var newContact = new Contact();
	
		newContact.req_email = req.body.req_email;
		newContact.rcv_email = req.body.rcv_email;
		newContact.req_msg = req.body.req_msg;
		newContact.cancel_msg = "";
		newContact.answ_msg = "";
		newContact.status = 0;
		newContact.req_date = "";
		newContact.cancel_date = "";
		newContact.read_date = "";
		newContact.answ_date = "";
		newContact.req_list_yn = "Y";
		newContact.rcv_list_yn = "Y";
		newContact.sys_req_date = Date.now();
		newContact.sys_cancel_date = null;
		newContact.sys_read_date = null;
		newContact.sys_answ_date = null;
	
		//save the user
		newContact.save(function(err) {

			if (err){
				logger.error(req, "연락처 요청 입력 중 오류 - " + err);
				return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			}

			logger.info(req, newContact.rcv_email + " 사용자에게 연락처 요청 입력처리 완료");

                        query = User.find({"personal_info.email":{"$in":[req.body.req_email, req.body.rcv_email]}}, function(err, users){
				if(err) {
					logger.error(req, err);
					return res.status(200).json(custMsg.getMsg("SUCCESS"));
				} else if(users==null) {
					logger.error(req, "푸쉬 전송관련 사용자 정보가 없습니다.");
					return res.status(200).json(custMsg.getMsg("SUCCESS"));
				} else if(users.length<2) {
					logger.error(req, "푸쉬 전송관련 사용자 정보가 없습니다.");
					return res.status(200).json(custMsg.getMsg("SUCCESS"));
				}

				var push_id = (users[0].personal_info.email==req.body.rcv_email)?users[0].personal_info.push_id:users[1].personal_info.push_id;
				var sender_name = (users[0].personal_info.email==req.body.req_email)?users[0].personal_info.name:users[1].personal_info.name;
				push.sendPush(req.body.req_email, req.body.rcv_email, 10, push_id, sender_name + " 님께서 연락처 공개를 요청하셨습니다.", null);
				logger.info(req, "연락처 요청 푸쉬전송 요청완료");
				return res.status(200).json(custMsg.getMsg("SUCCESS"));

/*
				push.sendPush(req.body.req_email, req.body.rcv_email, 10, user.personal_info.push_id, "Test Message...", function(err){
					if (err==null) {
						logger.info(req, "Push msg has been sent successfully...");
						return res.status(200).json({msg:"Success"});
					} else {
						logger.error(req, "Error received from FCM ["+err+"]");
						return res.status(500).json(custMsg.getMsg("PUSH_ERROR"));
					}
				});
*/
			});
		});
	});
};

exports.acceptRequestedContact = function(req, res){
	updateContact(1, req, res);
};

exports.rejectRequestedContact = function(req, res){
	updateContact(2, req, res);
};

exports.cancelRequestedContact = function(req, res){
	updateContact(3, req, res);
};

var updateContact = function(status_gubun, req, res) {

	logger.info(req, "[연락처 요청 수락/취소/삭제]");  

        if (req.body._id==null || req.body._id==undefined || req.body._id=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	logger.info(req, JSON.stringify(req.body));  

	var setValue;

	if (status_gubun==1) {
		logger.info(req, "연락처 요청 수락 FROM [" + req.body.req_email + "]");  
		setValue = {"status":status_gubun, "answ_msg":req.body.answ_msg, "sys_answ_date":Date.now()};
	} else if (status_gubun==2) {
		logger.info(req, "연락처 요청 거절 FROM [" + req.body.req_email + "]");  
		setValue = {"status":status_gubun, "answ_msg":req.body.answ_msg, "sys_answ_date":Date.now()};
	} else if (status_gubun==3) {
		logger.info(req, "연락처 요청 취소 TO [" + req.body.rcv_email + "]");  
		setValue = {"status":status_gubun, "cancel_msg":req.body.cancel_msg, "sys_cancel_date":Date.now()};
	} else {
		logger.error(req, "연락처 요청 처리구분값이 올바르지 않습니다.");  
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
	}

	logger.info(req, JSON.stringify(req.body));  

	var query = Contact.findOneAndUpdate({"_id":req.body._id}, {$set:setValue}, {upsert:false, new:true}, function(err, updatedContact){
		if(err) {
			logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(updatedContact==null) {
			logger.error(req, "원본 연락처 요청 정보가 없습니다.");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		logger.info(req, "연락처 요청 수락/취소/삭제 완료");

		query = User.find({"personal_info.email":{"$in":[req.body.req_email, req.body.rcv_email]}}, function(err, users){
			if(err) {
				logger.error(req, err);
				return res.status(200).json(custMsg.getMsg("SUCCESS"));
			} else if(users==null) {
				logger.error(req, "푸쉬 전송관련 사용자 정보가 없습니다.");
				return res.status(200).json(custMsg.getMsg("SUCCESS"));
			} else if(users.length<2) {
				logger.error(req, "푸쉬 전송관련 사용자 정보가 없습니다.");
				return res.status(200).json(custMsg.getMsg("SUCCESS"));
			}

			var sender, receiver, push_id, sender_name, push_msg, push_code;

			// 연락처 요청 승락
			if (status_gubun==1) {
				sender = (users[0].personal_info.email==req.body.rcv_email)?users[0].personal_info.email:users[1].personal_info.email;
				receiver = (users[0].personal_info.email==req.body.req_email)?users[0].personal_info.email:users[1].personal_info.email;
				push_id = (users[0].personal_info.email==req.body.req_email)?users[0].personal_info.push_id:users[1].personal_info.push_id;
				sender_name = (users[0].personal_info.email==req.body.rcv_email)?users[0].personal_info.name:users[1].personal_info.name;
				push_msg = sender_name + " 님께서 연락처 공개 요청을 수락하셨습니다."; 
				push_code = "11";
			// 연락처 요청 거절
			} else if (status_gubun==2) {
				sender = (users[0].personal_info.email==req.body.rcv_email)?users[0].personal_info.email:users[1].personal_info.email;
				receiver = (users[0].personal_info.email==req.body.req_email)?users[0].personal_info.email:users[1].personal_info.email;
				push_id = (users[0].personal_info.email==req.body.req_email)?users[0].personal_info.push_id:users[1].personal_info.push_id;
				sender_name = (users[0].personal_info.email==req.body.rcv_email)?users[0].personal_info.name:users[1].personal_info.name;
				push_msg = sender_name + " 님께서 연락처 공개 요청을 거절하셨습니다."; 
				push_code = "12";
			// 연락처 요청 취소 
			} else if (status_gubun==3) {
				sender = (users[0].personal_info.email==req.body.req_email)?users[0].personal_info.email:users[1].personal_info.email;
				receiver = (users[0].personal_info.email==req.body.rcv_email)?users[0].personal_info.email:users[1].personal_info.email;
				push_id = (users[0].personal_info.email==req.body.rcv_email)?users[0].personal_info.push_id:users[1].personal_info.push_id;
				sender_name = (users[0].personal_info.email==req.body.req_email)?users[0].personal_info.name:users[1].personal_info.name;
				push_msg = sender_name + " 님께서 연락처 공개 요청을 취소하셨습니다."; 
				push_code = "13";
			} else {
				return res.status(200).json(custMsg.getMsg("SUCCESS"));
			}

			push.sendPush(sender, receiver, push_code, push_id, push_msg, null);
			logger.info(req, "연락처 요청 수락/취소/삭제 푸쉬전송 요청완료");
			return res.status(200).json(custMsg.getMsg("SUCCESS"));

/*
			push.sendPush(req.body.req_email, req.body.rcv_email, 10, user.personal_info.push_id, "Test Message...", function(err){
				if (err==null) {
					logger.info(req, "Push msg has been sent successfully...");
					return res.status(200).json({msg:"Success"});
				} else {
					logger.error(req, "Error received from FCM ["+err+"]");
					return res.status(500).json(custMsg.getMsg("PUSH_ERROR"));
				}
			});

			return res.status(200).json(custMsg.getMsg("SUCCESS"));
*/
		});
	});
};

exports.deleteContact = function(req, res){

	logger.info(req, "[연락처 요청 리스트에서 삭제]");  

        if (req.body._id==null || req.body._id==undefined || req.body._id=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.body.req_list_yn==null || req.body.req_list_yn==undefined || req.body.req_list_yn=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.body.rcv_list_yn==null || req.body.rcv_list_yn==undefined || req.body.rcv_list_yn=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	var setValue;

	if (req.body.req_list_yn=="N")
		setValue = {"req_list_yn":"N"};
	else
		setValue = {"rcv_list_yn":"N"};

	var query = Contact.findOneAndUpdate({"_id":req.body._id, "status":{"$in":[1,2,3]}}, {$set:setValue}, {upsert:false, new:true}, function(err, updatedContact){
		if(err) {
			logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(updatedContact==null) {
			logger.error(req, "삭제할 연락처 요청정보가 없습니다.");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		logger.info(req, "연락처 요청 리스트 삭제처리 완료");
		return res.status(200).json(custMsg.getMsg("SUCCESS"));
	});
};
