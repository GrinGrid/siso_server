var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var contactController = require('../controllers/controller_contact.js');

// Routing starts....

//gets specified user
router.get('/:email', authController.isAuthenticated, function(req, res){
//		contactController.getUserByEmail(req, res);
	}) 

router.post('/', authController.isAuthenticated, function(req, res){
		contactController.requestContact(req, res);
	}) 

router.post('/cancel', authController.isAuthenticated, function(req, res){
		contactController.cancelRequestedContact(req, res);
	}) 

router.post('/accept', authController.isAuthenticated, function(req, res){
		contactController.acceptRequestedContact(req, res);
	}) 

router.post('/reject', authController.isAuthenticated, function(req, res){
		contactController.rejectRequestedContact(req, res);
	}) 

router.post('/delete', authController.isAuthenticated, function(req, res){
		contactController.deleteContact(req, res);
	}) 

module.exports = router;
