var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var User_Status = mongoose.model('User_Status');
var User_History = mongoose.model('User_History');
var Contact = mongoose.model('Contact');
var Favorite = mongoose.model('Favorite');
var Testimonial = mongoose.model('Testimonial');
var bCrypt = require('bcrypt-nodejs');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/appLogger');
var util = require('../lib/util');

// 회원가입
exports.signupUser = function(req, res, passport, next){

	logger.info(req, "[회원가입 시작]");  

	// 유저정보 체크
	var userCheckError = validateUserData(req, req.body, "SIGNUP");
	if (userCheckError != null) {
		return res.status(500).json(userCheckError);
	}

	// 유저가 이미 존재하는지 확인
	User.findOne({ 'personal_info.email' :  req.body.personal_info.email }, function(err, user) {
	//In case of any error, return using the done method
		if (err){
			logger.error(req, "회원가입 중 DB 오류 : "+err);
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		// 이미 존재하는 경우
		if (user) {
			logger.error(req, "해당 이메일이 이미 존재합니다." +req.body.personal_info.email);
	                return res.status(500).json(custMsg.getMsg("ID_EXIST"));
		} else {

			// 가입 후 로그인 처리를 위해 이메일과 비밀번호를 저장
			var org_email =  req.body.personal_info.email;
			var org_passwd =  req.body.personal_info.passwd;

			var newUser = new User();

			newUser.personal_info = req.body.personal_info;
			newUser.personal_info.passwd = createHash(req.body.personal_info.passwd);
			newUser.personal_info.status = "00"; // 회원가입 상태코드

			newUser.sys_info.sys_status = "active";
			newUser.sys_info.sys_reg_date = Date.now();
			newUser.sys_info.sys_last_login = Date.now();
	
			//save the user
			newUser.save(function(err) {
				if (err){
					logger.error(req, "회원가입 실패 : "+req.body.personal_info.email);
					logger.error(req, "회원정보 저장중 오류발생 : "+err);  
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				}

				logger.info(req, newUser.personal_info.email + " 사용자의 가입 정보가 정상적으로 저장되었습니다.");

				req.body.email = org_email;
				req.body.passwd = org_passwd;

				// 가입직후 로그인 처리
				return login("first", req, res, passport, next);
			});

		}
	});
};

// 유저 로그인
exports.loginUser = function(req, res, passport, next){
	return login("first", req, res, passport, next);
};

// 유저 재로그인 - 암호화된 비밀번호 사용
exports.reloginUser = function(req, res, passport, next){
	return login("relogin", req, res, passport, next);
};

exports.logoutUser = function(req, res){

	logger.info(req, "[로그아웃]");  

	if (req.body.email==null || req.body.email==undefined || req.body.email=="") {
		logger.error(req, JSON.stringify(custMsg.getMsg("LOGOUT_EMAIL_ERR")));
		return res.status(500).json(custMsg.getMsg("LOGOUT_EMAIL_ERR"));
	}

	var username = req.body.email;

        var redisc = redis.createClient(6379, '127.0.0.1');     //connect to Redis

        redisc.on('error', function(err) {
		logger.error(req, "레디스 오류 발생");
                logger.error(req, err);
		redisc.quit();
		return res.status(200).json(custMsg.getMsg("SUCCESS"));
        });

        var headers = req.headers;
        var session_hash = headers['session-key'];

        logger.info(req, 'session_hash ' + session_hash);

	if(session_hash==undefined || session_hash==null) {
		logger.error(req, "사용자 헤더에 세션정보 미존재 [" + username + "]");
		redisc.quit();
		return res.status(200).json(custMsg.getMsg("SUCCESS"));
	}

	redisc.hgetall(session_hash, function (err, obj) {
		if (err) {
			logger.error(req, "레디스 검색중 오류 발생");
			logger.error(req, err);
		        redisc.quit();
			return res.status(200).json(custMsg.getMsg("SUCCESS"));
		} else if(obj==undefined || obj==null) {
			logger.error(req, "레디스에 해당 유저의 세션정보 미존재 [" + username + "]");
		        redisc.quit();
			return res.status(200).json(custMsg.getMsg("SUCCESS"));
		} else {
//			var username = obj.email;
	       	 	redisc.expire(session_hash, 0); // Key expires right now
			logger.info(req, "로그아웃 처리완료 : [" + username + "] 님이 로그아웃 하셨습니다.");
        		redisc.quit();
			return res.status(200).json(custMsg.getMsg("SUCCESS"));
		}
	});

}

exports.updateUserStatus = function(req, res){

	logger.info(req, "[사용자 상태변경]");  

	if (req.body.email==null || req.body.email==undefined || req.body.email=="") {
		logger.error(req, "이메일값 오류 : " + JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
		return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
	}
	if (req.body.action_type==null || req.body.action_type==undefined || req.body.action_type=="") {
		logger.error(req, "상태값 오류 : " + JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
		return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
	}

	var email = req.body.email;
	var action_type = req.body.action_type;
	var status_code = "";


	logger.info(req, "입력 : " + JSON.stringify(req.body) + "");

	var query = User.findOne({"personal_info.email":email}, function(err, user){
		if(err) {
                	logger.error(req, err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "변경할 사용자가 없습니다.");
                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		var user_type = user.personal_info.user_type; //0:부모, 1:시터

		//시터회원 정보입력 완료시
		if (action_type==00 && user_type==1)
			status_code = "10";
		//시터 승인 거부시
		else if (action_type==01)
			status_code = "11";
		//시터풀 만기 초과
		else if (action_type==03)
			status_code = "12";
		//부모회원 정보입력 완료시, 시터회원 승인 통과시, 회원 활동 재개시
		else if ((action_type==00 && user_type==0)||action_type==02||action_type==06)
			status_code = "20";
		//구인구직 완료로 인한 구인구직 활동 정시시
		else if (action_type==04)
			status_code = "30";
		//개인사정으로 인한 구인구직 활동 정지시
		else if (action_type==05)
			status_code = "31";
		//관리자 직권으로 인한 구인구직 활동 정지시
		else if (action_type==07)
			status_code = "32";
		else {
			logger.error(req, "상태값 오류 : " + JSON.stringify(custMsg.getMsg("NO_STATUS_CODE")));
                        return res.status(500).json(custMsg.getMsg("NO_STATUS_CODE"));
		}

		var userStatus = new User_Status();

		userStatus.email = email;
		userStatus.action_type = action_type;
		userStatus.content = req.body.content;
		userStatus.reg_date = "";
		userStatus.sys_reg_date = Date.now();

		userStatus.save(function(err, user_status){
			if (err) {
	                	logger.error(req, err);
	                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info(req, "유저 상태정보 저장 완료");

			var query = User.findOneAndUpdate({"personal_info.email":email}, {$set:{"personal_info.status":status_code}}, {upsert:true, new:true}, function(err, updatedUser){
				if(err) {
		                	logger.error(req, "유저정보 업데이트중 오류 : " + err);
		                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				} else if(updatedUser==null) {
		                	logger.error(req, "유저정보 업데이트중 오류 : 업데이트할 유저가 존재하지 않습니다.");
		                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
				}

				logger.info(req, "유저정보 업데이트 완료");

/*
03				12	승인대기-풀만기					시터		제거
00,02,06	APP/Admin	20	활동중			활동중			부모/시터	추가
04		APP		30	정지-구인구직완료	정지-구인구직완료	부모/시터	제거
05		APP		31	정지-개인사정		정지-개인사정		부모/시터 	제거
07		Admin		32	정지-관리자		정지-관리자		부모/시터 	제거
*/

				//REDIS 입력/삭제가 필요한 경우
				if ( status_code=="20" || status_code=="12" || status_code=="30" || status_code=="31" || status_code=="32") {
					var redis = require('redis');
					var redisc = redis.createClient(6379, '127.0.0.1');	//connect to Redis

					redisc.on('error', function(err) {
						logger.error(req, 'Error ' + err);
        					redisc.quit();
						return res.status(200).json(custMsg.getMsg("SUCCESS"));
					});

					var geo = require('georedis').initialize(redisc, {nativeGeo: true});

					var redisStr = util.getRedisStr(user, "MY");	
//logger.info(req, "[redisStr]"+redisStr);
					var redisSet = geo.addSet(redisStr);

					if (status_code=="20") { // REDIS 입력
						redisSet.addLocation( user.personal_info.email, {latitude: user.personal_info.lat, longitude: user.personal_info.lng}, function(err, reply){
							if(err) {
								logger.error(req, err)
								return res.status(200).json(custMsg.getMsg("SUCCESS"));
							} else {
								logger.info(req, redisStr + " 에 추가 : " + reply)
								return res.status(200).json(custMsg.getMsg("SUCCESS"));
							}
						})			
					} else { // REDIS 삭제 
						redisSet.removeLocation( user.personal_info.email, function(err, reply){
							if(err) {
								logger.error(req, err)
								return res.status(200).json(custMsg.getMsg("SUCCESS"));
							} else {
								logger.info(req, redisStr + " 에서 삭제 : " + reply)
								return res.status(200).json(custMsg.getMsg("SUCCESS"));
							}
						})			
					}
				} else
					return res.status(200).json(custMsg.getMsg("SUCCESS"));

			});
		});
	});

};

exports.getUsers = function(req, res){

	logger.info(req, 'Try to find all users - start');
    
	var query = User.find(function(err, users){
                if(err){
			logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
                }

                logger.info(req, 'Try to find all users - finish');
                return res.status(200).json(users[0]);
	});
};

exports.findEmailByUserInfo = function(req, res){

	logger.info(req, "[이메일 찾기]");  

	if (req.body.name==null || req.body.name==undefined || req.body.name=="") {
		logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
		return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
	}
	if (req.body.phone==null || req.body.phone==undefined || req.body.phone=="") {
		logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
		return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
	}

	var name = req.body.name;
	var phone = req.body.phone;

	logger.info(req, "이메일 찾기 위한 정보 [이름:" + name + "] [전화번호:" + phone + "]");

	var query = User.findOne({"personal_info.name":name, "personal_info.phone":phone}, function(err, user){

		if(err) {
			logger.error(req, "이메일 찾기 오류 : " + JSON.stringify(custMsg.getMsg("NO_STATUS_CODE")));
	                return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "이메일 찾기 오류 : " + JSON.stringify(custMsg.getMsg("NO_EMAIL_FOUND")));
	                return res.status(500).json(custMsg.getMsg("NO_EMAIL_FOUND"));
		} else
                	logger.info(req, "이메일 찾기 성공 - 사용자 : " + name + ", Email : " +  user.personal_info.email);
	                return res.status(200).json({email: user.personal_info.email});

	});
};


exports.sendEmailToSetPassword = function(req, res){

	var email = req.body.email;

	logger.info(req, 'Try to find email for user : ' + email);

	var query = User.findOne({"personal_info.email":email}, function(err, user){
		if(err) {
                	logger.error(req, err);
	                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
                	logger.error(req, "There is no email for : " + email);
	                return res.status(500).send(custMsg.getMsg("ID_NOT_EXIST"));
		} else {
                	logger.info(req, "Email found... User : " + email + ", Email : " +  user.personal_info.email);

			var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

			redisc.on('error', function(err) {
				logger.error(req, 'Error ' + err);
        			redisc.quit();
		                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			});

			var today = (new Date()).getDate();
		        var prefix = "pwd.";
		        var hashKey = createHash(today);

		        logger.info(req, 'hashKey : ' + hashKey);
		        hashKey = prefix + hashKey.replace(/\//g,"");

		        logger.info(req, 'hashKey : ' + hashKey);

		        redisc.hmset(hashKey, {
		                "email" : user.personal_info.email
		        }, redis.print);

		        redisc.expire(hashKey, 86400); // Key expires after 3 minutes
        		redisc.quit();

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
			strHtml += '<a href="https://siso4u.net/user/set_password/'+hashKey+'">여기</a>를 눌러서 비밀번호를 초기화하세요.'

			var mailOptions = {
				from: '시소 고객센터<siso@gringrid.net>',
//				to: "aejian35@gmail.com",
				to: user.personal_info.email,
				subject: '비밀번호 재설정을 위한 메일입니다.',
//				text: '',
				html: strHtml
			};

			smtpTransport.sendMail(mailOptions, function(err, response){
				if (err){
					logger.error(req, err);
					smtpTransport.close();
	                		return res.status(500).send(custmsg.getMsg("EMAIL_FAIL"));
				} else {
					logger.info(req, "Message sent : " + response.message);
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
                        logger.error(req, 'Error ' + err);
        		redisc.quit();
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                });

                redisc.hget(hashKey, "email", function(err, value) {
                        if (err) {
                                redisc.quit();
                                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                        }
                        logger.info(req, "hashKey : " + hashKey);
                        logger.info(req, "email : " + value);

                        if ( value == null || value == "" ) {
                                logger.error(req, 'no matching hashKey value');
        			redisc.quit();
                                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
                        }

                        logger.info(req, "email : " + value);
                        logger.info(req, 'API Authentication - finish');
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

	logger.info(req, 'Updating user password : ' + username);
	logger.info(req, 'Updating user password : ' + hashKey);

	var query = User.findOne({"personal_info.email":username}, function(err, user){
		if(err) {
                	logger.error(req, err);
                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "No data found....");
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info(req, "[PERSONAL INFO]"+user.personal_info);

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
	                	logger.error(req, err);
//	                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else 
				logger.info(req, 'User information copied for backup successfully : ' + username);


			var query = User.findOneAndUpdate({"personal_info.email":username}, {$set:{"personal_info.passwd":passwd}}, {upsert:false, new:true}, function(err, updatedUser){
				if(err) {
		                	logger.error(req, err);
		                        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} else if(updatedUser==null) {
					logger.error(req, "No data found....");
		                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
				}

				var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

				redisc.on('error', function(err) {
					logger.error(req, 'Error ' + err);
	        			redisc.quit();
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				});

	       	 		redisc.expire(hashKey, 0); // Key expires after 24 hours
	        		redisc.quit();

				updatedUser = setDateInfo(updatedUser);

		                logger.info(req, "[UPDATE DATA]"+updatedUser);

				logger.info(req, 'User information updated successfully : ' + username);
			        //res.status(200).json({msg:"updated successfully..."});
			        return res.status(200).json(updatedUser);
			});
		});
	});

};


exports.checkUserByEmail = function(req, res){

	logger.info(req, "[가입을 위한 이메일 중복 체크] - " + req.params.email);

	if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
		logger.error(req, "이메일 값이 없습니다.");
		return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
	}

	var query = User.findOne({"personal_info.email":req.params.email}, function(err, user){
		if(err) {
                	logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
                	logger.info(req, "사용가능 이메일" + req.params.email);
			return res.status(200).json(custMsg.getMsg("SUCCESS"));
		} else
                	logger.error(req, custMsg.getMsg("ID_EXIST"));
			return res.status(500).json(custMsg.getMsg("ID_EXIST"));

	});
};

exports.getUserByEmail = function(req, res){

	logger.info(req, "[회원상세정보 조회]");

	if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
		logger.error(req, "이메일값 오류 : " + JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
		return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
	}

	var query = User.findOne({"personal_info.email":req.params.email}, function(err, user){
		if(err) {
                	logger.error(req, err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "해당 회원정보가 존재하지 않습니다.");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		res.status(200).json(setDateInfo(user));
	});
};

exports.updateUserByEmail = function(req, res){

	logger.info(req, "[회원정보 수정]");
	logger.info(req, "수정을 위한 회원정보 데이타 : " + JSON.stringify(req.body));

	// 유저정보 체크
	var userCheckError = validateUserData(req, req.body, "UPDATE");
	if (userCheckError != null) {
		return res.status(500).json(userCheckError);
	}

	var email = req.body.personal_info.email;

	var query = User.findOne({"personal_info.email":email}, function(err, user){
		if(err) {
                	logger.error(req, "수정을 위한 조회시 에러 : " + err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "수정대상 회원정보 미존재");
                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		logger.info(req, "user."+util.getTypeStr(user, "MY")+"_info");
		var originCommuteType = eval("user."+util.getTypeStr(user, "MY")+"_info").commute_type;

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
                		logger.error(req, "수정을 위한 회원정보 백업시 에러 : " + err);
	                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info(req, "백업정보 저장 완료");

			var query = User.findOneAndUpdate({"personal_info.email":email}, {$set:req.body}, {upsert:true, new:true}, function(err, updatedUser){
				if(err) {
                			logger.error(req, "회원정보 업데이트시 에러 : " + err);
		                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				} else if(updatedUser==null) {
					logger.error(req, "수정대상 회원정보 미존재");
		                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
				}

				updatedUser = setDateInfo(updatedUser);

				var updatedCommuteType = eval("updatedUser."+util.getTypeStr(updatedUser, "MY")+"_info").commute_type;

		                logger.info(req, "[UPDATE DATA]"+updatedUser);
				logger.info(req, "회원정보 업데이트 완료");
				logger.info(req, 'originCommuteType : ' + originCommuteType + ", updatedCommuteType : " + updatedCommuteType);

				if ( (originCommuteType+updatedCommuteType)%2 == 1) { // REDIS 입력

					// For GPS calculation
					var redis = require('redis');                                   //add for Redis support
					var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

					redisc.on('error', function(err) {
                				logger.error(req, "회원정보 업데이트시 레디스 에러 : " + err);
	        				redisc.quit();
				        	return res.status(200).json(updatedUser);
					});

					var geo = require('georedis').initialize(redisc, {nativeGeo: true});

					var redisStr = util.getRedisStr(user, "MY");
logger.info(req, "[redisStr]"+redisStr);
					var redisSet = geo.addSet(redisStr);

					redisSet.removeLocation( user.personal_info.email, function(err, reply){
						if(err) {
                					logger.error(req, "회원정보 업데이트시 레디스 에러 : " + err);
						} else {
							logger.info(req, redisStr + " removed :" + reply)
						}

						redisStr = util.getRedisStr(user, "OPPOSITE");
logger.info(req, "[redisStr]"+redisStr);
						redisSet = geo.addSet(redisStr);

						redisSet.addLocation( user.personal_info.email, {latitude: user.personal_info.lat, longitude: user.personal_info.lng}, function(err, reply){
							if(err) {
                						logger.error(req, "회원정보 업데이트시 레디스 에러 : " + err);
	        						redisc.quit();
				        			return res.status(200).json(updatedUser);
							} else {
								logger.info(req, redisStr + " added :" + reply)
	        						redisc.quit();
							        return res.status(200).json(updatedUser);
							}
						})			
					})			
				} else {
				        return res.status(200).json(updatedUser);
				}
			});
		});
	});

};

/*
exports.updateUserByEmailBakcup = function(req, res){

	var username = req.body.personal_info.email;
	logger.info(req, 'Updating user information : ' + username);

	var query = User.findOne({"personal_info.email":username}, function(err, user){
		if(err) {
                	logger.error(req, err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "No data found....");
                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

                logger.info(req, ""+user.personal_info);

		user.created_by = req.body.created_by;
		user.text = req.body.text;

		user.save(function(err, user){
			if (err) {
	                	logger.error(req, err);
	                        return res.status(500).custMsg.getMsg("SYS_ERROR");
			} 
			logger.info(req, 'User information updated successfully : ' + username);
	                res.status(200).json({msg:"deleted successfully..."});
		});
	});
};
*/

exports.removeUserByEmail = function(req, res){

	// 이메일 정보 체크
	if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
		logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
		return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
	}

	var email = req.params.email;

	logger.info(req, "[회원정보 삭제] - " + email);

	var query = User.findOne({"personal_info.email":email}, function(err, user){
		if(err) {
                	logger.error(req, err);
                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(user==null) {
			logger.error(req, "삭제대상 회원정보가 존재하지 않습니다.");
                        return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

//		logger.info(req, "[PERSONAL INFO]"+user.personal_info);

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
	                	logger.error(req, "회원정보 백업중 오류 : " + err);
	                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			} 

			logger.info(req, "삭제를 위한 회원정보 백업이 완료되었습니다 : " + email);

			var query = User.remove({"personal_info.email":email}, function(err) {

				if (err) {
	                		logger.error(req, "회원정보 삭제중 오류 : " + err);
					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				} 
				logger.info(req, "회원정보가 성공적으로 삭제되었습니다. : " + email);
				return res.status(200).json(custMsg.getMsg("SUCCESS"));
			});
		});
	});
};

exports.getSitterByEmail = function(req, res){
	getUserDetailByEmail(req, res);
};

exports.getParentByEmail = function(req, res){
	getUserDetailByEmail(req, res);
};

var getUserDetailByEmail = function(req, res){

        logger.info(req, "[시터/부모 상세 정보 조회]");

        if (req.params.email==null || req.params.email==undefined || req.params.email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

        if (req.params.trg_email==null || req.params.trg_email==undefined || req.params.trg_email=="") {
                logger.error(req, JSON.stringify(custMsg.getMsg("INVALID_INPUT")));
                return res.status(500).json(custMsg.getMsg("INVALID_INPUT"));
        }

	logger.info(req, "조회대상 : " + req.params.trg_email);

	var allEmail =[req.params.email, req.params.trg_email];

	var query = User.find({"personal_info.email":{"$in":allEmail}}, function(err, users){
		if(err) {
                	logger.error(req, "조회 요청자/대상자 정보 조회시 오류 - " + err);
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		} else if(users==null) {
			logger.error(req, "조회 요청자/대상자 정보를 찾을 수 없습니다.");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		} else if(users.length<2) {
			logger.error(req, "조회 요청자/대상자 정보를 찾을 수 없습니다.");
			return res.status(500).json(custMsg.getMsg("NOT_FOUND"));
		}

		logger.info(req, "조회 요청자/대상자 정보 조회 완료");

		query = Contact.findOne({"req_email":{"$in":allEmail}, "rcv_email":{"$in":allEmail}, "status":{"$in":[0,1]}}, function(err, contact){
			if(err) {
       		         	logger.error(req, "연락처 정보 조회중 오류 발생 - " + err);
				return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			} else if(contact==null) {
				logger.info(req, "연락처 정보가 없습니다.");
			}

			logger.info(req, "연락처 정보 조회 완료");

			query = Favorite.findOne({"email":req.params.email, "favorite_email":req.params.trg_email}, function(err, favorite){
				if(err) {
       			         	logger.error(req, "관심 시터/부모 정보 조회중 오류 발생 - " + err);
//					return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
				} else if(favorite==null) {
					logger.info(req, "관심 시터/부모 정보가 없습니다.");
				}

				logger.info(req, "관심 시터/부모 정보 조회 완료");


        			query = Testimonial.find({"email":req.params.trg_email, "status":{"$in":[0,1]}}, null, {"sort":{"sys_reg_date":-1}}, function(err, testimonials){
			                if(err){
			                        logger.error(req, "후기정보 조회중 오류 발생 - " + err);
//			                        return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			                } else if(testimonials==null){
			                        logger.info(req, "후기정보가 없습니다");
			                } else if(testimonials.length==0){
			                        logger.info(req, "후기정보가 없습니다");
			                }

			                for (var i=0;i<testimonials.length;i++)
			                        testimonials[i].reg_date = testimonials[i].sys_reg_date.getTime();

					var userDetail = {
						user:(users[0].personal_info.email==req.params.trg_email)?users[0]:users[1],
						distance:getDistance(users[0].personal_info.lat, users[0].personal_info.lng, users[1].personal_info.lat, users[1].personal_info.lng),
						reqEmail:(contact==null)?"":contact.req_email,
						rcvEmail:(contact==null)?"":contact.rcv_email,
						contactStatus:(contact==null)?9:contact.status,
						contactId:(contact==null)?"":contact._id,
						favorite:(favorite==null)?"N":"Y",
						testimonial:testimonials
					}

					if (contact!=null && contact.status==0 && contact.sys_read_date==null && req.params.email==contact.rcv_email) {
						query = Contact.findOneAndUpdate({"_id":contact._id}, {$set:{"sys_read_date":Date.now()}}, {upsert:false, new:true}, function(err, updatedContact){
							if(err) {
								logger.error(req, "연락처 확인시간 업데이트시 오류 - " + err);
							} else if(updatedContact==null) {
								logger.error(req, "연락처 확인시간 업데이트 실패");
							}

							return res.status(200).json(userDetail);
						});
					} else
						return res.status(200).json(userDetail);
			        });
			});
		});
	});
};

// 실제 로그인 처리 함수 
var login = function(gubun, req, res, passport, next) {

	if (req.body.email==null || req.body.email==undefined || req.body.email=="") {
		logger.error(req, JSON.stringify(custMsg.getMsg("LOGIN_EMAIL_ERR")));
		return res.status(500).json(custMsg.getMsg("LOGIN_EMAIL_ERR"));
	}
	else if (req.body.passwd==null || req.body.passwd==undefined || req.body.passwd=="") {
		logger.error(req, JSON.stringify(custMsg.getMsg("LOGIN_PASS_ERR")));
		return res.status(500).json(custMsg.getMsg("LOGIN_PASS_ERR"));
	}

	// 재로그인일 경우 passport 함수에 알리기 위해 패스워드 앞에 특정 문자열 추가
	if(gubun=="relogin")
		req.body.passwd = "RELOGIN"+req.body.passwd;

	passport.authenticate("login", { session: false }, function(err, user, info) {
		// 로그인 처리중 시스템 오류 발생시
		if (err) {
			return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
		}
		// 로그인 실패시
		if (!user) {
			// 실패정보 미존재시 
			if (info==null) {
				return res.status(500).json(custMsg.getMsg("SYS_ERROR"));
			// 실패정보 존재시 
			} else {
				return res.status(500).json(custMsg.getMsg(info));
			}
		}
   
		// 헤더에 생성된 해쉬값을 세팅 후 유저객체를 전달
		return res.set("session-key",info).status(200).json(setDateInfo(user));

	})(req, res, next);
}

// 유저객체에 Date관련 정보 timestamp로 변환
var setDateInfo = function(user){

	if (user.sys_info.sys_reg_date != null)
		user.personal_info.reg_date = user.sys_info.sys_reg_date.getTime();
	if (user.sys_info.sys_last_login != null)
		user.personal_info.last_login = user.sys_info.sys_last_login.getTime();

	return user;
}

// 유저객체 정합성 체크
function validateUserData (req, user, gubun) {

        var week = ["mon","tue","wed","thu","fri","sat","sun"];

        logger.info(req, "[유저객체정보]\n"+JSON.stringify(user));
 
	// 회원가입, 업데이트시 체크항목
	if (gubun=="SIGNUP" || gubun=="UPDATE") {
		// 이메일 검증
		if (user.personal_info.email==null || user.personal_info.email==undefined || user.personal_info.email.length<5) {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_EMAIL")));
			return custMsg.getMsg("INV_USER_EMAIL");
		}
		// 비밀번호 검증
		if (user.personal_info.passwd==null || user.personal_info.passwd==undefined || user.personal_info.passwd=="") {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_PASSWD")));
			return custMsg.getMsg("INV_USER_PASSWD");
		}
		// 이름 검증
		if (user.personal_info.name==null || user.personal_info.name==undefined || user.personal_info.name.length<2) {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_NAME")));
			return custMsg.getMsg("INV_USER_NAME");
		}
		// 생년월일 검증
		if (user.personal_info.birth_date==null || user.personal_info.birth_date==undefined || isNaN((new String(user.personal_info.birth_date))) || (new String(user.personal_info.birth_date)).length!=8) {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_BIRTH")));
			return custMsg.getMsg("INV_USER_BIRTH");
		}
		// 전화번호 검증
		if (user.personal_info.phone==null || user.personal_info.phone==undefined || user.personal_info.phone.indexOf("-")>-1 || isNaN(user.personal_info.phone) || (user.personal_info.phone+"").length>11 || user.personal_info.phone.length<10 ) {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_PHONE")));
			return custMsg.getMsg("INV_USER_PHONE");
		}
		// 주소 검증
		if (user.personal_info.addr1==null || user.personal_info.addr1==undefined || user.personal_info.addr1=="") {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_ADDR")));
			return custMsg.getMsg("INV_USER_ADDR");
		}
		if (user.personal_info.addr2==null || user.personal_info.addr2==undefined || user.personal_info.addr2=="") {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_ADDR")));
			return custMsg.getMsg("INV_USER_ADDR");
		}
		// 우편번호 검증
		if (user.personal_info.post_no==null || user.personal_info.post_no==undefined || user.personal_info.post_no=="") {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_POSTNO")));
			return custMsg.getMsg("INV_USER_POSTNO");
		}
		// GPS 검증
		if (user.personal_info.lng==null || user.personal_info.lng==undefined || user.personal_info.lng=="") {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_GPS")));
			return custMsg.getMsg("INV_USER_GPS");
		}
		if (user.personal_info.lat==null || user.personal_info.lat==undefined || user.personal_info.lat=="") {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_GPS")));
			return custMsg.getMsg("INV_USER_GPS");
		}
		// 회원유형 검증
		if (user.personal_info.user_type==null || user.personal_info.user_type==undefined || user.personal_info.user_type<0) {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_TYPE")));
			return custMsg.getMsg("INV_USER_TYPE");
		}
	}
 
	// 업데이트시 체크항목
	if (gubun=="UPDATE") {
		// 회원사진 검증
		if (user.image_info.prf_img_url!=null && user.image_info.prf_img_url!=undefined && user.image_info.prf_img_url=="") {
		        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_PIC")));
			return custMsg.getMsg("INV_USER_PIC");
		}

		var user_type_obj = eval("user." + util.getTypeStr(user, "MY") + "_info");
			
		if (user_type_obj!=undefined) {

			// 출퇴근 타입 검증
			if (user_type_obj.commute_type!=null && user_type_obj.commute_type!=undefined && user_type_obj.commute_type<0) {
			        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_COMM")));
				return custMsg.getMsg("INV_USER_COMM");
			}
			// 급여값 검증
			if (user_type_obj.salary!=null && user_type_obj.salary!=undefined && user_type_obj.salary<0) {
			        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_SAL")));
				return custMsg.getMsg("INV_USER_SAL");
			}

			for (var i=0;i<week.length;i++) {
				var day = eval("user_type_obj."+week[i]);
				if (day==null || day==undefined || isNaN(day) || day.length!=7) {
				        logger.error(req, JSON.stringify(custMsg.getMsg("INV_USER_TIME")));
					return custMsg.getMsg("INV_USER_TIME");
				}
			}
		}
	}

	return null;
}

// 거리계산 함수 - REDIS 처리 없이 거리값이 필요할 경우 사용
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
        return d.toFixed(2);
}

function toRad(Value)
{
        return Value * Math.PI / 180;
}

//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
