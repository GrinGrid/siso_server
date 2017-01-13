var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Favorite = mongoose.model('Favorite');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/appLogger');

exports.addFavorite = function(req, res){

        logger.info(req, "[관심 시터/부모 추가]");

        if (req.body.email==null || req.body.email==undefined || req.body.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.body.favorite_email==null || req.body.favorite_email==undefined || req.body.favorite_email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        logger.info(req, "관심 시터/부모 추가 대상 : " + req.body.favorite_email);

	//find a user in mongo with provided username
	Favorite.findOne({ 'email' :  req.body.email, 'favorite_email': req.body.favorite_email }, function(err, favorite) {
	//In case of any error, return using the done method
		if (err){
			logger.error(req, "관심 시터/부모 조회시 오류 - " + err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		//already exists
		if (favorite) {
			logger.error(req, "이미 관심 시터/부모로 등록되어 있는 회원입니다.");
	                return res.status(500).json(custMsg.getMsg("FAVORITE_EXIST"));
		} else {
			var newFavorite = new Favorite();
	
			newFavorite.email = req.body.email;
			newFavorite.favorite_email = req.body.favorite_email;
			newFavorite.reg_date = "";
			newFavorite.sys_reg_date = Date.now();
	
			//save the user
			newFavorite.save(function(err) {
				if (err){
					logger.error(req, "관심 시터/부모 등록시 오류 - " + err);
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				}

				logger.info(req, "관심 시터/부모 등록 완료 : " + newFavorite.favorite_email);
	                	return res.status(200).json(custMsg.getMsg("SUCCESS"));

			});

		}
	});
};

exports.removeFavorite = function(req, res){

        logger.info(req, "[관심 시터/부모 삭제]");

        if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.params.favorite_email==null || req.params.favorite_email==undefined || req.params.favorite_email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        logger.info(req, "관심 시터/부모 삭제 대상 : " + req.params.favorite_email);

	Favorite.findOne({'email': req.params.email, 'favorite_email': req.params.favorite_email }, function(err, favorite) {

		if(err) {
                	logger.error(req, "관심 시터/부모 삭제를 위한 조회중 오류 - " + err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(favorite==null) {
			logger.error(req, "관심 시터/부모 삭제대상이 없습니다.");
                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		var query = Favorite.remove({'email': req.params.email, 'favorite_email': req.params.favorite_email}, function(err) {

			if (err) {
				logger.error(req, "관심 시터/부모 삭제시 오류 - " + err);
				return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info(req, "관심 시터/부모 삭제 완료 : " + req.params.favorite_email);
	                return res.status(200).json(custMsg.getMsg("SUCCESS"));
		});
	});
};
