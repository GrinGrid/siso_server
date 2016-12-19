var mongoose = require( 'mongoose' );
var User = mongoose.model('User');
var Favorite = mongoose.model('Favorite');
var Contact = mongoose.model('Contact');

var custMsg = require( '../models/custom_msg' );
var logger = require('../lib/wlogger');

exports.getFavoriteListByParentEmail = function(req, res){
        getListByEmail("fav", req, res);
}

exports.getReqListByParentEmail = function(req, res){
        getListByEmail("req", req, res);
}

exports.getRcvListByParentEmail = function(req, res){
        getListByEmail("rcv", req, res);
}

exports.getFavoriteListBySitterEmail = function(req, res){
        getListByEmail("fav", req, res);
}

exports.getReqListBySitterEmail = function(req, res){
        getListByEmail("req", req, res);
}

exports.getRcvListBySitterEmail = function(req, res){
        getListByEmail("rcv", req, res);
}

getListByEmail = function(listGubun, req, res){

	logger.info('Search List...');


/*
	// For GPS calculation
        var redis = require('redis');                                   //add for Redis support
        var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

        redisc.on('error', function(err) {
                logger.error('Error ' + err);
        });

        var geo = require('georedis').initialize(redisc, {nativeGeo: true});
*/

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

		var sort = (req.params.sort==null)?"point":req.params.sort;

					
//		var people = geo.addSet(searchGubunStr+"_"+searchCommuteStr);

		var destCollection = (listGubun=="fav")?Favorite:Contact;
		var queryCondition = (listGubun=="fav")?{"email":req.params.email}:((listGubun=="req")?{"req_email":req.params.email}:{"rcv_email":req.params.email});

		query = destCollection.find(queryCondition, function(err, result){
	                logger.info('Try to find all users - finish');
			if(err) {
				logger.error(err);
	       	                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
			} else if(result==null) {
				logger.error('No favorite list found...');
	       	                return res.status(500).send(custMsg.getMsg("NO_FAVORITE"));
			} 

			var listEmail = new Array();

			for (var i=0; i<result.length; i++) {
				if (listGubun=="fav")
					listEmail.push(result[i].favorite_email);
				else if (listGubun=="req")
					listEmail.push(result[i].rcv_email);
				else if (listGubun=="rcv")
					listEmail.push(result[i].req_email);
			}

			logger.info("listEmail="+listEmail);
			logger.info("result="+result);
			logger.info("result.req_email="+result.req_email);
//logger.info('Gubun Value : ', searchGubunStr + "_" + searchCommuteStr);

			query = User.find({"personal_info.email":{"$in":listEmail}}, function(err, users){
				if(err) {
					logger.error(err)
                        		return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
				} else if(users==null) {
					logger.error(custMsg.getMsg("NOT_FOUND"));
                        		return res.status(500).send(custMsg.getMsg("NOT_FOUND"));
				} else {
//					logger.info('people nearby:', users+"");
					var sort = (req.params.sort==null)?"point":req.params.sort;

					if (listGubun=="fav")
						makeUserList(listGubun, req, res, user, users, result, null);

					else {

						query = Favorite.find({"email":req.params.email}, function(err, favorites){
					                logger.info('Try to find all users - finish');
							if(err) {
								logger.error(err);
					       	                return res.status(500).send(custMsg.getMsg("SYS_ERROR"));
							} else if(favorites==null) {
								logger.error('No favorite list found...');
					       	                return res.status(500).send(custMsg.getMsg("NO_FAVORITE"));
							} 

							makeUserList(listGubun, req, res, user, users, result, favorites);
						});
					}
				}

			});
		})
	});
};


