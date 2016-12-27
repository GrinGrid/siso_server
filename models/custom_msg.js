//var logger = require("../lib/wlogger");

var custMsgs = []; // Array for error messages
var logMsg = true;

// Error messages
// Application Error which starts with 1XX
custMsgs.push({msgId:"NOT_FOUND",	msg: { msgCode:"ERR000", msgText:"해당하는 데이터가 존재하지 않습니다."}});

custMsgs.push({msgId:"ID_NOT_EXIST",	msg: { msgCode:"ERR010", msgText:"해당 이메일 계정이 존재하지 않습니다."}});
custMsgs.push({msgId:"ID_EXIST",	msg: { msgCode:"ERR011", msgText:"해당 이메일 계정이 이미 존재합니다."}});
custMsgs.push({msgId:"INVALID_PASS",	msg: { msgCode:"ERR012", msgText:"계정 비밀번호 오류입니다."}});
custMsgs.push({msgId:"NO_SESSION",	msg: { msgCode:"ERR020", msgText:"로그인이 필요한 서비스입니다."}});
custMsgs.push({msgId:"INVALID_SESSION",	msg: { msgCode:"ERR021", msgText:"로그인 세션이 만료되었습니다."}});

custMsgs.push({msgId:"SMS_TIMEOUT",	msg: { msgCode:"ERR031", msgText:"SMS 인증가능시간이 만료되었습니다. 재요청하시기 바랍니다."}});
custMsgs.push({msgId:"SMS_ERROR",	msg: { msgCode:"ERR032", msgText:"SMS 인증번호가 올바르지 않습니다."}});

custMsgs.push({msgId:"NO_FAVORITE",	msg: { msgCode:"ERR040", msgText:"등록된 내역이 없습니다."}});
custMsgs.push({msgId:"CONTACT_EXIST",	msg: { msgCode:"ERR041", msgText:"이미 연락처 요청된 사용자입니다."}});

custMsgs.push({msgId:"PUSH_ERROR",	msg: { msgCode:"ERR081", msgText:"푸쉬발송이 실패하였습니다."}});

// System Error which starts with 2XX
custMsgs.push({msgId:"SYS_ERROR",	msg: { msgCode:"ERR201", msgText:"시스템 오류가 발생하였습니다."}});

// This should be the last message
custMsgs.push({msgId:"NOT_DEFINE",	msg:{ msgCode:"ERR999", msgText:"정의되지 않은 에러입니다."}});

exports.getMsg = function( msgId ) {
	for ( var i=0 ; i<=custMsgs.length; i++ )
		if ( custMsgs[i].msgId == msgId )
			break;
//	logger.error(custMsgs[i].msg);
	return custMsgs[i].msg;
};
