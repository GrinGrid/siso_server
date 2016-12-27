var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Testimonial = mongoose.model('Testimonial');
var Testimonial_History = mongoose.model('Testimonial_History');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/wlogger');


exports.getTestimonialListByEmail = function(req, res){

	logger.info('Try to find testimonials for ['+req.params.email+"]");
    
	var query = Testimonial.find({"email":req.params.email}, null, {"sort":{"sys_reg_date":-1}}, function(err, result){
                if(err){
			logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                } else if(result==null){
			logger.error("No testimonial for ["+req.params.email+"] found...");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
                } else if(result.length==0){
			logger.error("No testimonial for ["+req.params.email+"] found...");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
                }

                logger.info('Try to find all users - finish');

		for (var i=0;i<result.length;i++)
			result[i].reg_date = result[i].sys_reg_date.getTime();

                return res.status(200).json(result);
	});
};


exports.writeTestimonial = function(req, res){

	logger.info('[writeTestimonial Writing...]');  
	logger.info(JSON.stringify(req.body));  

	//find a user in mongo with provided username
	Testimonial.findOne({ 'email' :  req.body.email, 'writer_email': req.body.writer_email }, function(err, testimonial) {
	//In case of any error, return using the done method
		if (err){
			logger.error(err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		//already exists
		if (testimonial) {
			logger.error('Testimonial already exists...: '+req.body.email);
	                return res.status(500).json(custMsg.getMsg("ID_EXIST"));
		} else {
			var newTestimonial = new Testimonial();
	
			newTestimonial.email = req.body.email;
			newTestimonial.writer_email = req.body.writer_email;
			newTestimonial.writer_name = req.body.writer_name;
			newTestimonial.content = req.body.content;
			newTestimonial.reg_date = "";
			newTestimonial.sys_reg_date = Date.now();
	
			//save the user
			newTestimonial.save(function(err) {
				if (err){
					logger.error(err);
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				}

				logger.info(newTestimonial.writer_email + ' writes testimonial succesfully...');

				updateTestimonialCount(req.body.email, "add");

				return res.status(200).json({msg:"Success"});

			});

		}
	});
};

exports.updateTestimonial = function( req, res) {

	logger.info('[Testimonial update]');  

	logger.info(JSON.stringify(req.body));  

/*
	//find a user in mongo with provided username
	Testimonial.findOne({'email': req.body.email, 'writer_email': req.body.writer_email }, function(err, testimonial) {
	//In case of any error, return using the done method
		if (err){
			logger.error(err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		//already exists
		if (testimonial==null) {
			logger.error('Testimonial request does not exist...: '+req.body.email);
	                return res.status(500).json(custMsg.getMsg("ID_EXIST"));
		} else {
*/

			var query = Testimonial.findOneAndUpdate({"email":req.body.email, "writer_email":req.body.writer_email}, {$set:{"status":status, "writer_msg":req.body.writer_msg, "sys_writer_date":Date.now(), "sys_last_update":Date.now()}}, {upsert:false, new:true}, function(err, updatedTestimonial){
				if(err) {
		                	logger.error(err);
		                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} else if(updatedTestimonial==null) {
					logger.error("No data found....");
		                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
				}

//				updatedTestimonial = setDateInfo(updatedTestimonial);

		                logger.info("[UPDATE DATA]"+updatedTestimonial);

			        //res.status(200).json({msg:"updated successfully..."});
			        return res.status(200).json(updatedTestimonial);
			});
/*
		};
	});
*/
};

exports.deleteTestimonial = function(req, res){

	logger.info('[Testimonial reject]');  
	logger.info(JSON.stringify(req.body));  

	Testimonial.findOne({'email': req.body.email, 'writer_email': req.body.writer_email }, function(err, testimonial) {

		if(err) {
                	logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(testimonial==null) {
			logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info("[TESTIMONIAL INFO]"+testimonial);

		var testimonialHistory = new Testimonial_History();

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

			logger.info('Testimonial information copied for backup successfully');

			var query = Testimonial.remove({'email': req.body.email, 'writer_email': req.body.writer_email}, function(err) {

				if (err) {
					logger.error(err);
					return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} 
				logger.info('Testimonial information deleted successfully');

				updateTestimonialCount(req.body.email, "reduce");

				res.status(200).json({msg:"deleted successfully..."});
			});
		});
	});
};


var updateTestimonialCount = function(email, gubun) {

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
