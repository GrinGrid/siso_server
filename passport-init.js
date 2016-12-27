var mongoose = require('mongoose');   
var redis = require('redis');
var User = mongoose.model('User');
var LocalStrategy   = require('passport-local').Strategy;
var bCrypt = require('bcrypt-nodejs');
var logger = require('./lib/appLogger');
//var userController = require('./controllers/controller_user.js');


module.exports = function(passport){

	//Passport needs to be able to serialize and deserialize users to support persistent login sessions
	/*
	passport.serializeUser(function(user, done) {
		logger.info('serializing user:',user.username);
		done(null, user._id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			logger.info('deserializing user:',user.username);
			done(err, user);
		});
	});
	*/

	passport.use('login', new LocalStrategy({
			usernameField: 'email',
			passwordField: 'passwd',
			passReqToCallback : true
		},
		function(req, username, password, done) { 

			logger.info(req, "############################ 로그인 시도 : "+username+" ###########################");
//			logger.info(req, "다음 유저 이메일로 로그인 시도 : "+username);

			//check in mongo if a user with username exists or not
			User.findOne({ 'personal_info.email' :  username }, function(err, user) {
				//In case of any error, return using the done method
				if (err)
					return done(err);
				//Username does not exist, log the error and redirect back
				if (!user){
					logger.error(req, "해당하는 이메일로 유저가 존재하지 않습니다 : "+username);
					return done(null, false, "ID_NOT_EXIST");                 
				}
				//User exists but wrong password, log the error 
				if (!isValidPassword(user, password)){
					logger.error(req, "해당하는 이메일 계정의 비밀번호가 틀립니다 : "+username);
					return done(null, false, "INVALID_PASS"); // redirect back to login page
				}
				//User and password both match, return user from done method
				//which will be treated like success

				var query = User.findOneAndUpdate({"personal_info.email":username}, {$set:{"sys_info.sysLastLogin":Date.now()}}, {upsert:false, new:true}, function(err, raw){
					if(err) {
						logger.error(req, err);
						return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
					} else if(raw==null) {
						logger.error(req, "해당 이메일 없음(마지막 로그인 업데이트중 오류) : "+username);
						return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
					}

					logger.info(req, "마지막 로그인 일시 업데이트 성공 : "+username);
//					logger.info(req, "[로그인 정보 업데이트 성공...]["+raw+"]");
				});

				var redisc = redis.createClient(6379, '127.0.0.1');	//connect to Redis
				var prefix = "user.";
	
				redisc.on('error', function(err) {
					logger.error(req, err);
					return done(null, false, "SYS_ERROR"); // redirect back to login page
				});
	
				var today = (new Date()).getDate();
				var session_hash = createHash(username + today);
				session_hash = prefix + session_hash;

				logger.info(req, "세션값 생성 : 유저["+username+"] 세션값["+session_hash+"]");
	
				redisc.hmset(session_hash, {
					"email" : username,
					"session-date" : today
				}, redis.print);
	
				redisc.expire(session_hash, 86400); // Key expires after 24 hours
	
				//redisc.quit();
				logger.info(req, "로그인 성공 : [" + username + "] 유저가 로그인 하셨습니다.");
	
				return done(null, user, session_hash);
			});
		}
	));
};

var isValidPassword = function(user, password){

	// 재로그인시 암호화 된 비밀번호 그대로 비교
	if (password.indexOf("RELOGIN")>-1)
		return (user.personal_info.passwd==password.substring(("RELOGIN").length));
	else
		return bCrypt.compareSync(password, user.personal_info.passwd);
};
//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
