var mongoose = require( 'mongoose' );
var fs = require('fs');

var User = mongoose.model('User');
var User_History = mongoose.model('User_History');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/wlogger');


exports.uploadImage = function(req, res){

	var username = req.body.email;

	logger.info('Uploading an image of user : ' + username);

	var query = User.findOne({"personal_info.email":username}, function(err, user){
		if(err) {
                	logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info("[PERSONAL INFO]"+user.personal_info);

/*
		var userHistory = new User_History();

		if (userHistory.sys_info != null)
			userHistory.sys_info = user.sys_info;
		if (userHistory.personal_info != null)
			userHistory.personal_info = user.personal_info;
		if (userHistory.sitter_info != null)
			userHistory.sitter_info = user.sitter_info;
		if (userHistory.parent_info != null)
			userHistory.parent_info = user.parent_info;

		userHistory.sys_info.sys_status = "modify";

		userHistory.save(function(err, user){
			if (err) {
	                	logger.error(err);
	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info('User information copied for backup successfully : ' + username);
		});
*/


		var file = req.files.file;
		var gubun = req.body.gubun; // "prf" or "id"

		if (gubun==null || gubun =="") gubun = "prf";
    
		var orgImagePath = file.path;

		logger.log("tmpFile : ", orgImagePath);

		var extType = (orgImagePath.split("."))[(orgImagePath.split(".")).length-1];

		logger.log("expType : ", extType);

		var relImgPath = "images/" + gubun + "/";
		var imageDir = '/var/src/siso/public/' + relImgPath;

		var imagePath = imageDir + username + "." +extType;
		var imageURL = 'http://siso4u.net/' + relImgPath + username + "." +extType;
    
		logger.info("DIR : "+imageDir);
		logger.info("PATH : "+imagePath);
		logger.info("URL : "+imageURL);

		if ( !fs.existsSync(imageDir) ){
			logger.info('ImageDir not exists');
			fs.mkdirSync(imageDir, function(err){
				if ( err ) {
					logger.error(err.stack);
					return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				}
			});
		}

		fs.rename(orgImagePath, imagePath, function(err){
			if ( err ) {
				logger.error(err.stack);
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else {

				fs.unlink(orgImagePath, function(err){
					if ( err )
						logger.error(err.stack);
				});

				var imgField = new Object;
				 imgField["image_info."+gubun+"_img_url"]=imageURL;
				logger.info("img_field : "+imgField);

				var query = User.findOneAndUpdate({"personal_info.email":username}, {$set:imgField}, {upsert:true, new:true}, function(err, updatedUser){
					if(err) {
			                	logger.error(err);
			                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
					} else if(updatedUser==null) {
						logger.error("No data found....");
			                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
					}

			                logger.info("[UPDATE DATA]"+updatedUser);

					logger.info('User information updated successfully : ' + username);
					return res.status(200).json(updatedUser.image_info);
				});
			}
		});

	});

};

/*
exports.updateUserByEmailBakcup = function(req, res){

	var username = req.body.personal_info.email;
	logger.info('Updating user information : ' + username);

	var query = User.findOne({"personal_info.email":username}, function(err, user){
		if(err) {
                	logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info(""+user.personal_info);

		user.created_by = req.body.created_by;
		user.text = req.body.text;

		user.save(function(err, user){
			if (err) {
	                	logger.error(err);
	                        return res.status(500).custMsg.getMsg("SYS_ERROR");
			} 
			logger.info('User information updated successfully : ' + username);
	                res.status(200).send({msg:"deleted successfully..."});
		});
	});
};
*/

