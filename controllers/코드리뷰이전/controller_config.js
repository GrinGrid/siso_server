var fs = require('fs');
var logger = require('../lib/wlogger');


exports.getConfig = function(req, res){
  logger.info(__dirname);
  var data = fs.readFileSync(__dirname+'/../data/config.conf', 'utf8');
  logger.info('Data : '+data);
  return res.status(200).json(JSON.parse(data));

};


