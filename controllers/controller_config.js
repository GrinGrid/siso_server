var fs = require('fs');
var logger = require('../lib/appLogger');


exports.getConfig = function(req, res){
  logger.info(__dirname);
  var data = fs.readFileSync(__dirname+'/../conf/config.conf', 'utf8');
  logger.info(req, 'Data : '+data);
  return res.status(200).json(JSON.parse(data));

};


