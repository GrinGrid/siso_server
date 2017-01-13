var winston = require("winston");
require("winston-daily-rotate-file");

winston.setLevels({
        trace: 0,
        input: 1,
        verbose: 2,
        prompt: 3,
        debug: 4,
        info: 5,
        data: 6,
        help: 7,
        warn: 8,
        error: 9
});

winston.addColors({
        trace: 'magenta',
        input: 'grey',
        verbose: 'cyan',
        prompt: 'grey',
        debug: 'blue',
        info: 'green',
        data: 'grey',
        help: 'cyan',
        warn: 'yellow',
        error: 'red'
});

var logger = new winston.Logger ({
	transports: [
		new winston.transports.Console({
	level : 'info' // Winston console log level
	}),
		new winston.transports.DailyRotateFile({
			timestamp: function() {
				var date = new Date();
				return date.toTimeString();
			},
			level : 'debug',
			json : false, // json 형식으로 로깅을 하지 않는다 (단순 text)
			dirname: __dirname+'/../logs/batch/',
			filename: 'log_',
			datePattern: 'yyyyMMdd.log'
		})
	]
});

module.exports = logger;
