var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var userController = require('../controllers/controller_user.js');
var listController = require('../controllers/controller_list.js');

// Routing starts....
router.get('/member/checkUser/:email', function(req, res){
		userController.checkUserByEmail(req, res);
	});

//gets all users
router.get('/users', authController.isAuthenticated, function(req, res){
		userController.getUsers(req, res);
	});

//gets specified user
router.get('/users/:email', authController.isAuthenticated, function(req, res){
		userController.getUserByEmail(req, res);
	}) 

//updates specified user
router.put('/users/:email', authController.isAuthenticated, function(req, res){
		userController.updateUserByEmail(req, res);
	})

//deletes the user
router.delete('/users/:email', authController.isAuthenticated, function(req, res){
		userController.removeUserByEmail(req, res);
	});

//gets specified user
router.get('/sitter-list/:email/in/:distance', authController.isAuthenticated, function(req, res){
		listController.getListByParentEmail(req, res);
	});

router.get('/sitter-count/:email/in/:distance', authController.isAuthenticated, function(req, res){
		listController.getCountByParentEmail(req, res);
	});

//post-specific commands. likely won't be used
router.route('/')
	.get(function(req, res){
		res.send({message:"TODO create a new post in the database"});
	});

module.exports = router;
