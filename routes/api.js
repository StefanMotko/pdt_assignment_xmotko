var express = require('express');
var router = express.Router();
var query = require('../query/query');

/* GET /api/ */
router.get('/', function(req, res, next) {
	res.render('apidoc', { title: 'Express' });
});

for (let index in query) {
	let item = query[index];
	router.post('/' + index, function(req, res, next) {
		item(req.body, res).then((data) => {
			res.status(200).send(JSON.parse(data.st_asgeojson));
		});
	});
}

module.exports = router;
