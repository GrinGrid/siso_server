var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var testimonialController = require('../controllers/controller_testimonial.js');

// Routing starts....

//gets specified testmonial
router.get('/list/:email/', authController.isAuthenticated, function(req, res){
		testimonialController.getTestimonialListByEmail(req, res);
	});

router.get('/writelist/:email/', authController.isAuthenticated, function(req, res){
		testimonialController.getTestimonialWriteListByEmail(req, res);
	});

router.post('/', authController.isAuthenticated, function(req, res){
		testimonialController.writeTestimonial(req, res);
	});

router.put('/', authController.isAuthenticated, function(req, res){
		testimonialController.updateTestimonial(req, res);
	});

router.delete('/', authController.isAuthenticated, function(req, res){
		testimonialController.deleteTestimonial(req, res);
	});

module.exports = router;
