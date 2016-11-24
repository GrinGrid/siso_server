var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Favorite = mongoose.model('Favorite');
var custMsg = require( '../models/custom_msg' );
var logger = require('../lib/wlogger');

//////////////////////////////////////////////////
//                                              //
//    매칭 케이스별 범위 및 판정값 표 - START   //
//                                              //
//////////////////////////////////////////////////

// REDIS 검색시 기본 거리값(km)
var baseDistance = 3;
// REDIS 검색시 기본 검색결과 갯수값
var baseRedisCnt = 300;

// ** 매칭 알고리즘 판정 테이블 **
//        부모    =>    [시터] 
// 1. [통근/재택] => [통근/재택]
var distTable_sitter_commute_commute = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_sitter_commute_commute = [10,9.5, 9, 8,6.5,  5,  3,  1];
var salTable_sitter_commute_commute = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];
var salValue_sitter_commute_commute = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];
var rate_sitter_commute_commute = [7,2,1]; // 비중도 : 1.스케쥴, 2.거리, 3.시급
// 2. [통근/재택] =>   [입주]
var distTable_sitter_commute_resident = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_sitter_commute_resident = [10,9.5, 9, 8,6.5,  5,  3,  1];
var salTable_sitter_commute_resident = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];
var salValue_sitter_commute_resident = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];
var rate_sitter_commute_resident = [7,2,1];
// 3.    [입주]   =>   [입주]
var distTable_sitter_resident_resident = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_sitter_resident_resident = [10,9.5, 9, 8,6.5,  5,  3,  1];	
var salTable_sitter_resident_resident = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];	
var salValue_sitter_resident_resident = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];	
var rate_sitter_resident_resident = [7,2,1];
// 4.    [입주]   => [통근/재택] 
var distTable_sitter_resident_commute = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_sitter_resident_commute = [10,9.5, 9, 8,6.5,  5,  3,  1];
var salTable_sitter_resident_commute = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];
var salValue_sitter_resident_commute = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];
var rate_sitter_resident_commute = [7,2,1];

//        시터    =>    [부모] 
// 1. [통근/재택] => [통근/재택]
var distTable_parent_commute_commute = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_parent_commute_commute = [10,9.5, 9, 8,6.5,  5,  3,  1];
var salTable_parent_commute_commute = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];
var salValue_parent_commute_commute = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];
var rate_parent_commute_commute = [7,2,1]; // 비중도 : 1.스케쥴, 2.거리, 3.시급
// 2. [통근/재택] =>   [입주]
var distTable_parent_commute_resident = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_parent_commute_resident = [10,9.5, 9, 8,6.5,  5,  3,  1];
var salTable_parent_commute_resident = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];
var salValue_parent_commute_resident = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];
var rate_parent_commute_resident = [7,2,1];
// 3.    [입주]   =>   [입주]
var distTable_parent_resident_resident = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_parent_resident_resident = [10,9.5, 9, 8,6.5,  5,  3,  1];	
var salTable_parent_resident_resident = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];	
var salValue_parent_resident_resident = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];	
var rate_parent_resident_resident = [7,2,1];
// 4.    [입주]   => [통근/재택] 
var distTable_parent_resident_commute = [0, 0.5, 2, 5, 10, 15, 20, 30];
var distValue_parent_resident_commute = [10,9.5, 9, 8,6.5,  5,  3,  1];
var salTable_parent_resident_commute = [-10000,-5000,-2000,0,1000,2000,3000,5000,7000,10000];
var salValue_parent_resident_commute = [10,        9,    8,7,   6,   5,   4,   3,   2,    1];
var rate_parent_resident_commute = [7,2,1];

//////////////////////////////////////////////////
//                                              //
//    매칭 케이스별 범위 및 판정값 표 - END     //
//                                              //
//////////////////////////////////////////////////

exports.getListByParentEmail = function(req, res){
	getMatchingListByEmail(100, req, res);
}

exports.getListBySitterEmail = function(req, res){
	getMatchingListByEmail(100, req, res);
}

