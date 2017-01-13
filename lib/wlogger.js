var winston = require("winston");
require("winston-daily-rotate-file");

var log_email = "NOT LOGGED IN";

var logger = new winston.Logger ({
	transports: [
//		new winston.transports.Console({
//			level : 'info' // Winston console log level
//	}),
		new winston.transports.DailyRotateFile({
			timestamp: function() {
				var date = new Date();
				return date.toTimeString();
			},
			level : 'debug',
			json : false, // json 형식으로 로깅을 하지 않는다 (단순 text)
			dirname: __dirname+'/../logs/application/',
			filename: 'log_',
			datePattern: 'yyyyMMdd.log'
		})
	]
});

module.exports = logger;
