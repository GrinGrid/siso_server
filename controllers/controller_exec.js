var custMsg = require( '../models/custom_msg' );
var mongoose = require( 'mongoose' );
var bCrypt = require('bcrypt-nodejs');
var User = mongoose.model('User');
var logger = require( '../lib/slogger' );
var redis = require('redis');


exports.putGeoDataForAllUsers = function(req, res){

	logger.info('Try to find all users - start');
    
	// For GPS calculation
	var redis = require('redis');                                   //add for Redis support
	var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

	redisc.on('error', function(err) {
		logger.error('Error ' + err);
	});

	var geo = require('georedis').initialize(redisc, {nativeGeo: true});

	geo.deleteSet('parent_commute');
	geo.deleteSet('parent_resident');
	geo.deleteSet('sitter_commute');
	geo.deleteSet('sitter_resident');

	var parents_commute = geo.addSet('parent_commute')
	var parents_resident = geo.addSet('parent_resident')
	var sitters_commute = geo.addSet('sitter_commute')
	var sitters_resident = geo.addSet('sitter_resident')

	var query = User.find(function(err, users){
                if(err){
                        return res.send(500, err);
                }

		for (var i=0;i<users.length;i++) {


			if ( users[i].personal_info.user_type == 1 && users[i].sitter_info.commute_type != undefined) {	// Adding to sitters
//				logger.info('adding sitter :'+users[i].personal_info.email+', '+users[i].personal_info.lat+', '+users[i].personal_info.lng+', '+users[i].personal_info.addr1+'....')		
				if ( users[i].sitter_info.commute_type == 2 ) {	// 입주형
					sitters_resident.addLocation( users[i].personal_info.email, {latitude: users[i].personal_info.lat, longitude: users[i].personal_info.lng}, function(err, reply){
						if(err) logger.error(err)
						else logger.info('Sitter resident added :', reply)
					})			
				} else {					// 출퇴근 또는 재택형
					sitters_commute.addLocation( users[i].personal_info.email, {latitude: users[i].personal_info.lat, longitude: users[i].personal_info.lng}, function(err, reply){
						if(err) logger.error(err)
						else logger.info('Sitter commute added :', reply)
					})			

				}
			} else if ( users[i].personal_info.user_type == 0 && users[i].parent_info.commute_type != undefined) {	// Adding to sitters
//			} else {				// Adding to parents
//				logger.info('adding parent :'+users[i].personal_info.email+', '+users[i].personal_info.lat+', '+users[i].personal_info.lng+', '+users[i].personal_info.addr1+'....')
				if ( users[i].parent_info.commute_type == 2 ) {	// 입주형
					parents_resident.addLocation( users[i].personal_info.email, {latitude: users[i].personal_info.lat, longitude: users[i].personal_info.lng}, function(err, reply){
						if(err) logger.error(err)
						else logger.info('Parent resident added :', reply)
					})			
				} else {					// 출퇴근 또는 재택형
					parents_commute.addLocation( users[i].personal_info.email, {latitude: users[i].personal_info.lat, longitude: users[i].personal_info.lng}, function(err, reply){
						if(err) logger.error(err)
						else logger.info('Parent commute added :', reply)
					})			

				}
			}
		}

/*		
		sitters.addLocations( {"test3@test.com": { longitude: 127.109757, latitude: 37.329358}, "test4@test.com": { longitude: 128.109757,latitude: 38.329358}}, function(err, reply){
				if(err) logger.error(err)
				else logger.info('added people:', reply)
		})			
*/

		return res.send(200, "SUCCESS");
	});


//	redisc.quit();

};

