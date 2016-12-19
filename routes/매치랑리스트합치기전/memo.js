var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var matchController = require('../controllers/controller_match.js');

// Routing starts....

//gets specified user
router.get('/:email', authController.isAuthenticated, function(req, res){
		userController.getUserByEmail(req, res);
	}) 

//gets specified user
router.get('/list/:email/', authController.isAuthenticated, function(req, res){
		matchController.getListByParentEmail(req, res);
	});

router.get('/list/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		matchController.getListByParentEmail(req, res);
	});

router.get('/count/:email', authController.isAuthenticated, function(req, res){
		matchController.getSitterCountByParentEmail(req, res);
	});

module.exports = router;
