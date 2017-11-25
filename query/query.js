const pg = require('pg-promise')({});
const dbc = require('../appconfig.json').db;
const db = pg(`postgres://${dbc.username}:${dbc.password}@${dbc.host}:${dbc.port}/${dbc.name}`);

const vehicle_road_types = [
	 "trunk",
	 "primary",
	 "secondary",
	 "tertiary",
	 "motorway",
	 "unclassified",
	 "road",
	 "residential",
	 "service",
	 "motorway link",
	 "trunk link",
	 "primary link",
	 "secondary link",
	 "tertiary link"
];

function nearestRoadPoint({ lat, lng }, res) {
	return db.one(
		'WITH target AS (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857) as point) \
		SELECT ST_AsGeoJSON(ST_Transform(ST_ClosestPoint(p.way, (SELECT point FROM target)), 4326)::geography) \
		FROM planet_osm_roads p \
		WHERE p.highway IN (' + vehicle_road_types.map(e => "'" + e + "'").reduce((a,v) => a + ', ' + v) + ') \
		ORDER BY ST_Distance((SELECT point FROM target), p.way) ASC LIMIT 1',
	[lat, lng]).then((data) => JSON.parse(data.st_asgeojson));
}

function roadNet({ lat, lng, hops }, res) {
	return db.any(
		'WITH RECURSIVE roadnet AS \
		((WITH target AS (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857) as point) \
		SELECT p.way, 0 as hops \
		FROM planet_osm_roads p \
		WHERE p.highway IN (' + vehicle_road_types.map(e => "'" + e + "'").reduce((a,v) => a + ', ' + v) + ') \
		ORDER BY ST_Distance((SELECT point FROM target), p.way) ASC LIMIT 1) \
		UNION ALL \
		(SELECT p.way, r.hops + 1 FROM planet_osm_roads p \
		JOIN roadnet r ON ST_Touches(p.way, r.way) \
		WHERE (r.hops + 1) <= $3)) \
		SELECT ST_AsGeoJSON(ST_Transform(way, 4326)::geography) FROM (SELECT DISTINCT way FROM roadnet) as distroads'
	,[lat, lng, hops]).then((data) => data.map(e => JSON.parse(e.st_asgeojson)));
}

module.exports = {
	nearestRoadPoint,
	roadNet
};