getMatchingListByEmail = function(listCnt, req, res, secondSearch, result_one){

	logger.info('Try to find a certain users within the given distance - start');

	var gubunTable = ["parent","sitter","parent"];
	var commuteTable = ["resident","commute","resident","commute"];

	// For GPS calculation
        var redis = require('redis');                                   //add for Redis support
        var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

        redisc.on('error', function(err) {
                logger.error('Error ' + err);
        });

        var geo = require('georedis').initialize(redisc, {nativeGeo: true});

	var query = User.findOne({"personal_info.email":req.params.email}, function(err, user){
                logger.info('Try to find all users - finish');
		if(err) {
			logger.error(err);
			return res.status(500).send(""+err);
		} else if(user==null) {
			logger.error('No email found...');
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		} else if(user.personal_info.lng==null || user.personal_info.lat==null) {
			logger.error('No GPS Infomation found...');
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

		var options = {
		    withCoordinates: false, // Will provide coordinates with locations, default false
		    withHashes: false, // Will provide a 52bit Geohash Integer, default false
		    withDistances: true, // Will provide distance from query, default false
		    order: 'ASC', // or 'DESC' or true (same as 'ASC'), default false
		    units: 'km', // or 'km', 'mi', 'ft', default 'm'
		    count: baseRedisCnt, // Number of results to return, default undefined
		    accurate: true // Useful if in emulated mode and accuracy is important, default false
		};

		var gubun = user.personal_info.user_type;
		var sort = (req.params.sort==null)?"point":req.params.sort;

		// 검색대상 회원구분값 세팅 : 시터 -> 부모 OR 부모 -> 시터
		var myGubunStr = gubunTable[gubun];
		var searchGubunStr = gubunTable[(gubun+1)%2];
		// 출퇴근 타입 - myCommuteStr : 내가 설정한 출퇴근 타입, searchCommuteStr : 검색할 출퇴근 타입
		var myCommuteStr = commuteTable[eval("user."+gubunTable[gubun]+"_info.commute_type")];
		var searchCommuteStr = (secondSearch==null)?
					commuteTable[eval("user."+gubunTable[gubun]+"_info.commute_type")]:
					commuteTable[(eval("user."+gubunTable[gubun]+"_info.commute_type")+1)%2];

		var people = geo.addSet(searchGubunStr+"_"+searchCommuteStr);

logger.info('Gubun Value : ', searchGubunStr + "_" + searchCommuteStr);

		var distance = (searchCommuteStr=="commute")?baseDistance:1000;

		people.nearby( { latitude: user.personal_info.lat, longitude: user.personal_info.lng}, 
				distance, options, function(err, people){

			if(err) {
				logger.error(err)
                        	return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else {
				var keys = Object.keys(people.locationSet);
//				var list = Object.values(people.locationSet);

				logger.info('people list:', keys.length);
//				logger.info('people list:', people.locationSet.gettest4429@test.com]);
//				logger.info('people list:', list);

				query = User.find({"personal_info.email":{"$in":keys}}, function(err, users){
					if(err) {
						logger.error(err)
                        			return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
					} else if(users==null) {
						logger.error(custMsg.getMsg("NOT_FOUND"));
                        			return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
					} else {
//						logger.info('people nearby:', users+"");
						var sort = (req.params.sort==null)?"point":req.params.sort;

						getMatchList(user, users, listCnt, people.locationSet, myGubunStr, searchGubunStr, myCommuteStr, searchCommuteStr, sort, req, res, secondSearch, result_one);

					}
				});
			}
		})
	});

};


// user : 조회사용자, users : 가까운 시터목록, listCnt : 조회갯수, objDistance : email,distance 객체, sortGubun : 정렬기준
var getMatchList = function(user, users, listCnt, objDistance, myGubunStr, searchGubunStr, myCommuteStr, searchCommuteStr, sortGubun, req, res, secondSearch, result_one) {

	logger.info("[MATCHING CASE] Searching from ["+myGubunStr+"]");
	logger.info("[MATCHING CASE] Searching for ["+searchGubunStr+"], From ["+myCommuteStr+"] to ["+searchCommuteStr+"]");

	var result = [];

	var week = ["mon","tue","wed","thu","fri","sat","sun"];


	var scheduleRate = (eval("rate_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr))[0];
	var distRate = (eval("rate_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr))[1];
	var salaryRate = (eval("rate_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr))[2];

	var distTable = eval("distTable_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);
	var distValue = eval("distValue_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);
	var salTable = eval("salTable_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);
	var salValue = eval("salValue_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);

	var targetCnt, matchCnt;

	var today = new Date();
	var thisYear = today.getFullYear();
	var thisDate = (today.getMonth()+1)*100+today.getDate();

	sortGubun = (sortGubun==null)?"point":sortGubun;

	logger.info('people number:', users.length);
//	logger.info('thisYear:', thisYear);
//	logger.info('thisDate:', thisDate);

	var favoriteList = [];

	var query = Favorite.find({"email":req.params.email}, function(err, favorites){
		logger.info('Try to find all users - finish');
		if(err) {
			logger.error(err);
		} else if(favorites==null) {
			logger.error('No favorite list found...');
		} else {
                        for (var i=0; i<favorites.length; i++) {
                        	favoriteList.push(favorites[i].favorite_email);
//				logger.info('favorite_email['+favorites[i].favorite_email+"]");
			}
		}

//		logger.info("favoriteList length["+favoriteList.length+"]");

		// 대상에 대한 매칭 작업
		for (var i=0;i<users.length;i++) {
/*
			logger.info("user["+users[i].personal_info.email+"]");
			logger.info("user["+users[i].sitter_info.commute_type+"]");
*/
			targetCnt=0.0;
			matchCnt=0.0;

			// 리스트 객체 생성
			var currentUser = {
				email:users[i].personal_info.email,
				name:users[i].personal_info.name,
				img:(users[i].image_info.prf_img_url==undefined)?
					"http://siso4u.net/images/prf/kyaku76@gmail.com.JPG":
					users[i].image_info.prf_img_url,
				age:0,
				brief:eval("users[i]."+searchGubunStr+"_info.brief"),
				addr:users[i].personal_info.addr1,
				salary:eval("users[i]."+searchGubunStr+"_info.salary"),
				commute:eval("users[i]."+searchGubunStr+"_info.commute_type"),
				testimonialCnt:users[i].personal_info.testimonial_count,
				favorite:"N",
				contactStatus:9,
				distance:0,
				distPoint:0,
				timeMatch:0,
				point:0
			};
/*
		var currentUser = {
			email:users[i].personal_info.email,
			name:users[i].personal_info.name,
			addr:users[i].personal_info.addr1,
			age:0,
			timeMatch:0,
			distance:0,
			distPoint:0,
			salary:users[i].parent_info.salary,
			point:0
		};
*/
			var age = thisYear - Math.floor(users[i].personal_info.birth_date/10000);
			if (thisDate<users[i].personal_info.birth_date%1000) age--;
			currentUser.age = age;

			for (var y=0;y<favoriteList.length;y++) {
				if (currentUser.email==favoriteList[y]) {
					currentUser.favorite = "Y";
					break;
				}
			}

//			currentUser.distance = objDistance.get(users[i].personal_info.email);


//////////////////////////////////////////////////////////////
//              1. 스케쥴 점수 판정                         //
//////////////////////////////////////////////////////////////

			// 각 요일별 스케쥴 매칭율 산정
			for (var y=0;y<week.length;y++) {
				// 각 시간별 스케쥴 매칭율 산정
				for (var z=0;z<7;z++) {
/*
					logger.info('schedule String : ', eval("user."+myGubunStr+"_info."+week[y]));
					logger.info('schedule String : ', eval("users["+i+"]."+searchGubunStr+"_info."+week[y]));
					logger.info('schedule String : ', eval("user.parent_info."+week[y]).charAt(z) );
*/

					// 조회 주체의 스케쥴 값이 1일 경우 조회 상태의 스케쥴 값이 1이면 매칭, 0이면 비매칭
					if (eval("user."+myGubunStr+"_info."+week[y]).charAt(z)=='1') {
						targetCnt++;
						if (eval("users["+i+"]."+searchGubunStr+"_info."+week[y]).charAt(z)=='1') matchCnt++;
					}
				}
			}
/*
			logger.info('matchCnt:', matchCnt);
			logger.info('targetCnt:', targetCnt);
*/
			// 조회 주체의 전체 산정대상 대비 조회 상대의 매칭 비율값 산정
			currentUser.timeMatch = (matchCnt/targetCnt) * 10;
			currentUser.point += currentUser.timeMatch * scheduleRate;

//////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////
//              2. 거리 점수 판정                           //
//////////////////////////////////////////////////////////////

			currentUser.distance = (objDistance[users[i].personal_info.email]).distance;

			for (var y=0;y<distTable.length;y++) 
				if (currentUser.distance < distTable[y]) {
					currentUser.distPoint = distValue[y-1] - (((currentUser.distance-distTable[y-1])/(distTable[y]-distTable[y-1]))*(distValue[y-1]-distValue[y]));
					currentUser.point +=  currentUser.distPoint * distRate;
					break;
				}

//////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////
//              3. 급여 점수 판정                           //
//////////////////////////////////////////////////////////////

			// 둘중 하나의 시급정보가 협의일 경우 시급동일로 판단
			if ( currentUser.salary == 0 || eval("user."+searchGubunStr+"_info.salary") == 0 ) 
				currentUser.point += 7 * salaryRate;
			else {
				for (var y=0;y<salTable.length;y++) 
					if (currentUser.salary - eval("user."+searchGubunStr+"_info.salary") <= salTable[y]) {
						currentUser.point += salValue[y] * salaryRate;
						break;
					}
			}

//////////////////////////////////////////////////////////////

		// 산정된 조회 결과를 조회 리스트에 추가
			result.push(currentUser);
		}


		// Sort before sending list to the client
		if ( secondSearch == null ) {
			if (result.length < listCnt) 
				getMatchingListByEmail(listCnt-result.length, req, res, "true", sortList(result, sortGubun, result.length));
			else {
				return res.status(200).json({group_first:sortList(result, sortGubun, listCnt)});
			}
		} else {
/*
			var result_obj = [result_one, sortList(result, sortGubun, listCnt)];
			return res.status(200).json(result_obj);
*/
//			return res.status(200).json(new Array(result_one, sortList(result, sortGubun, listCnt)));
			return res.status(200).json({group_first:result_one, group_second:sortList(result, sortGubun, listCnt)});
		}
	});
}


// user : 조회사용자, users : 가까운 시터목록, listCnt : 조회갯수, objDistance : email,distance 객체, sortGubun : 정렬기준
var getParentMatchList = function(user, users, listCnt, objDistance, sortGubun, req, res) {

	var result = [];

	var scheduleRate = 7;	// 스케쥴 비중 	70%
	var distRate = 2;	// 거리 비중 	20%
	var salaryRate = 1;	// 시급 비중 	10%

	var week = ["mon","tue","wed","thu","fri","sat","sun"];


	var targetCnt, matchCnt;

//	var today = new Date();
//	var thisYear = today.getFullYear();
//	var thisDate = (today.getMonth()+1)*100+today.getDate();

	sortGubun = (sortGubun==null)?"point":sortGubun;

	logger.info('people number:', users.length);
//	logger.info('thisYear:', thisYear);
//	logger.info('thisDate:', thisDate);

	for (var i=0;i<users.length;i++) {

		targetCnt=0.0;
		matchCnt=0.0;

		var currentUser = {
			email:users[i].personal_info.email,
			name:users[i].personal_info.name,
			addr:users[i].personal_info.addr1,
			age:0,
			timeMatch:0,
			distance:0,
			distPoint:0,
			salary:users[i].parent_info.salary,
			point:0
		};
/*

		var currentUser = {
			email:users[i].personal_info.email,
			name:users[i].personal_info.name,
			addr:users[i].personal_info.addr1,
			age:0,
			timeMatch:0,
			distance:0,
			distPoint:0,
			salary:users[i].parent_info.salary,
			point:0
		};



		var age = today.getFullYear() - Math.floor(users[i].personal_info.birth_date/10000);
		if (thisDate<users[i].personal_info.birth_date%1000) age--;
		currentUser.age = age;
*/

//		currentUser.distance = objDistance.get(users[i].personal_info.email);

		for (var y=0;y<week.length;y++) {
			for (var z=0;z<7;z++) {
//logger.info('schedule String : ', eval("user.parent_info."+week[y]));
//logger.info('schedule String : ', eval("users["+i+"].sitter_info."+week[y]));
//logger.info('schedule String : ', eval("user.parent_info."+week[y]).charAt(z) );
				if (eval("user.sitter_info."+week[y]).charAt(z)=='1') {
					targetCnt++;
					if (eval("users["+i+"].parent_info."+week[y]).charAt(z)=='1') matchCnt++;
				}
			}
		}

		currentUser.distance = (objDistance[users[i].personal_info.email]).distance;

		for (var y=0;y<distTable.length;y++) 
			if (currentUser.distance < distTable[y]) {
				currentUser.distPoint = distValue[y-1] - (((currentUser.distance-distTable[y-1])/(distTable[y]-distTable[y-1]))*(distValue[y-1]-distValue[y]));
				currentUser.point +=  currentUser.distPoint * distRate;
				break;
			}

		if ( currentUser.salary == 0 || user.parent_info.salary == 0 ) // 둘중 하나의 시급정보가 협의일 경우 시급동일로 판단
			currentUser.point += 7;
		else {
			for (var y=0;y<salTable.length;y++) 
				if (currentUser.salary - user.sitter_info.salary <= salTable[y]) {
					currentUser.point += salValue[y] * salaryRate;
					break;
				}
		}


//	logger.info('matchCnt:', matchCnt);
//	logger.info('targetCnt:', targetCnt);
		currentUser.timeMatch = (matchCnt/targetCnt) * 10;
		currentUser.point += currentUser.timeMatch * scheduleRate;

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

		result.push(currentUser);
	}

	if ( sortGubun=="distance") 	// Nearest first
		result.sort(function (a,b) {return a.distance - b.distance});
	else if ( sortGubun=="salary") 	// Cheapest first
		result.sort(function (a,b) {return b.salary - a.salary});
	else				// Best Match - point first
		result.sort(function (a,b) {return b.point - a.point});

	return res.status(200).json(result.slice(0,listCnt));
}



var sortList = function(list, sortGubun, listCnt) {
	// Sort before sending list to the client
	if ( sortGubun=="distance") 	// Nearest first
		list.sort(function (a,b) {return a.distance - b.distance});
	else if ( sortGubun=="salary") 	// Cheapest first
		list.sort(function (a,b) {return a.salary - b.salary});
	else				// Best Match - point first
		list.sort(function (a,b) {return b.point - a.point});

	return list.slice(0,listCnt);
}

exports.getSitterCountByParentEmail = function(req, res){

	getCountByEmail(30, req, res);

}

exports.getParentCountBySitterEmail = function(req, res){

	getCountByEmail(30, req, res);

}

// gubun : 시터/부모 구분, distance : 최대거리제한
getCountByEmail = function(distance, req, res){

	var gubunTable = ["parent","sitter","parent"];
	var resultCnt = 0;

	logger.info('Try to find a certain users within the given distance - start');

	// For GPS calculation
        var redis = require('redis');                                   //add for Redis support
        var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

        redisc.on('error', function(err) {
                logger.error('Error ' + err);
        });

        var geo = require('georedis').initialize(redisc, {nativeGeo: true});

	var query = User.findOne({"personal_info.email":req.params.email}, function(err, user){

//		logger.info('Try to find user for counting people nearby : ' + req.params.email);

		if(err) {
			logger.error(err);
			return res.status(500).send(""+err);
		} else if(user==null) {
			logger.error('Count by email : No email found...');
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		} else if(user.personal_info.lng==null || user.personal_info.lat==null) {
			logger.error('No GPS Infomation found...');
                        return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
		}

		var options = {
		    withCoordinates: false, // Will provide coordinates with locations, default false
		    withHashes: false, // Will provide a 52bit Geohash Integer, default false
		    withDistances: false, // Will provide distance from query, default false
		    units: 'km', // or 'km', 'mi', 'ft', default 'm'
		//    count: 10, // Number of results to return, default undefined
		    accurate: true // Useful if in emulated mode and accuracy is important, default false
		};

		var gubun = user.personal_info.user_type;
		var gubunStr = gubunTable[(gubun+1)%2];

		// 1. 출퇴근/재택 유형 숫자 카운트
		var people = geo.addSet(gubunStr+"_commute");

		people.nearby( { latitude: user.personal_info.lat, longitude: user.personal_info.lng}, 
				distance, options, function(err, people){
			if(err) {
				logger.error(err)
				return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else {
				var keys = Object.keys(people.locationSet);
//				logger.info('people nearby:', keys);
				logger.info('people count:', keys.length);
				resultCnt += keys.length;

				// 2. 입주형 유형 숫자 카운트
				people = geo.addSet(gubunStr+"_resident");

				people.nearby( { latitude: user.personal_info.lat, longitude: user.personal_info.lng}, 
						distance, options, function(err, people){
					if(err) {
						logger.error(err)
					        return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
					} else {
						keys = Object.keys(people.locationSet);
			//			logger.info('people nearby:', keys);
						logger.info('people count:', keys.length);
						resultCnt += keys.length;

		                        	return res.status(200).json({count:resultCnt});
					}
				});
			}
		})
	});
}

//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

