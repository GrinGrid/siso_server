var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Favorite = mongoose.model('Favorite');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/wlogger');


exports.getFavorite = function(req, res){

	logger.info('Try to find all users - start');
    
	var query = User.find(function(err, users){
                if(err){
			logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                }

                logger.info('Try to find all users - finish');
                return res.status(200).json(users);
	});
};


exports.addFavorite = function(req, res){

	logger.info('[Favorite Add]');  
	logger.info(JSON.stringify(req.body));  

	//find a user in mongo with provided username
	Favorite.findOne({ 'email' :  req.body.email, 'favorite_email': req.body.favorite_email }, function(err, favorite) {
	//In case of any error, return using the done method
		if (err){
			logger.error(err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		//already exists
		if (favorite) {
			logger.error('Favorite request already exists...: '+req.body.email);
	                return res.status(500).json(custMsg.getMsg("ID_EXIST"));
		} else {
			var newFavorite = new Favorite();
	
			newFavorite.email = req.body.email;
			newFavorite.favorite_email = req.body.favorite_email;
			newFavorite.reg_date = "";
			newFavorite.sys_reg_date = Date.now();
	
			//save the user
			newFavorite.save(function(err) {
				if (err){
					logger.error(err);
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				}

				logger.info(newFavorite.req_email + ' requested favorite succesfully...');
				return res.status(200).json({msg:"Success"});

			});

		}
	});
};

exports.removeFavorite = function(req, res){

	logger.info('[Favorite remove]');  
//	logger.info(JSON.stringify(req.body));  

	Favorite.findOne({'email': req.params.email, 'favorite_email': req.params.fav_email }, function(err, favorite) {

		if(err) {
                	logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(favorite==null) {
			logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info("[CONTACT INFO]"+favorite);

		var query = Favorite.remove({'email': req.params.email, 'favorite_email': req.params.fav_email}, function(err) {

			if (err) {
				logger.error(err);
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info('Favorite information deleted successfully');
			res.status(200).json({msg:"deleted successfully..."});
		
		});
	});
};
