const pg = require('pg-promise')({});
const dbc = require('../appconfig.json').db;
const db = pg(`postgres://${dbc.username}:${dbc.password}@${dbc.host}:${dbc.port}/${dbc.name}`);

const vehicle_road_types = [
	 "trunk",
	 "primary",
	 "secondary",
	 "tertiary",
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

function nearestRoadPoint({lat, lng}, res) {
	return db.one(
		'SELECT ST_AsGeoJSON(ST_Transform(p.way,4326)::geography) \
		FROM planet_osm_roads p \
		WHERE p.highway IN (' + vehicle_road_types.map(e => "'" + e + "'").reduce((a,v) => a + ', ' + v) + ') \
		ORDER BY ST_Distance(ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857), p.way) ASC LIMIT 1',
	[lat, lng]);
}

module.exports = {
	nearestRoadPoint
};