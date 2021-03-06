var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var matchController = require('../controllers/controller_match.js');
var listController = require('../controllers/controller_list.js');
var userController = require('../controllers/controller_user.js');

// Routing starts....

//gets specified user
router.get('/:email', authController.isAuthenticated, function(req, res){
		userController.getParentByEmail(req, res);
	}) 

router.get('/detail/:email/:trg_email', authController.isAuthenticated, function(req, res){
		userController.getParentByEmail(req, res);
	})

//gets specified user
router.get('/list/:email', authController.isAuthenticated, function(req, res){
		matchController.getListBySitterEmail(req, res);
	});

router.get('/list/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		matchController.getListBySitterEmail(req, res);
	});

router.get('/favList/:email', authController.isAuthenticated, function(req, res){
		listController.getFavoriteListBySitterEmail(req, res);
	});

router.get('/favList/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		listController.getFavoriteListBySitterEmail(req, res);
	});

router.get('/reqList/:email', authController.isAuthenticated, function(req, res){
		listController.getReqListBySitterEmail(req, res);
	});

router.get('/reqList/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		listController.getReqListBySitterEmail(req, res);
	});

router.get('/rcvList/:email', authController.isAuthenticated, function(req, res){
		listController.getRcvListBySitterEmail(req, res);
	});

router.get('/rcvList/:email/sort/:sort', authController.isAuthenticated, function(req, res){
		listController.getRcvListBySitterEmail(req, res);
	});

router.get('/count/:email', authController.isAuthenticated, function(req, res){
		matchController.getParentCountBySitterEmail(req, res);
	});

//post-specific commands. likely won't be used
router.route('/')
	.get(function(req, res){
		res.send({message:"TODO create a new post in the database"});
	});

module.exports = router;
