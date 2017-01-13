
// 유저구분 및 REDIS 명칭 관련 기능
var userTypeTable = ["parent", "sitter"];
var commuteTypeTable = ["commute", "resident", "commute", "resident"];

exports.getTypeStr = function (user, gubun) {
	return getUserType(user, gubun);
}

exports.getCommuteStr = function (user, gubun) {
	return getCommuteType(user, gubun);
}

exports.getRedisStr = function (user, gubun) {
	if (gubun=="MY") 
		return  getUserType(user, "MY") + "_" + getCommuteType(user, "MY");
	else if (gubun=="OPPOSITE") 
		return  getUserType(user, "MY") + "_" + getCommuteType(user, "OPPOSITE");
	else if (gubun=="MATCH1") 
		return  getUserType(user, "OPPOSITE") + "_" + getCommuteType(user, "MY");
	else if (gubun=="MATCH2") 
		return  getUserType(user, "OPPOSITE") + "_" + getCommuteType(user, "OPPOSITE");
}

function getUserType (user, gubun) {
	if (gubun=="MY")
		return userTypeTable[user.personal_info.user_type];
	else
		return userTypeTable[(user.personal_info.user_type+1)%2];
}

function getCommuteType (user, gubun) {
	if (gubun=="MY")
		return commuteTypeTable[eval("user."+userTypeTable[user.personal_info.user_type]+"_info.commute_type")];
	else
		return commuteTypeTable[eval("user."+userTypeTable[user.personal_info.user_type]+"_info.commute_type")+1];
}
	
