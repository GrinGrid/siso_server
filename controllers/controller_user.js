var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var User_History = mongoose.model('User_History');
var Contact = mongoose.model('Contact');
var Favorite = mongoose.model('Favorite');
var Testimonial = mongoose.model('Testimonial');
var bCrypt = require('bcrypt-nodejs');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/wlogger');


exports.signupUser = function(req, res, passport, next){

	logger.info('[User Registration]');  
	logger.info(JSON.stringify(req.body));  

	//find a user in mongo with provided username
	User.findOne({ 'personal_info.email' :  req.body.personal_info.email }, function(err, user) {
	//In case of any error, return using the done method
		if (err){
			logger.error('Error in SignUp: '+err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
//			return done(err);
		}
		//already exists
		if (user) {
			logger.error('Email already exists with username: '+req.body.personal_info.email);
	                return res.status(500).json(custMsg.getMsg("ID_EXIST"));
//			return done(null, false, "ID_EXIST");
//			return done(null, false);
		} else {
			var org_email =  req.body.personal_info.email;
			var org_passwd =  req.body.personal_info.passwd;

//					var newUser = userController.registUser(req);
//					return done(null, newUser);

					//if there is no user, create the user
			var newUser = new User();

	
					//set the user's local credential
/*
					newUser.personal_info.email = req.body.email;
					newUser.personal_info.passwd = createHash(req.body.passwd);
					newUser.personal_info.name = req.body.name;
					newUser.personal_info.birth_date = req.body.birth_date;
					newUser.personal_info.phone = req.body.phone;
					newUser.personal_info.addr1 = req.body.addr1;
					newUser.personal_info.addr2 = req.body.addr2;
					newUser.personal_info.post_no = req.body.post_no;
					newUser.personal_info.lng = req.body.lng;
					newUser.personal_info.lat = req.body.lat;
					newUser.personal_info.user_type = req.body.user_type;
//					newUser.personal_info.reg_date = req.body.reg_date;
//					newUser.personal_info.last_login = req.body.last_login;
					newUser.personal_info.push_id = req.body.push_id;
*/
			newUser.personal_info = req.body.personal_info;
			newUser.personal_info.passwd = createHash(req.body.personal_info.passwd);

			newUser.sys_info.sys_status = "active";
			newUser.sys_info.sys_reg_date = Date.now();
			newUser.sys_info.sys_last_login = Date.now();
	
			//save the user
			newUser.save(function(err) {
				if (err){
					logger.error('Error in Saving user: '+err);  
					logger.error('Registration failed : '+req.body.personal_info.email);
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
//					return done(null, false, "SYS_ERROR");
//					throw err;  
				}

				logger.info(newUser.personal_info.email + ' Registration succesful');

				var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

				redisc.on('error', function(err) {
					logger.error('Error ' + err);
				});

				var geo = require('georedis').initialize(redisc, {nativeGeo: true});

				var parents = geo.addSet('parents')
				var sitters = geo.addSet('sitters')

				logger.info('adding people:'+newUser.personal_info.email+', '+newUser.personal_info.lat+', '+newUser.personal_info.lng+', '+newUser.personal_info.addr1+'....')

				if (newUser.personal_info.user_type==1)
					sitters.addLocation( newUser.personal_info.email, {latitude: newUser.personal_info.lat, longitude: newUser.personal_info.lng}, function(err, reply){
						if(err) {
							logger.error(err)
							return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
						} else logger.info('Sitter added :', reply)
					});
				else
					parents.addLocation( newUser.personal_info.email, {latitude: newUser.personal_info.lat, longitude: newUser.personal_info.lng}, function(err, reply){
						if(err) {
							logger.error(err)
							return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
						} else logger.info('Parent added :', reply)
					});

//				redisc.quit();

				req.body.email = org_email;
				req.body.passwd = org_passwd;

				return login(req, res, passport, next);
//						return done(null, newUser);
			});

		}
	});
/*
	passport.authenticate('signup', { session: false }, function(err, user, info) {
		if (err) {
                	logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		}
		if (!user) {
			if (info==null) {
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else {
				return res.status(500).send(custMsg.getMsg(info));
			}
		}

		return res.set("session-key",info).status(200).send(user.personal_info);

	})(req, res, next);
*/
};

exports.loginUser = function(req, res, passport, next){

	return login(req, res, passport, next);

};

exports.logoutUser = function(req, res){

	var username = req.body.email;
	logger.info('Logout from user : ' + username);

        var redisc = redis.createClient(6379, '127.0.0.1');     //connect to Redis

        redisc.on('error', function(err) {
		logger.error("Error occured while processing logout...");
                logger.error(err);
		return res.status(200).send({msg:"Logged out successfully..."});
        });

        var headers = req.headers;
        var session_hash = headers['session-key'];

        logger.info('session_hash ' + session_hash);

	if(session_hash==undefined || session_hash==null) {
		logger.error("No session info for " + username);
		return res.status(200).send({msg:"Logged out successfully..."});
	}

	redisc.hgetall(session_hash, function (err, obj) {
		if (err) {
			logger.error("Error occured while processing logout...");
			logger.error(err);
			return res.status(200).send({msg:"Logged out successfully..."});
		} else if(obj==undefined || obj==null) {
			logger.error("No hash value matches " + username);
			return res.status(200).send({msg:"Logged out successfully..."});
		} else {
//			var username = obj.email;
	       	 	redisc.expire(session_hash, 0); // Key expires right now
			logger.info('Logout success : ' + username + " has logged out...");
			return res.status(200).send({msg:"Logged out successfully..."});
		}
	});

        //redisc.quit();
}

exports.getUsers = function(req, res){

	logger.info('Try to find all users - start');
    
	var query = User.find(function(err, users){
                if(err){
			logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                }

                logger.info('Try to find all users - finish');
                return res.status(200).json(users[0]);
	});
};

exports.findEmailByUserInfo = function(req, res){

	var name = req.body.name;
	var phone = req.body.phone;

	logger.info('Try to find email for user : ' + name);

	var query = User.findOne({"personal_info.name":name, "personal_info.phone":phone}, function(err, user){
		if(err) {
                	logger.error(err);
	                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
                	logger.error("There is no email for : " + name);
	                return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		} else
                	logger.info("Email found... User : " + name + ", Email : " +  user.personal_info.email);
	                return res.status(200).send({email: user.personal_info.email});

	});
};


exports.sendEmailToSetPassword = function(req, res){

	var email = req.body.email;

	logger.info('Try to find email for user : ' + email);

	var query = User.findOne({"personal_info.email":email}, function(err, user){
		if(err) {
                	logger.error(err);
	                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
                	logger.error("There is no email for : " + email);
	                return res.status(500).send(custMsg.getMsg("ID_NOT_EXIST"));
		} else {
                	logger.info("Email found... User : " + email + ", Email : " +  user.personal_info.email);

			var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

			redisc.on('error', function(err) {
				logger.error('Error ' + err);
		                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			});

			var today = (new Date()).getDate();
		        var prefix = "pwd.";
		        var hashKey = createHash(today);

		        logger.info('hashKey : ' + hashKey);
		        hashKey = prefix + hashKey.replace(/\//g,"");

		        logger.info('hashKey : ' + hashKey);

		        redisc.hmset(hashKey, {
		                "email" : user.personal_info.email
		        }, redis.print);

		        redisc.expire(hashKey, 86400); // Key expires after 3 minutes

			var nodemailer = require('nodemailer');

			var smtpConfig = {
                            host: 'smtp.worksmobile.com',
                            port: 465,
                            secure: true, // use SSL
                            auth: {
                                user: 'siso@gringrid.net',
                                pass: 'siso@2016'
                            }
                        };

			var smtpTransport = nodemailer.createTransport(smtpConfig);

			var strHtml = '<h1>비밀번호를 분실하셔서 당황하셨죠?</h1>'
			strHtml += '<a href="http://siso4u.net/user/set_password/'+hashKey+'">여기</a>를 눌러서 비밀번호를 초기화하세요.'

			var mailOptions = {
				from: '시소 고객센터<siso@gringrid.net>',
				to: user.personal_info.email,
				subject: '비밀번호 재설정을 위한 메일입니다.',
//				text: '',
				html: strHtml
			};

			smtpTransport.sendMail(mailOptions, function(err, response){
				if (err){
					logger.error(err);
					smtpTransport.close();
	                		return res.status(500).send(custmsg.getMsg("EMAIL_FAIL"));
				} else {
					logger.info("Message sent : " + response.message);
					smtpTransport.close();
			                return res.status(200).json({msg:"비밀번호설정을 위한 이메일이 성공적으로 발송되었습니다."});
				}
			});

		}
	});
};


exports.setPassword = function(req, res) {

	var hashKey = req.params.hashkey;

	var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

                redisc.on('error', function(err) {
                        logger.error('Error ' + err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                });

                redisc.hget(hashKey, "email", function(err, value) {
                        if (err) {
                                redisc.quit();
                                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                        }
                        logger.info("hashKey : " + hashKey);
                        logger.info("email : " + value);

                        if ( value == null || value == "" ) {
                                logger.error('no matching hashKey value');
                                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                        }

                        logger.info("email : " + value);
                        logger.info('API Authentication - finish');
                        redisc.quit();

                	res.render('set_password', { title: 'Hey', message: 'Hello there!', email:value, hashkey:hashKey});
                });
}

exports.updatePassword = function(req, res){

	var username = req.body.email;
	var passwd = req.body.passwd;
	var hashKey = req.body.hashkey;

	if ( passwd == null || passwd.length < 8 ) {
		return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
	} else
		passwd = createHash(passwd);

	logger.info('Updating user password : ' + username);
	logger.info('Updating user password : ' + hashKey);

	var query = User.findOne({"personal_info.email":username}, function(err, user){
		if(err) {
                	logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info("[PERSONAL INFO]"+user.personal_info);

		var userHistory = new User_History();

		if (userHistory.sys_info != null)
			userHistory.sys_info = user.sys_info;
		if (userHistory.personal_info != null)
			userHistory.personal_info = user.personal_info;
		if (userHistory.sitter_info != null)
			userHistory.sitter_info = user.sitter_info;
		if (userHistory.parent_info != null)
			userHistory.parent_info = user.parent_info;

		userHistory.sys_info.sysStatus = "setpwd";

		userHistory.save(function(err, user){
			if (err) {
	                	logger.error(err);
//	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else 
				logger.info('User information copied for backup successfully : ' + username);


			var query = User.findOneAndUpdate({"personal_info.email":username}, {$set:{"personal_info.passwd":passwd}}, {upsert:false, new:true}, function(err, updatedUser){
				if(err) {
		                	logger.error(err);
		                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} else if(updatedUser==null) {
					logger.error("No data found....");
		                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
				}

				var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

				redisc.on('error', function(err) {
					logger.error('Error ' + err);
//		                	return res.json(500, custMsg.getMsg("SYS_ERROR"));
				});

	       	 		redisc.expire(hashKey, 0); // Key expires after 24 hours

				updatedUser = setDateInfo(updatedUser);

		                logger.info("[UPDATE DATA]"+updatedUser);

				logger.info('User information updated successfully : ' + username);
			        //res.status(200).json({msg:"updated successfully..."});
			        return res.status(200).send(updatedUser);
			});
		});
	});

};


exports.checkUserByEmail = function(req, res){

	logger.info("Check if there exists an email - " + req.params.email);

	var query = User.findOne({"personal_info.email":req.params.email}, function(err, user){
		if(err) {
                	logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
                	logger.info("You can use this email as your account");
	                return res.status(200).json({msg: "You can use this email as your account"});
		} else
                	logger.error(custMsg.getMsg("ID_EXIST"));
//	                return res.send("status(500).send(custMsg.getMsg("ID_EXIST"));
			return res.status(500).send(custMsg.getMsg("ID_EXIST"));

	});
};

exports.getUserByEmail = function(req, res){

	logger.info('Try to find a certain user for a given email - ' + req.params.email);

	var query = User.findOne({"personal_info.email":req.params.email}, function(err, user){
                logger.info('Try to find all users - finish');
		if(err) {
                	logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error("No data found....");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info(""+user);
		res.status(200).json(user);
	});
};

exports.updateUserByEmail = function(req, res){

	var username = req.body.personal_info.email;
	logger.info('Updating user information : ' + JSON.stringify(req.body) + "");
	logger.info('Updating user information : ' + username);

	var query = User.findOne({"personal_info.email":username}, function(err, user){
		if(err) {
                	logger.error(err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error("No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info("[PERSONAL INFO]"+user.personal_info);

		var userHistory = new User_History();

		if (userHistory.sys_info != null)
			userHistory.sys_info = user.sys_info;
		if (userHistory.personal_info != null)
			userHistory.personal_info = user.personal_info;
		if (userHistory.sitter_info != null)
			userHistory.sitter_info = user.sitter_info;
		if (userHistory.parent_info != null)
			userHistory.parent_info = user.parent_info;

		userHistory.sys_info.sysStatus = "modify";

		userHistory.save(function(err, user){
			if (err) {
	                	logger.error(err);
	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info('User information copied for backup successfully : ' + username);

			var query = User.findOneAndUpdate({"personal_info.email":username}, {$set:req.body}, {upsert:true, new:true}, function(err, updatedUser){
				if(err) {
		                	logger.error(err);
		                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} else if(updatedUser==null) {
					logger.error("No data found....");
		                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
				}

				updatedUser = setDateInfo(updatedUser);

		                logger.info("[UPDATE DATA]"+updatedUser);

				logger.info('User information updated successfully : ' + username);
			        //res.status(200).json({msg:"updated successfully..."});
			        return res.status(200).send(updatedUser);
			});
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

exports.removeUserByEmail = function(req, res){

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

                logger.info("[PERSONAL INFO]"+user.personal_info);

		var userHistory = new User_History();

		if (userHistory.sys_info != null)
			userHistory.sys_info = user.sys_info;
		if (userHistory.personal_info != null)
			userHistory.personal_info = user.personal_info;
		if (userHistory.sitter_info != null)
			userHistory.sitter_info = user.sitter_info;
		if (userHistory.parent_info != null)
			userHistory.parent_info = user.parent_info;

		userHistory.sys_info.sysStatus = "remove";

		userHistory.save(function(err, user){

			if (err) {
	                	logger.error(err);
	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info('User information copied for backup successfully : ' + username);

			var query = User.remove({"personal_info.email":username}, function(err) {

				if (err) {
					logger.error(err);
					return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} 
				logger.info('User information deleted successfully : ' + username);
				res.status(200).json({msg:"deleted successfully..."});
			});
		});
	});
};

exports.getSitterByEmail = function(req, res){
	getUserDetailByEmail(req, res);
};

exports.getSitterByEmail = function(req, res){
	getUserDetailByEmail(req, res);
};

var getUserDetailByEmail = function(req, res){

	logger.info('Try to find a certain user for a given email - ' + req.params.email);

	var allEmail =[req.params.email, req.params.trg_email];

	var query = User.find({"personal_info.email":{"$in":allEmail}}, function(err, users){
                logger.info('Try to find all users - finish');
		if(err) {
                	logger.error(err);
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(users==null) {
			logger.error("No data found....");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		} else if(users.length<2) {
			logger.error("No data found....");
			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

		logger.info('Try to find a certain user for a given email - ' + req.params.email);

		query = Contact.findOne({"req_email":{"$in":allEmail}, "rcv_email":{"$in":allEmail}}, function(err, contact){
	       	         logger.info('Try to find all users - finish');
			if(err) {
       		         	logger.error(err);
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else if(contact==null) {
				logger.error("No contact found....");
			}
       			         	logger.info("contact["+contact+"]");

			query = Favorite.findOne({"email":req.params.email, "favorite_email":req.params.trg_email}, function(err, favorite){
		       	         logger.info('Try to find all users - finish');
				if(err) {
       			         	logger.error(err);
//					return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} else if(favorite==null) {
					logger.error("No favorite found....");
//					return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
				}


        			query = Testimonial.find({"email":req.params.trg_email}, null, {"sort":{"sys_reg_date":-1}}, function(err, testimonials){
			                if(err){
			                        logger.error(err);
			                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			                } else if(testimonials==null){
			                        logger.error("No testimonial for ["+req.params.trg_email+"] found...");
			                } else if(testimonials.length==0){
			                        logger.error("No testimonial for ["+req.params.trg_email+"] found...");
			                }

			                for (var i=0;i<testimonials.length;i++)
			                        testimonials[i].reg_date = testimonials[i].sys_reg_date.getTime();

					var userDetail = {
						user:(users[0].personal_info.email==req.params.trg_email)?users[0]:users[1],
						distance:getDistance(users[0].personal_info.lat, users[0].personal_info.lng, users[1].personal_info.lat, users[1].personal_info.lng),
						contactReq:(contact==null)?"":contact.req_email,
						contactStatus:(contact==null)?9:contact.status,
						favorite:(favorite==null)?"N":"Y",
						testimonial:testimonials
					}

					res.status(200).json(userDetail);
			        });
			});
		});
	});
};

var login = function(req, res, passport, next) {

	passport.authenticate('login', { session: false }, function(err, user, info) {
		if (err) {
			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		}
		if (!user) {
			if (info==null) {
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else {
				return res.status(500).send(custMsg.getMsg(info));
			}
		}
    
    // 2016년 09월 19일 (월) 오후 01시 41분 57초
    // What the... 회원가입한 다음 로그인은 이 로직을 탄다... 
    // user.personal_info 를 user로 바꾼다. 
		//return res.set("session-key",info).status(200).send(user.personal_info);
		//
//		user.personal_info.lastLogin = user.personal_info.lastLogin.getTime();
//		user.personal_info.reg_date = user.personal_info.reg_date.getTime();
//		logger.info('[lastLogin]'+user.personal_info.last_login.getTime());

		user = setDateInfo(user);

		logger.info('[controller_user login success]');
		logger.info(JSON.stringify(user));
		return res.set("session-key",info).status(200).send(user);

/*
req.logIn(user, function(err) {
if (err) { return next(err); }
return res.redirect('/users/' + user.username);
});
*/
	})(req, res, next);
}

var setDateInfo = function(user){

	user.personal_info.reg_date = user.sys_info.sys_reg_date.getTime();
	user.personal_info.last_login = user.sys_info.sys_last_login.getTime();

	return user;
}

function getDistance(lat1, lon1, lat2, lon2)
{
        var R = 6371; // km
        var dLat = toRad(lat2-lat1);
        var dLon = toRad(lon2-lon1);
        var lat1 = toRad(lat1);
        var lat2 = toRad(lat2);

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;
        return d;
}

function toRad(Value)
{
        return Value * Math.PI / 180;
}

//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
