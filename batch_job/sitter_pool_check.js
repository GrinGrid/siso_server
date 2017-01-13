//initialize mongoose schemas
require('../models/db_models');

var mongoose = require('mongoose');                             //add for Mongo support
mongoose.connect('mongodb://localhost/siso');                   //connect to Mongo

var User = mongoose.model('User');
var User_Status = mongoose.model('User_Status');
//var User_History = mongoose.model('User_History');
var redis = require('redis');

var custMsg = require('../models/custom_msg');
var logger = require('../lib/batchLogger');
var util = require('../lib/util');

// 만료기간 4일
var EXPIRE_DAYS = 3;

var isDone = false;

// 작업시작
logger.info("[풀 만기 시터 상태 업데이트 및 레디스 삭제 작업 - 시작]");

var today = new Date();
var exec_timestamp = today-(EXPIRE_DAYS*24*60*60*1000);
logger.info("[작업기준시각:"+exec_timestamp+"]");

var exec_date = new Date(exec_timestamp);
logger.info("[작업기준시각:"+exec_date.toLocaleString()+"]");
logger.info("[작업기준시각:"+exec_date.toISOString()+"]");


	var query = User.find({"personal_info.user_type":1, "personal_info.status":20, "sys_info.sys_pool_insert_date":{$lt:exec_date}}, function(err, users){

		if(err) {
			logger.error("[풀 만기 시터 조회 중 에러발생]");
			logger.error(err);
			process.exit(1);
		} else if ( users==null || users.length==0 ) {
			logger.info("[풀 만기 시터 없음]");
			process.exit(0);
		} else {
			var targetEmails = [];

			for (var i=0; i<users.length; i++)
				targetEmails.push(users[i].personal_info.email);

			var redis = require('redis');                                   //add for Redis support
			var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

			redisc.on('error', function(err) {
				logger.error("[풀 만기 시터 레디스 삭제 중 에러발생]");
				logger.error(err);
				process.exit(1);
			});

			var geo = require('georedis').initialize(redisc, {nativeGeo: true});

			var redisSet = geo.addSet("sitter_commute");

			redisSet.removeLocations( targetEmails, function(err, reply){
				if(err) {
					logger.error("[풀 만기 시터 레디스 삭제 중 에러발생]");
					logger.error(err)
					process.exit(1);
				} else {
					logger.info(reply + " commute sitters removed")

					redisSet = geo.addSet("sitter_resident");

					redisSet.removeLocations( targetEmails, function(err, reply){
						if(err) {
							logger.error("[풀 만기 시터 레디스 삭제 중 에러발생]");
							logger.error(err)
							process.exit(1);
						} else {
							logger.info(reply + " resident sitters removed")

							query = User.update({"personal_info.user_type":1, "personal_info.status":"20", "sys_info.sys_pool_insert_date":{$lt:exec_date}}, {$set:{"personal_info.status":"12"}}, {multi:true, upsert:false, new:true}, function(err, updatedUsers){
								if(err) {
									logger.error("[풀 만기 시터 상태 업데이트 중 에러발생]");
									logger.error(err);
									process.exit(1);
								} else {
									logger.info("유저 상태 업데이트 결과"+JSON.stringify(updatedUsers));
									var input_arr = [];

									for (var j=0; j<users.length; j++) {
										var user_status = {
											email:users[j].personal_info.email,
											action_type:"03",
											content:"시터풀 유효시간 만료",
											sys_reg_date:today,
											reg_date:""
										};
										input_arr.push(user_status);
									}

									User_Status.insertMany(input_arr, function(err, result){
										if(err) {
											logger.error("[풀 만기 시터 유저상태 정보 입력 중 에러발생]");
											logger.error(err)
											process.exit(1);
										} else {
											logger.info("[풀 만기 시터 상태 업데이트 및 레디스 삭제 작업 - 완료]");
											process.exit(0);
										}
									});
								}
							});
						}
					});
				}

			});
		}
	});
