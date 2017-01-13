var mongoose = require( 'mongoose' );
var fs = require('fs');

var User = mongoose.model('User');
var User_History = mongoose.model('User_History');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/appLogger');

exports.uploadImage = function(req, res){

        logger.info(req, "[사진 올리기]");

        if (req.body.email==null || req.body.email==undefined || req.body.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }
        if (req.body.gubun==null || req.body.gubun==undefined || req.body.gubun=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	var email = req.body.email;

	var query = User.findOne({"personal_info.email":email}, function(err, user){
		if(err) {
                	logger.error(req, err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "해당 유저 정보가 존재하지 않습니다.");
                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		var file = req.files.file;
		var gubun = req.body.gubun; // "prf" or "id"

		if (gubun==null || gubun =="") gubun = "prf";
    
		var orgImagePath = file.path;

//		logger.info(req, "임시파일 : ", orgImagePath);

		var extType = (orgImagePath.split("."))[(orgImagePath.split(".")).length-1];

		var relImgPath = "images/" + gubun + "/";
		var imageDir = __dirname + "/../public/" + relImgPath;

		var imagePath = imageDir + email + "." +extType;
		var imageURL = relImgPath + email + "." +extType; 
		logger.info(req, "DIR : "+imageDir);
		logger.info(req, "PATH : "+imagePath);
		logger.info(req, "URL : "+imageURL);

		if ( !fs.existsSync(imageDir) ){
			logger.info(req, "디렉토리가 존재하지 않습니다.");
			fs.mkdirSync(imageDir, function(err){
				if ( err ) {
					logger.error(req, err.stack);
					return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				}
			});
		}

		fs.rename(orgImagePath, imagePath, function(err){
			if ( err ) {
				logger.error(req, err.stack);
				return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			} else {
				fs.unlink(orgImagePath, function(err){
					if ( err )
						logger.error(req, err.stack);
				});

				var imgField = new Object;
				imgField["image_info."+gubun+"_img_url"]=imageURL;

				var query = User.findOneAndUpdate({"personal_info.email":email}, {$set:imgField}, {upsert:true, new:true}, function(err, updatedUser){
					if(err) {
			                	logger.error(req, err);
			                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
					} else if(updatedUser==null) {
						logger.error(req, "이미지 정보를 업데이트할 이용자 정보가 없습니다.");
			                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
					}

					logger.info(req, "이미지 업데이트 완료");
					return res.status(200).json(updatedUser.image_info);
				});
			}
		});
	});
};
