var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var userController = require('../controllers/controller_user.js');
var custMsg = require( '../models/custom_msg' );

module.exports = function(passport){

	//Log in
	router.post('/login', function(req, res, next) {
		userController.loginUser(req, res, passport, next);
	});

	//Log out
	router.post('/logout', function(req, res){
		userController.logoutUser(req, res);
	});

	//Sign up
	router.post('/', function(req, res, next) {
		userController.signupUser(req, res, passport, next);
	});

	// Check if the same email exists
	router.get('/checkUser/:email', function(req, res){
		userController.checkUserByEmail(req, res);
	});

	// Find for a certain email
	router.post('/findEmail', function(req, res){
		userController.findEmailByUserInfo(req, res);
	});

	// Find for password 
	router.post('/findPassword', function(req, res){
		userController.sendEmailToSetPassword(req, res);
	});

	// Set user password 
	router.get('/set_password/:hashkey', function (req, res) {
		userController.setPassword(req, res);
	});

	// Set user password 
	router.post('/update_password/', function (req, res) {
		userController.updatePassword(req, res);
	});

	//gets all users
	router.get('/list', authController.isAuthenticated, function(req, res){
		userController.getUsers(req, res);
	});

	//gets specified user by email
	router.get('/:email', authController.isAuthenticated, function(req, res){
		userController.getUserByEmail(req, res);
	}) 

	//updates specified user by email
	router.put('/', authController.isAuthenticated, function(req, res){
		userController.updateUserByEmail(req, res);
	})

	//deletes the user by email
	router.delete('/', authController.isAuthenticated, function(req, res){
		userController.removeUserByEmail(req, res);
	});

        return router;
}
