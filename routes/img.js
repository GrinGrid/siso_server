var express = require('express');
var router = express.Router();

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var authController = require('../controllers/controller_auth.js');
var fileController = require('../controllers/controller_file.js');
var custMsg = require( '../models/custom_msg' );

//upload an image
//router.post('/', multipartMiddleware, function(req, res){
router.post('/', authController.isAuthenticated, multipartMiddleware, function(req, res){
	fileController.uploadImage(req, res);
});

/*
//updates an image
router.put('/', authController.isAuthenticated, function(req, res){
	fileController.replaceImage(req, res);
})

//deletes an image
router.delete('/', authController.isAuthenticated, function(req, res){
	fileController.removeImage(req, res);
});
*/

router.get('/', function(req, res){
  res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<form action="/img" enctype="multipart/form-data" method="post">'+
    '<input type="text" name="email"><br>'+
    '<input type="text" name="gubun"><br>'+
    '<input type="file" name="file" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
});

module.exports = router;
