var express = require('express');
var router = express.Router();

var sessionController = require('../controllers/controller_session.js');


//gets specified user
router.get('/', function(req, res){
		sessionController.checkSession(req, res);
}) 

module.exports = router;
