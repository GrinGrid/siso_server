var express = require('express');
var router = express.Router();
var mongoose = require( 'mongoose' );
var redis = require( 'redis' );
var execController = require('../controllers/controller_exec.js');

//Used for routes that must be authenticated.
function isAuthenticated (req, res, next) {
// if user is authenticated in the session, call the next() to call the next request handler 
// Passport adds this method to request object. A middleware is allowed to add properties to
// request and response objects
	
	console.log('API Authentication - start');

	var headers = req.headers;
	var session_key = headers['session-key'];

	console.log('API Authentication - session_key : ' + session_key);

	if ( session_key == undefined || session_key == "" ) {
		console.log('API Authentication - error : no sesseion value');
		// if the user is not authenticated then redirect him to the login page
		return res.redirect('/#login');
	} else {

		var redisc = redis.createClient(6379, '127.0.0.1');                     //connect to Redis

		redisc.on('error', function(err) {
		        console.log('Error ' + err);
		});

		redisc.hget(session_key, "session_date", function(err, value) {
			// When there is no session data in REDIS
			if (err) {
				redisc.quit();
				return res.redirect('/#login');
			}

			console.log("Session date : " + value);

			console.log('API Authentication - finish');
			redisc.quit();

			return next();
		});
	}

}

//Register the authentication middleware
//router.use('/users', isAuthenticated);
//router.use('/posts', isAuthenticated);

router.route('/redis/putgeodata')
	//gets all users
	.get(function(req, res){
		execController.putGeoDataForAllUsers(req, res);
	});

router.route('/mongo/makeUsers')
	//gets all users
	.get(function(req, res){
		execController.insertRandomUsers(req, res);
	});

router.route('/mongo/removeUsers')
	//gets all users
	.get(function(req, res){
		execController.removeRandomUsers(req, res);
	});

//post-specific commands. likely won't be used
router.route('/')
	.get(function(req, res){
		res.send({message:"TODO create a new post in the database"});
	});


module.exports = router;
