var express = require('express');
var router = express.Router();
var custMsg = require( '../models/custom_msg' );

module.exports = function(passport){

/*
	//sends successful signup state back to angular
	router.get('/signup_success', function(req, res){
		res.send({state: 'success', user: req.user ? req.user : null});
	});

	//sends failure signup state back to angular
	router.get('/signup_failure', function(req, res){
		res.send({state: 'failure', user: null, message: "Invalid username or password"});
	});

	//sends successful login state back to angular
	router.get('/login_success', function(req, res){
		res.send({state: 'success', user: req.user ? req.user : null});
	});

	//sends failure login state back to angular
	router.get('/login_failure', function(req, res){
		res.send({state: 'failure', user: null, message: "Invalid username or password"});
	});

	//log in
	router.post('/login', passport.authenticate('login', {
		session: false,
		successRedirect: '/auth/login_success',
		failureRedirect: '/auth/login_failure'
	}));

	//sign up
	router.post('/signup', passport.authenticate('signup', {
		session: false,
		successRedirect: '/auth/signup_success',
		failureRedirect: '/auth/signup_failure'
	}));
*/

	//Login
	router.post('/login', function(req, res, next) {

		passport.authenticate('login', { session: false }, function(err, user, info) {
			if (err) { 
				return res.send(500, custMsg.getMsg("SYS_ERROR"));
			}
			if (!user) {
				if (info==null) {
				        console.log('');
					return res.send(500, custMsg.getMsg("SYS_ERROR"));
				} else {
					return res.send(500, custMsg.getMsg(info));
				}
			}

			return res.set("session-key",info).send(200, user.personal_info);

/*
		req.logIn(user, function(err) {
		if (err) { return next(err); }
		return res.redirect('/users/' + user.username);
		});
*/
		})(req, res, next);
	});

	//Sign up
	router.post('/signup', function(req, res, next) {

		passport.authenticate('signup', { session: false }, function(err, user, info) {
			if (err) { 
				return res.send(500, custMsg.getMsg("SYS_ERROR"));
			}
			if (!user) {
				if (info==null) {
				        console.log('');
					return res.send(500, custMsg.getMsg("SYS_ERROR"));
				} else {
					return res.send(500, custMsg.getMsg(info));
				}
			}

			return res.set("session-key",info).send(200, user.personal_info);
//			return res.send(200, "SUCCESS");

/*
		req.logIn(user, function(err) {
		if (err) { return next(err); }
		return res.redirect('/users/' + user.username);
		});
*/
		})(req, res, next);
	});

	//log out
	router.get('/logout', function(req, res) {
//		req.logout();
//		res.redirect('/');
	});

	return router;

}
