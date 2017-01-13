
var custMsgs = []; // Array for error messages
var logMsg = true;

custMsgs.push({msgId:"SUCCESS",		msg: { msgCode:"SUC000", msgText:"처리가 완료되었습니다."}});
// Error messages
// Application Error which starts with 0XX
// 일반 오류
custMsgs.push({msgId:"NOT_FOUND",	msg: { msgCode:"ERR100", msgText:"해당하는 데이터가 존재하지 않습니다."}});
custMsgs.push({msgId:"INVALID_INPUT",	msg: { msgCode:"ERR110", msgText:"입력값이 올바르지 않습니다."}});

// 회원가입/로그인 관련 오류
custMsgs.push({msgId:"ID_NOT_EXIST",	msg: { msgCode:"ERR101", msgText:"해당 이메일 계정이 존재하지 않습니다."}});
custMsgs.push({msgId:"ID_EXIST",	msg: { msgCode:"ERR102", msgText:"해당 이메일 계정이 이미 존재합니다."}});
custMsgs.push({msgId:"INVALID_PASS",	msg: { msgCode:"ERR103", msgText:"계정 비밀번호 오류입니다."}});
custMsgs.push({msgId:"LOGIN_EMAIL_ERR",	msg: { msgCode:"ERR104", msgText:"로그인을 위한 이메일이 정확하지 않습니다."}});
custMsgs.push({msgId:"LOGIN_PASS_ERR",	msg: { msgCode:"ERR105", msgText:"로그인을 위한 비밀번호가 정확하지 않습니다."}});
custMsgs.push({msgId:"LOGOUT_EMAIL_ERR",msg: { msgCode:"ERR106", msgText:"로그아웃을 위한 이메일이 정확하지 않습니다."}});
custMsgs.push({msgId:"NO_EMAIL_FOUND",	msg: { msgCode:"ERR110", msgText:"입력하신 정보에 대한 계정을 찾을 수 없습니다."}});

// 유저정보 검증 오류
custMsgs.push({msgId:"INV_USER_EMAIL",	msg: { msgCode:"ERR110", msgText:"유효한 이메일 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_PASSWD",	msg: { msgCode:"ERR111", msgText:"유효한 비밀번호 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_NAME",	msg: { msgCode:"ERR112", msgText:"유효한 이름 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_BIRTH",	msg: { msgCode:"ERR113", msgText:"유효한 생년월일 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_PHONE",	msg: { msgCode:"ERR114", msgText:"유효한 전화번호 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_ADDR",	msg: { msgCode:"ERR115", msgText:"유효한 주소 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_POSTNO",	msg: { msgCode:"ERR116", msgText:"유효한 우편번호 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_GPS",	msg: { msgCode:"ERR117", msgText:"유효한 GPS 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_TYPE",	msg: { msgCode:"ERR118", msgText:"유효한 회원유형 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_PIC",	msg: { msgCode:"ERR119", msgText:"유효한 회원사진 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_COMM",	msg: { msgCode:"ERR120", msgText:"유효한 출근유형 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_SAL",	msg: { msgCode:"ERR121", msgText:"유효한 급여선택 값이 아닙니다."}});
custMsgs.push({msgId:"INV_USER_TIME",	msg: { msgCode:"ERR122", msgText:"유효한 근무스케쥴 값이 아닙니다."}});

// 세션확인 관련 오류
custMsgs.push({msgId:"NO_SESSION",	msg: { msgCode:"ERR200", msgText:"로그인이 필요한 서비스입니다."}});
custMsgs.push({msgId:"INVALID_SESSION",	msg: { msgCode:"ERR201", msgText:"로그인 세션이 만료되었습니다."}});

// SMS 인증 관련 오류 
custMsgs.push({msgId:"SMS_TIMEOUT",	msg: { msgCode:"ERR300", msgText:"SMS 인증가능시간이 만료되었습니다. 재요청하시기 바랍니다."}});
custMsgs.push({msgId:"SMS_ERROR",	msg: { msgCode:"ERR301", msgText:"SMS 인증번호가 올바르지 않습니다."}});

// 매칭/관심/연락처 요청 관련 오류
custMsgs.push({msgId:"NO_FAVORITE",	msg: { msgCode:"ERR400", msgText:"등록된 내역이 없습니다."}});
custMsgs.push({msgId:"FAVORITE_EXIST",	msg: { msgCode:"ERR401", msgText:"이미 관심등록된 사용자입니다."}});
custMsgs.push({msgId:"CONTACT_EXIST",	msg: { msgCode:"ERR410", msgText:"이미 연락처 요청된 사용자입니다."}});

// 유저 상태변경 관련 오류
custMsgs.push({msgId:"NO_STATUS_CODE",	msg: { msgCode:"ERR700", msgText:"존재하지 않는 상태코드입니다."}});

// 푸쉬 관련 오류
custMsgs.push({msgId:"PUSH_ERROR",	msg: { msgCode:"ERR800", msgText:"푸쉬발송이 실패하였습니다."}});
custMsgs.push({msgId:"RECEIVER_ERROR",	msg: { msgCode:"ERR801", msgText:"푸쉬 수신이 불가한 사용자입니다."}});


// System Error which starts with 2XX
custMsgs.push({msgId:"SYS_ERROR",	msg: { msgCode:"ERR900", msgText:"시스템 오류가 발생하였습니다."}});

// 정의되지 않은 에러 - 항상 마지막에 있어야 함
custMsgs.push({msgId:"NOT_DEFINE",	msg:{ msgCode:"ERR999", msgText:"정의되지 않은 에러입니다."}});


// 메시지 처리 함수
exports.getMsg = function( msgId ) {
	for ( var i=0 ; i<=custMsgs.length; i++ )
		if ( custMsgs[i].msgId == msgId )
			break;
//	logger.error(custMsgs[i].msg);
	return custMsgs[i].msg;
};
