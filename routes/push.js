var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var pushController = require('../controllers/controller_push.js');

// Routing starts....

//gets specified push
router.get('/list/:email/:count/:key', authController.isAuthenticated, function(req, res){
		pushController.getPushListByEmail(req, res);
	});

router.get('/unreadCount/:email', authController.isAuthenticated, function(req, res){
		pushController.getUnreadPushCountByEmail(req, res);
	});

router.post('/', authController.isAuthenticated, function(req, res){
		pushController.sendPushMsg(req, res);
	});

router.put('/', authController.isAuthenticated, function(req, res){
		pushController.updatePushReadStatus(req, res);
	});

router.delete('/', authController.isAuthenticated, function(req, res){
		pushController.deletePush(req, res);
	});

module.exports = router;
