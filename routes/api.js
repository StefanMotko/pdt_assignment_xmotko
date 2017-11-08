var express = require('express');
var router = express.Router();
var pg = require('pg-promise')({});
var db = pg('postgres://gisuser:gispassword@localhost:5432/gisdb');

/* GET /api/ */
router.get('/', function(req, res, next) {
  res.render('apidoc', { title: 'Express' });
});

router.get('/random_func', function(req, res, next) {
	db.any('SELECT ST_AsGeoJSON(p.way) FROM planet_osm_point p WHERE p.amenity LIKE \'place_of_worship\' LIMIT 10').then((result) => {
		res.send(result.map(e => JSON.parse(e.st_asgeojson)));
	});
});

module.exports = router;
