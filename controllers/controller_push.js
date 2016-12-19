var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Push = mongoose.model('Push');
//var Push_History = mongoose.model('Push_History');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/wlogger');
var push = require('../lib/push');

exports.sendPushMsg = function(req, res){

        var query = User.findOne({"personal_info.email":req.body.email}, function(err, user){
                if(err) {
                        logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                } else if(user==null) {
                        logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
                }

		if (user.personal_info.push_id!=undefined) {
			push.sendPush(req.body.sender, req.body.email, req.body.type, user.personal_info.push_id, req.body.msg, function(err){
				if (err==null) {
					logger.info("Push msg has been sent successfully...");
					return res.status(200).json({msg:"Success"});
				} else {
					logger.error("Error received from FCM ["+err+"]");
					return res.status(500).send(custMsg.getMsg("PUSH_ERROR"));
				}
			});
		} else {
			logger.info("Push ID doensn't exist for the receiver...");
			return res.status(500).send(custMsg.getMsg("PUSH_ERROR"));
		}
	});

}

exports.getPushListByEmail = function(req, res){

	logger.info('Try to find push data for ['+req.params.email+"]");

	var email = req.params.email;
	var count = req.params.count*1;
	var key = req.params.key==null?Date.now():req.params.key;
    
	var query = Push.find({"email":email, "sys_req_date":{$lt:key}}, null, {"limit":count}, function(err, result){
                if(err){
			logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                } else if(result==null){
			logger.error("No push for ["+req.params.email+"] found...");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
                } else if(result.length==0){
			logger.error("No push for ["+req.params.email+"] found...");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
                }

                logger.info('Try to find push - finish');

		for (var i=0;i<result.length;i++) {
			result[i].req_date = result[i].sys_req_date.getTime();
			result[i].read_date = result[i].sys_read_date==null?"":result[i].sys_read_date.getTime();
			result[i].confirm_date = result[i].sys_confirm_date==null?"":result[i].sys_read_date.getTime();
		}

		query = Push.update({"email":req.params.email, "is_read":"N"}, {$set:{"is_read":"Y", "sys_read_date":Date.now()}}, {multi:true, upsert:false, new:true}, function(err, updatedPush){
			if(err) {
				logger.error(err);
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			}

			logger.info('Try to find push data for ['+updatedPush+"]");
                	return res.status(200).json(result);
		});
	});
};


exports.getUnreadPushCountByEmail = function(req, res){

	logger.info('Try to count unread push for ['+req.params.email+"]");
    
	var query = Push.count({"email":req.params.email, "is_read":"N"}, function(err, pushCount){
                if(err){
			logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                } 

		logger.info('Unread push count ['+pushCount+"]");

                return res.status(200).json({count: pushCount});
	});
};


exports.updatePushReadStatus = function( req, res) {

	logger.info('[Push update]');  

	logger.info(JSON.stringify(req.body));  

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

	var query = Push.findOneAndUpdate({"_id":req.body.id}, {$set:{"is_confirm":"Y", "is_read":"Y", "sys_confirm_date":Date.now(), "sys_read_date":Date.now()}}, {upsert:false, new:true}, function(err, updatedPush){
		if(err) {
			logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(updatedPush==null) {
			logger.error("No data found....");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

//		updatedPush = setDateInfo(updatedPush);

		logger.info("[UPDATE DATA]"+updatedPush);

		//res.status(200).json({msg:"updated successfully..."});
		return res.status(200).json(updatedPush);
	});
/*
		};
	});
*/
};

exports.deletePush = function(req, res){

	logger.info('[Push reject]');  
	logger.info(JSON.stringify(req.body));  

	Push.findOne({'email': req.body.email, 'writer_email': req.body.writer_email }, function(err, testimonial) {

		if(err) {
                	logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(testimonial==null) {
			logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info("[TESTIMONIAL INFO]"+testimonial);

		var testimonialHistory = new Push_History();

		testimonialHistory.email = testimonial.email;
		testimonialHistory.writer_email = testimonial.writer_email;
		testimonialHistory.writer_name = testimonial.writer_name;
		testimonialHistory.content = testimonial.content;
		testimonialHistory.sys_reg_date = testimonial.sys_reg_date;

		testimonialHistory.save(function(err){

			if (err) {
	                	logger.error(err);
	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info('Push information copied for backup successfully');

			var query = Push.remove({'email': req.body.email, 'writer_email': req.body.writer_email}, function(err) {

				if (err) {
					logger.error(err);
					return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} 
				logger.info('Push information deleted successfully');

				updatePushCount(req.body.email, "reduce");

				res.status(200).json({msg:"deleted successfully..."});
			});
		});
	});
};


var updatePushCount = function(email, gubun) {

        var query = User.findOne({"personal_info.email":email}, function(err, user){
                if(err) {
                        logger.error(err);
                } else if(user==null) {
                        logger.error("No data found....");
                }

                var count = user.personal_info.testimonial_count;

                logger.info("User["+email+"] testimonial Count["+count+"]");

		if (gubun=="add")
			count++;
		else if (gubun=="reduce")
			count--;

		if (count<0) count = 0;

		user.personal_info.testimonial_count = count;

                logger.info("User["+email+"] testimonial Count after ["+gubun+"] is ["+count+"]");

                user.save(function(err, user){
                        if (err) {
                                logger.error(err);
                        } 
                	logger.info("User["+email+"] testimonial Count updated successfully..");
                });
        });


};
