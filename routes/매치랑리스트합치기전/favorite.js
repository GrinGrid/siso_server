var express = require('express');
var router = express.Router();

var authController = require('../controllers/controller_auth.js');
var favoriteController = require('../controllers/controller_favorite.js');

// Routing starts....

//gets specified user
router.get('/:email', authController.isAuthenticated, function(req, res){
//		favoriteController.getUserByEmail(req, res);
	}) 

router.post('/', authController.isAuthenticated, function(req, res){
		favoriteController.addFavorite(req, res);
	}) 

router.delete('/', authController.isAuthenticated, function(req, res){
		favoriteController.removeFavorite(req, res);
	}) 

module.exports = router;
