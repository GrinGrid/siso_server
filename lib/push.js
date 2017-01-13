var mongoose = require( 'mongoose' );
var Push = mongoose.model('Push');

var logger = require('../lib/wlogger');
var custMsg = require('../models/custom_msg');

exports.sendPush = function(sender, receiver, type, push_id, msg, callback){

	logger.info("[Sending Push Message]");  
	logger.info("From["+sender+"] To["+receiver+"] Msg["+msg+"]");  

	var newPush = new Push();
	
	newPush.email = receiver;
	newPush.sender = sender;
	newPush.push_id = push_id;
	newPush.type = 10;
	newPush.msg = msg;
	newPush.is_send_success = "N";
	newPush.is_read = "N";
	newPush.is_confirm = "N";
	newPush.req_date = "";
	newPush.read_date = "";
	newPush.confirm_date = "";
	newPush.sys_req_date = Date.now();
	newPush.sys_read_date = null;
	newPush.sys_confirm_date = null;
	
	//save the user
	newPush.save(function(err) {
		if (err){
			logger.error(err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}

		logger.info(newPush.sender + ' push data inserted succesfully...');
		logger.info(newPush._id + ' push data inserted succesfully...');

		FCM = require('fcm-node');

		var SERVER_API_KEY= "AIzaSyBEf8ByJkU4u3M_ZhfR0pnc7f3DE2zCJ9E";
		var fcmCli= new FCM(SERVER_API_KEY);

/*
var payloadOK = {
    to: validDeviceRegistrationToken,
    data: { //some data object (optional)
        url: 'news',
        foo:'fooooooooooooo',
        bar:'bar bar bar'
    },
    priority: 'high',
    content_available: true,
    notification: { //notification object
        title: 'HELLO', body: 'World!', sound : "default", badge: "1"
    }
};
*/

		var sendMsg = sender+"|#$%|"+type+"|#$%|"+msg

	        var message = {
			to: push_id,
//			priority : "normal",
//			notification : {
//			body : "Contact request received...",
//			title : "SISO Noti",
//			icon : "new",
//			},
			data: {
				message: sendMsg
			}
/*
                    registration_id: push_id, // required
                    collapse_key: 'Collapse key',
                    data1: msg,
                    data2: msg+"2"
*/
	        };

		logger.info('PUSH ID ['+push_id+"]");
		logger.info('PUSH MSG ['+msg+"]");
		logger.info('PUSH DATA ['+JSON.stringify(message)+"]");

	        fcmCli.send(message, function(err, messageId){

	                logger.info('PUSH DATA ['+message+"]");

	                if (err) {
	                        logger.error("Something has gone wrong!");
	                        logger.error("["+err+"]");

				if (callback!=null)
		                        return callback(err);

	                } else {
	                        logger.info("Sent with message ID: ", messageId);

			        var query = Push.findOneAndUpdate({"_id":newPush._id}, {$set:{"is_send_success":"Y"}}, {upsert:false, new:true}, function(err, updatedPush){
			                if(err) {
			                        logger.error(err);
//			                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			                } else if(updatedPush==null) {
			                        logger.error("No data found....");
//			                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
			                } 

					if (callback!=null)
		                        	return callback(null);

	        		});
	                }
	        });
	});
};