var makeUserList = function(listGubun, req, res, user, users, result, favorites) {

	var gubunTable = ["parent","sitter","parent"];
	var commuteTable = ["commute","resident","commute","resident","commute"];

	var gubun = user.personal_info.user_type;

	// 검색대상 회원구분값 세팅 : 시터 -> 부모 OR 부모 -> 시터
	var myGubunStr = gubunTable[gubun];
	var searchGubunStr = gubunTable[(gubun+1)%2];
	// 출퇴근 타입 - myCommuteStr : 내가 설정한 출퇴근 타입, searchCommuteStr : 검색할 출퇴근 타입
	var myCommuteStr = commuteTable[eval("user."+gubunTable[gubun]+"_info.commute_type")];
	var searchCommuteStr = commuteTable[eval("user."+gubunTable[gubun]+"_info.commute_type")];
	var userList = [];

	var today = new Date();
	var thisYear = today.getFullYear();
	var thisDate = (today.getMonth()+1)*100+today.getDate();

	var sortGubun = (sortGubun==null)?"point":sortGubun;

	logger.info('people number:', users.length);

	// 결과 리스트 작성
	for (var i=0;i<users.length;i++) {

		// 리스트 객체 생성
		var currentUser = {
			email:users[i].personal_info.email,
			name:users[i].personal_info.name,
                        img:(users[i].image_info.prf_img_url==undefined)?
                        	"http://siso4u.net/images/prf/nisclan1480031777958@hotmail.com.jpg":
                        	users[i].image_info.prf_img_url,
			age:0,
			brief:eval("users[i]."+searchGubunStr+"_info.brief"),
			addr:users[i].personal_info.addr1,
			salary:eval("users[i]."+searchGubunStr+"_info.salary"),
			commute:eval("users[i]."+searchGubunStr+"_info.commute_type"),
			children:eval("users[i]."+searchGubunStr+"_info.children_info"),
			testimonialCnt:users[i].personal_info.testimonial_count,
			favorite:"N",
			contactStatus:9,
			date:"",
			distance:0,
			distPoint:0,
			timeMatch:0,
			point:0
		};

		if (listGubun=="fav") {
			currentUser.favorite = "Y";
			for (var j=0;j<result.length;j++)
				if (result[j].favorite_email==currentUser.email) {
					currentUser.date = result[j].sys_reg_date.getTime();
					break;
				}
		} else {
			for (var j=0;j<favorites.length;j++)
				if (favorites[j].favorite_email==currentUser.email) {
					currentUser.favorite = "Y";
					break;
				}

			for (var j=0;j<result.length;j++)
				if (result[j].req_email==currentUser.email
					|| result[j].rcv_email==currentUser.email) {

					currentUser.contactStatus = result[j].status;

					if (listGubun=="req")
						currentUser.date = result[j].sys_req_date;
					else
						currentUser.date = result[j].sys_rcv_date;
					break;
				}
		}

		var age = thisYear - Math.floor(users[i].personal_info.birth_date/10000);
		if (thisDate<users[i].personal_info.birth_date%1000) age--;
		currentUser.age = age;

		currentUser.distance = getDistance(user.personal_info.lat, user.personal_info.lng, users[i].personal_info.lat, users[i].personal_info.lng);

		userList.push(currentUser);
	}

	// Sort before sending list to the client
	return res.status(200).json({group_first:sortList(userList, sortGubun, 100)});
};




