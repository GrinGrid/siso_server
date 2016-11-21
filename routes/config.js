var express = require('express');
var router = express.Router();

var configController = require('../controllers/controller_config.js');


//gets specified user
router.get('/', function(req, res){
		configController.getConfig(req, res);
}) 

module.exports = router;
