var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var pushController = require('../controllers/controller_push.js');

// Routing starts....

//gets specified push
router.get('/list/:email/', authController.isAuthenticated, function(req, res){
		pushController.getPushListByEmail(req, res);
	});

router.get('/writelist/:email/', authController.isAuthenticated, function(req, res){
		pushController.getTestimonialWriteListByEmail(req, res);
	});

router.post('/', authController.isAuthenticated, function(req, res){
		pushController.writeTestimonial(req, res);
	});

router.put('/', authController.isAuthenticated, function(req, res){
		pushController.updateTestimonial(req, res);
	});

router.delete('/', authController.isAuthenticated, function(req, res){
		pushController.deleteTestimonial(req, res);
	});

module.exports = router;
