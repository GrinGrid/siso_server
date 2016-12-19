var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var smsController = require('../controllers/controller_sms.js');

// Routing starts....

//gets specified user
router.post('/', function(req, res){
		smsController.sendSMS(req, res);
	}) 
//gets specified user
router.post('/confirm', function(req, res){
		smsController.confirmSMS(req, res);
	}) 

module.exports = router;
