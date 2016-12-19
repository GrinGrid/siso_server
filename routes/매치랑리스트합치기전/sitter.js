var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var userController = require('../controllers/controller_user.js');
var matchController = require('../controllers/controller_match.js');
var listController = require('../controllers/controller_list.js');

// Routing starts....

//gets specified user
router.get('/detail/:email/:trg_email', authController.isAuthenticated, function(req, res){
		userController.getSitterByEmail(req, res);
	}) 

//gets specified user
router.get('/list/:email/', authController.isAuthenticated, function(req, res){
		matchController.getListByParentEmail(req, res);
	});

router.get('/list/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		matchController.getListByParentEmail(req, res);
	});

router.get('/favList/:email', authController.isAuthenticated, function(req, res){
		listController.getFavoriteListByParentEmail(req, res);
	});

router.get('/favList/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		listController.getFavoriteListByParentEmail(req, res);
	});

router.get('/reqList/:email', authController.isAuthenticated, function(req, res){
		listController.getReqListByParentEmail(req, res);
	});

router.get('/reqList/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		listController.getReqListByParentEmail(req, res);
	});

router.get('/rcvList/:email', authController.isAuthenticated, function(req, res){
		listController.getRcvListByParentEmail(req, res);
	});

router.get('/rcvList/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		listController.getRcvListByParentEmail(req, res);
	});

router.get('/count/:email', authController.isAuthenticated, function(req, res){
		matchController.getSitterCountByParentEmail(req, res);
	});

module.exports = router;
