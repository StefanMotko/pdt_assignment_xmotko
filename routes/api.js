var express = require('express');
var router = express.Router();
var query = require('../query/query');

let functionList = [];

/* GET /api/ */
router.get('/', function(req, res, next) {
	res.render('apidoc', { title: 'Express', flist: functionList });
});

for (let index in query) {

	let item = query[index];

	functionList.push({
		name: index,
		args: item.toString().split(/[()]/)[1].split(/[{}]/)[1].split(",")
	});

	router.post('/' + index, function(req, res, next) {
		item(req.body).then((data) => {
			res.status(200).send(data);
		});
	});
}

module.exports = router;
