var express = require('express');
var router = express.Router();
var query = require('../query/query');

/* GET /api/ */
router.get('/', function(req, res, next) {
	res.render('apidoc', { title: 'Express' });
});

module.exports = router;
