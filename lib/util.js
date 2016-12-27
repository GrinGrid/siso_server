var userTypeTable = ["parent", "sitter"];
var commuteTypeTable = ["commute", "resident", "commute", "resident"];

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
	
exports.getRedisStr = function (user, gubun) {
	if (gubun=="MY") 
		return  getUserType(user, "MY") + "_" + getCommuteType(user, "MY");
	else if (gubun=="MATCH1") 
		return  getUserType(user, "OPPOSITE") + "_" + getCommuteType(user, "MY");
	else if (gubun=="MATCH2") 
		return  getUserType(user, "OPPOSITE") + "_" + getCommuteType(user, "OPPOSITE");
}