exports.insertRandomUsers = function(req, res){

	logger.info('[User Registration]');  

	var maxCnt = 5100;
/*
	var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

	redisc.on('error', function(err) {
		logger.error('Error ' + err);
	});

	var geo = require('georedis').initialize(redisc, {nativeGeo: true});

	var parents = geo.addSet('parents')
	var sitters = geo.addSet('sitters')
*/

var work_table = ["1111111","0111100","0111100","01111100","0111110","0011110","0000110"];
var brief_table = ["난 잘나가는 시터!!","안녕하세요~~","아이들을 정말 사랑해요","신난다 시터에요","잘 부탁부탁드립니다","우헤헤헤 신나요","진정한 시터를 찾으신다면~~"];
var intro_table = ["난 잘나가는 시터!!","안녕하세요~~","아이들을 정말 사랑해요","신난다 시터에요","잘 부탁부탁드립니다","우헤헤헤 신나요","진정한 시터를 찾으신다면~~"];

	for (var i=5000;i<maxCnt;i++) {

		logger.info('[User Registration]'+i);  

		var newUser = new User();
	
//set the user's local credential
		newUser.personal_info.email = "test"+i+"@test.com";
		newUser.personal_info.passwd = createHash("password");
		newUser.personal_info.name = "테스트"+i;
		newUser.personal_info.birth_date = (10000*1970+(i%20))+1122;
		newUser.personal_info.phone = "01043214322";
		newUser.personal_info.addr1 = "서울 테스트구 테스트시";
		newUser.personal_info.addr2 = "123-"+(i%50);
		newUser.personal_info.post_no = "99999"


//		서북 : 37.7198932,126.7278063
//		동남 : 37.5502042,127.2567293

		var lng = 126.7278 + (Math.random()*0.53)
		var lat = 37.5502 + (Math.random()*0.12)

		newUser.personal_info.lng = lng;
		newUser.personal_info.lat = lat;
		newUser.personal_info.user_type = 1;
//		newUser.personal_info.reg_date = req.body.reg_date;
//		newUser.personal_info.last_login = req.body.last_login;
		newUser.personal_info.push_id = "pushpushpush";

		newUser.sys_info.sys_status = "active";
		newUser.sys_info.sys_reg_date = Date.now();
		newUser.sys_info.sys_last_login = Date.now();


		newUser.sitter_info.gender = 0;
		newUser.sitter_info.sons = 1;
		newUser.sitter_info.daughters = 1;
		newUser.sitter_info.work_year = 1;
		newUser.sitter_info.term_from = 0;
		newUser.sitter_info.term_to = 0;
		newUser.sitter_info.skill = "";
		newUser.sitter_info.commute_type = "2";
		newUser.sitter_info.distance_limit = 72;
//0111110
		newUser.sitter_info.mon = work_table[Math.floor(Math.random()*7)];
		newUser.sitter_info.tue = work_table[Math.floor(Math.random()*7)];
		newUser.sitter_info.wed = work_table[Math.floor(Math.random()*7)];
		newUser.sitter_info.thu = work_table[Math.floor(Math.random()*7)];
		newUser.sitter_info.fri = work_table[Math.floor(Math.random()*7)];
		newUser.sitter_info.sat = work_table[Math.floor(Math.random()*7)];
		newUser.sitter_info.sun = work_table[Math.floor(Math.random()*7)];
//0 : 협의
//6000 :  6,000원
//7000 : 7,000원
//8000 : 8,000원 : Default
//9000 : 9,000원
//10000 : 10,000원
//12000 : 12,000원
//15000 : 15,000원
//1500000 : 150만원
//2300000 : 230만원
		newUser.sitter_info.salary = 6000 + Math.floor(Math.random()*9)*1000;
		newUser.sitter_info.env_pet = 0;
		newUser.sitter_info.env_cctv = 0;
		newUser.sitter_info.evn_adult = 0;
		newUser.sitter_info.baby_gender = 0;
		newUser.sitter_info.baby_age = 0;
		newUser.sitter_info.religion = 0;
		newUser.sitter_info.nat = 0;
		newUser.sitter_info.visa_exp = "";
		newUser.sitter_info.brief = brief_table[Math.floor(Math.random()*7%7)];
		newUser.sitter_info.introduction = intro_table[Math.floor(Math.random()*7%7)];



	
		//save the user
		newUser.save(function(err) {
			if (err){
				logger.error('Error in Saving user: '+err);  
				logger.error('Registration failed : '+newUser.personal_info.email);
				return res.json(500, custMsg.getMsg("SYS_ERROR"));
//				return done(null, false, "SYS_ERROR");
//				throw err;  
			}

			logger.info(newUser.personal_info.email + ' Registration succesful');


//				logger.info('adding people:'+newUser.personal_info.email+', '+newUser.personal_info.lat+', '+newUser.personal_info.lng+', '+newUser.personal_info.addr1+'....')

/*
				if (newUser.personal_info.user_type==1)
					sitters.addLocation( newUser.personal_info.email, {latitude: newUser.personal_info.lat, longitude: newUser.personal_info.lng}, function(err, reply){
						if(err) {
							logger.error(err)
					                return res.json(500, custMsg.getMsg("SYS_ERROR"));
						} else logger.info('Sitter added :', reply)
					});
				else
					parents.addLocation( newUser.personal_info.email, {latitude: newUser.personal_info.lat, longitude: newUser.personal_info.lng}, function(err, reply){
						if(err) {
							logger.error(err)
					                return res.json(500, custMsg.getMsg("SYS_ERROR"));
						} else logger.info('Parent added :', reply)
					});

//				redisc.quit();
*/

		});
	}

	return res.send(200, "SUCCESS");

};

exports.updateUserByEmail = function(req, res){

	logger.info('Try to find and update a certain user information for a given email - start');

	var query = User.findOne({"personal_info.email":req.params.email}, function(err, user){
		if(err)
			res.send(500, err);

		user.created_by = req.body.created_by;
		user.text = req.body.text;

		user.save(function(err, user){
			if(err)
				res.send(500, err);

			res.json(user);
		});
	});
};

exports.removeRandomUsers = function(req, res){

	logger.info('Try to find and remove a certain user for a given email - start');

	var query = User.remove({"personal_info.email":{$regex:"test.com"}}, function(err) {
		if (err)
			res.send(500, err);
                res.json("deleted :(");
	});
};

//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
