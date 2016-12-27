var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Contact = mongoose.model('Contact');
var Contact_History = mongoose.model('Contact_History');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/appLogger');
var push = require('../lib/push');


exports.getContact = function(req, res){

	logger.info(req, 'Try to find all users - start');
    
	var query = User.find(function(err, users){
                if(err){
			logger.error(req, err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                }

                logger.info(req, 'Try to find all users - finish');
                return res.status(200).json(users);
	});
};


exports.requestContact = function(req, res){

	logger.info(req, '[Contact Request]');  
	logger.info(req, JSON.stringify(req.body));  

	//find a user in mongo with provided username
	Contact.findOne({ 'req_email' :  req.body.req_email, 'rcv_email': req.body.rcv_email, "status":{"$in":[0,1]}}, function(err, contact) {
	//In case of any error, return using the done method
		if (err){
			logger.error(req, err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		//already exists
		if (contact) {
			logger.error(req, 'Contact request already exists...: '+req.body.req_email);
	                return res.status(500).json(custMsg.getMsg("CONTACT_EXIST"));
		} else {
			var newContact = new Contact();
	
			newContact.req_email = req.body.req_email;
			newContact.rcv_email = req.body.rcv_email;
			newContact.req_msg = req.body.req_msg;
			newContact.rcv_msg = "";
			newContact.status = 0;
			newContact.req_date = "";
			newContact.rcv_date = "";
			newContact.last_update = "";
			newContact.sys_req_date = Date.now();
			newContact.sys_rcv_date = null;
			newContact.sys_last_update = Date.now();
	
			//save the user
			newContact.save(function(err) {
				if (err){
					logger.error(req, err);
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				}

				logger.info(req, newContact.req_email + ' requested contact succesfully...');


			        var query = User.findOne({"personal_info.email":req.body.rcv_email}, function(err, user){
			                if(err) {
			                        logger.error(req, err);
						return res.status(200).json({msg:"Success"});
			                } else if(user==null) {
			                        logger.error(req, "There is no user for : " + rcv_email);
						return res.status(200).json({msg:"Success"});
			                } else {
			                        logger.info(req, "Send push to user : " + user.personal_info.email);

						push.sendPush(req.body.req_email, req.body.rcv_email, 10, user.personal_info.push_id, "Test Message...", function(err){
							if (err==null) {
								logger.info(req, "Push msg has been sent successfully...");
								return res.status(200).json({msg:"Success"});
							} else {
								logger.error(req, "Error received from FCM ["+err+"]");
								return res.status(500).send(custMsg.getMsg("PUSH_ERROR"));
							}
						});
					}

			        });

			});

		}
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

var updateContact = function(status, req, res) {

	if (status==1)
		logger.info(req, '[Contact accept]');  
	else if (status==2)
		logger.info(req, '[Contact reject]');  
	else
		logger.info(req, '[Contact cancel]');  

	logger.info(req, JSON.stringify(req.body));  

/*
	//find a user in mongo with provided username
	Contact.findOne({'req_email': req.body.req_email, 'rcv_email': req.body.rcv_email }, function(err, contact) {
	//In case of any error, return using the done method
		if (err){
			logger.error(req, err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		//already exists
		if (contact==null) {
			logger.error(req, 'Contact request does not exist...: '+req.body.email);
	                return res.status(500).json(custMsg.getMsg("ID_EXIST"));
		} else {
*/

//			var query = Contact.findOneAndUpdate({"req_email":req.body.req_email, "rcv_email":req.body.rcv_email}, {$set:{"status":status, "rcv_msg":req.body.rcv_msg, "sys_rcv_date":Date.now(), "sys_last_update":Date.now()}}, {upsert:false, new:true}, function(err, updatedContact){
			var query = Contact.findOneAndUpdate({"_id":req.body.id}, {$set:{"status":status, "rcv_msg":req.body.rcv_msg, "sys_rcv_date":Date.now(), "sys_last_update":Date.now()}}, {upsert:false, new:true}, function(err, updatedContact){
				if(err) {
		                	logger.error(req, err);
		                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} else if(updatedContact==null) {
					logger.error(req, "No data found....");
		                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
				}

//				updatedContact = setDateInfo(updatedContact);

		                logger.info(req, "[UPDATE DATA]"+updatedContact);

			        //res.status(200).json({msg:"updated successfully..."});
			        return res.status(200).json(updatedContact);
			});
/*
		};
	});
*/
};

exports.removeContact = function(req, res){

	logger.info(req, '[Contact reject]');  
	logger.info(req, JSON.stringify(req.body));  

	Contact.findOne({'req_email': req.body.req_email, 'rcv_email': req.body.rcv_email }, function(err, contact) {

		if(err) {
                	logger.error(req, err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(contact==null) {
			logger.error(req, "No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info(req, "[CONTACT INFO]"+contact);
/*
		var contactHistory = new Contact_History();

		contactHistory.req_email = contact.req_email;
		contactHistory.rcv_email = contact.rcv_email;
		contactHistory.req_msg = contact.req_msg;
		contactHistory.rcv_msg = contact.rcv_msg;
		contactHistory.status = contact.status;
		contactHistory.sys_req_date = contact.sys_req_date;
		contactHistory.sys_rcv_date = contact.sys_rcv_date;
		contactHistory.sys_last_update = Date.now();

		contactHistory.save(function(err){

			if (err) {
	                	logger.error(req, err);
	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info(req, 'Contact information copied for backup successfully');

			var query = Contact.remove({'req_email': req.body.req_email, 'rcv_email': req.body.rcv_email}, function(err) {

				if (err) {
					logger.error(req, err);
					return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} 
				logger.info(req, 'Contact information deleted successfully');
				res.status(200).json({msg:"deleted successfully..."});
			});
		});
*/

//		var query = Contact.findOneAndUpdate({"req_email":req.body.req_email, "rcv_email":req.body.rcv_email}, {$set:{"status":status, "rcv_msg":req.body.rcv_msg}}, {upsert:false, new:true}, function(err, updatedContact){
		var query = Contact.findOneAndUpdate({"_id":req.body.id}, {$set:{"status":status, "rcv_msg":req.body.rcv_msg}}, {upsert:false, new:true}, function(err, updatedContact){
			if(err) {
				logger.error(req, err);
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else if(updatedContact==null) {
				logger.error(req, "No data found....");
				return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
			}

//			updatedContact = setDateInfo(updatedContact);

			logger.info(req, "[UPDATE DATA]"+updatedContact);

			return res.status(200).json(updatedContact);
		});
	});
};