var makeList = function(user, users, myGubunStr, searchGubunStr, myCommuteStr, searchCommuteStr, sortGubun, req, res) {

	logger.info("[MATCHING CASE] Searching from ["+myGubunStr+"]");
	logger.info("[MATCHING CASE] Searching for ["+searchGubunStr+"], From ["+myCommuteStr+"] to ["+searchCommuteStr+"]");

	var result = [];
/*
	var week = ["mon","tue","wed","thu","fri","sat","sun"];


	var scheduleRate = (eval("rate_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr))[0];
	var distRate = (eval("rate_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr))[1];
	var salaryRate = (eval("rate_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr))[2];

	var distTable = eval("distTable_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);
	var distValue = eval("distValue_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);
	var salTable = eval("salTable_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);
	var salValue = eval("salValue_"+searchGubunStr+"_"+myCommuteStr+"_"+searchCommuteStr);

	var targetCnt, matchCnt;
*/
	var today = new Date();
	var thisYear = today.getFullYear();
	var thisDate = (today.getMonth()+1)*100+today.getDate();

	sortGubun = (sortGubun==null)?"point":sortGubun;

	logger.info('people number:', users.length);
//	logger.info('thisYear:', thisYear);
//	logger.info('thisDate:', thisDate);



	// 대상에 대한 매칭 작업
	for (var i=0;i<users.length;i++) {

		targetCnt=0.0;
		matchCnt=0.0;

		// 리스트 객체 생성
		var currentUser = {
			email:users[i].personal_info.email,
			name:users[i].personal_info.name,
			img:users[i].image_info.prt_img_url,
//			img:"http://siso4u.net/images/prf/kyaku76@gmail.com.JPG",
			age:0,
			brief:eval("users[i]."+searchGubunStr+"_info.brief"),
			addr:users[i].personal_info.addr1,
			salary:eval("users[i]."+searchGubunStr+"_info.salary"),
			commute:eval("users[i]."+searchGubunStr+"_info.commute_type"),
			testimonialCnt:0,
			favorite:"N",
			date:"",
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


//		currentUser.distance = objDistance.get(users[i].personal_info.email);


//////////////////////////////////////////////////////////////
//              1. 스케쥴 점수 판정                         //
//////////////////////////////////////////////////////////////

		// 각 요일별 스케쥴 매칭율 산정
/*
		for (var y=0;y<week.length;y++) {
			// 각 시간별 스케쥴 매칭율 산정
			for (var z=0;z<7;z++) {
*/
/*
				logger.info('schedule String : ', eval("user."+myGubunStr+"_info."+week[y]));
				logger.info('schedule String : ', eval("users["+i+"]."+searchGubunStr+"_info."+week[y]));
				logger.info('schedule String : ', eval("user.parent_info."+week[y]).charAt(z) );
*/

				// 조회 주체의 스케쥴 값이 1일 경우 조회 상태의 스케쥴 값이 1이면 매칭, 0이면 비매칭
/*
				if (eval("user."+myGubunStr+"_info."+week[y]).charAt(z)=='1') {
					targetCnt++;
					if (eval("users["+i+"]."+searchGubunStr+"_info."+week[y]).charAt(z)=='1') matchCnt++;
				}
			}
		}
*/
/*
		logger.info('matchCnt:', matchCnt);
		logger.info('targetCnt:', targetCnt);
*/
		// 조회 주체의 전체 산정대상 대비 조회 상대의 매칭 비율값 산정
/*
		currentUser.timeMatch = (matchCnt/targetCnt) * 10;
		currentUser.point += currentUser.timeMatch * scheduleRate;
*/

//////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////
//              2. 거리 점수 판정                           //
//////////////////////////////////////////////////////////////

/*
		currentUser.distance = (objDistance[users[i].personal_info.email]).distance;

		for (var y=0;y<distTable.length;y++) 
			if (currentUser.distance < distTable[y]) {
				currentUser.distPoint = distValue[y-1] - (((currentUser.distance-distTable[y-1])/(distTable[y]-distTable[y-1]))*(distValue[y-1]-distValue[y]));
				currentUser.point +=  currentUser.distPoint * distRate;
				break;
			}
*/

//////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////
//              3. 급여 점수 판정                           //
//////////////////////////////////////////////////////////////

		// 둘중 하나의 시급정보가 협의일 경우 시급동일로 판단
/*
		if ( currentUser.salary == 0 || eval("user."+searchGubunStr+"_info.salary") == 0 ) 
			currentUser.point += 7 * salaryRate;
		else {
			for (var y=0;y<salTable.length;y++) 
				if (currentUser.salary - eval("user."+searchGubunStr+"_info.salary") <= salTable[y]) {
					currentUser.point += salValue[y] * salaryRate;
					break;
				}
		}
*/

//////////////////////////////////////////////////////////////

		// 산정된 조회 결과를 조회 리스트에 추가
		result.push(currentUser);
	}

	// Sort before sending list to the client
	return res.status(200).json(sortList(result, sortGubun, 100));
}

var sortList = function(list, sortGubun, listCnt) {
	// Sort before sending list to the client
	if ( sortGubun=="distance") 	// Nearest first
		list.sort(function (a,b) {return a.distance - b.distance});
	else if ( sortGubun=="salary") 	// Cheapest first
		list.sort(function (a,b) {return a.salary - b.salary});
	else				// Best Match - point first
		list.sort(function (a,b) {return b.date - a.date});

	return list.slice(0,listCnt);
}

//Generates hash using bCrypt
var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
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

// Converts numeric degrees to radians
function toRad(Value) 
{
	return Value * Math.PI / 180;
}
