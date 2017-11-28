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

function nearestRoadPoint({ lat, lng }) {
	return db.one(
		`WITH target AS (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857) as point) 
		SELECT ST_AsGeoJSON(ST_Transform(ST_ClosestPoint(p.way, (SELECT point FROM target)), 4326)::geography) 
		FROM planet_osm_roads p  
		ORDER BY ST_Distance((SELECT point FROM target), p.way) ASC LIMIT 1`
	,[lat, lng]).then((data) => JSON.parse(data.st_asgeojson));
}

function roadNet({ lat, lng, hops }) {
	return db.any(
		`WITH RECURSIVE roadnet AS 
		((WITH target AS (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857) as point) 
		SELECT p.osm_id, p.way, 0 as hops, NULL::bigint as preceding_id 
		FROM planet_osm_roads p 
		WHERE p.highway IN ('trunk', 'primary', 'secondary', 'tertiary', 'motorway', 'unclassified', 'road', 'residential', 
			                    'service', 'motorway link', 'trunk link', 'primary link', 'secondary link', 'tertiary link') 
		ORDER BY ST_Distance((SELECT point FROM target), p.way) ASC LIMIT 1) 
		UNION ALL 
		(SELECT p.osm_id, p.way, r.hops + 1, r.osm_id as preceding_id FROM planet_osm_roads p 
		JOIN roadnet r ON ST_Touches(p.way, r.way) 
		WHERE (r.hops + 1) <= $3)) 
		SELECT ST_AsGeoJSON(ST_Transform(way, 4326)::geography) FROM (SELECT DISTINCT way FROM roadnet) as distroads`
	,[lat, lng, hops]).then((data) => data.map(e => JSON.parse(e.st_asgeojson)));
}

function gasStationsNearby({ lat, lng }) {
	return db.any(
		`WITH road_to_gas AS (SELECT path FROM (WITH RECURSIVE roadnet AS 
	(
		(WITH target AS (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857) as point) 
		SELECT 
			p.osm_id, 
			p.way,
			NULL::bigint as preceding_id, 
			CASE WHEN p.osm_id IN (SELECT road_id FROM fuel_roads) THEN 1 ELSE 0 END as found,
			CASE WHEN p.osm_id IN (SELECT road_id FROM fuel_roads) THEN 1 ELSE 0 END as globalfound,
			ARRAY[p.osm_id] as path,
			false as cycle
		FROM planet_osm_roads p 
		WHERE p.highway IN ('trunk', 'primary', 'secondary', 'tertiary', 'motorway', 'unclassified', 'road', 'residential', 
				    'service', 'motorway link', 'trunk link', 'primary link', 'secondary link', 'tertiary link') 
		ORDER BY ST_Distance((SELECT point FROM target), p.way) ASC
		LIMIT 1) 
	UNION ALL 
		(SELECT 
			p.osm_id, 
			p.way,
			r.osm_id as preceding_id, 
			CASE WHEN p.osm_id IN (SELECT road_id FROM fuel_roads) THEN 1 ELSE 0 END as found,
			max(CASE WHEN p.osm_id IN (SELECT road_id FROM fuel_roads) THEN 1 ELSE 0 END) over () as globalfound,
			path || p.osm_id,
			p.osm_id = ANY(path)
		FROM planet_osm_roads p 
		JOIN roadnet r 
			ON ST_Touches(p.way, r.way)
		WHERE found = globalfound
		AND NOT cycle)
	)
	SELECT DISTINCT 
		osm_id, 
		path, 
		array_length(path, 1)
	FROM roadnet
	WHERE found = 1
	ORDER BY array_length(path, 1) ASC
	LIMIT 1) as gasroute LIMIT 1
)
SELECT ST_AsGeoJSON(ST_Transform(way, 4326)::geography) FROM planet_osm_roads WHERE osm_id IN (SELECT unnest((SELECT * FROM road_to_gas)))
UNION SELECT ST_AsGeoJSON(ST_Transform(way, 4326)::geography) from fuel_roads WHERE (select (SELECT * FROM road_to_gas)[array_length((SELECT * FROM road_to_gas),1)]) = road_id`
	,[lat, lng]).then((data) => {
		let features = data.map(e => ({
			geometry: JSON.parse(e.st_asgeojson),
			type: 'Feature'
		}));
		return {
			type: 'FeatureCollection',
			features
		}
	});
}

function gasStationsForRoad({ source, target }) {
	return db.any(
		`WITH source AS (SELECT ST_SetSRID(ST_MakePoint($2, $1), 4326) as point),
		target AS (SELECT ST_SetSRID(ST_MakePoint($4, $3), 4326) as point),
		line AS (SELECT ST_MakeLine((SELECT point FROM source),(SELECT point FROM target))::geography as lineway),
		linebuffer AS (SELECT ST_Buffer((SELECT lineway FROM line),ST_Length((SELECT lineway FROM line))/4) as buff)
		SELECT ST_AsGeoJSON(ST_Transform(way, 4326)::geography) FROM planet_osm_point p 
		WHERE amenity LIKE 'fuel' 
		AND ST_Within(ST_Transform(p.way, 4326), (SELECT buff FROM linebuffer)::geometry) 
		AND ST_Length((SELECT lineway FROM line)::geometry) > ST_Distance((SELECT point FROM target), ST_Transform(p.way, 4326))
		AND ST_Length((SELECT lineway FROM line)::geometry) > ST_Distance((SELECT point FROM source), ST_Transform(p.way, 4326))`
	,[source.lat, source.lng, target.lat, target.lng]).then((data) => {
		let features = data.map(e => ({
			geometry: JSON.parse(e.st_asgeojson),
			type: 'Feature'
		}));
		return {
			type: 'FeatureCollection',
			features
		}
	});
}

function tripRange({stops}) {
	let stops_prep = stops.map(e => `ST_SetSRID(ST_MakePoint(${e.lng}, ${e.lat}), 4326)`).reduce((a,v) => a + ',' + v);
	return db.one(
		`WITH roadPoints AS (SELECT ST_ClosestPoint(
		(SELECT ST_Transform(p.way, 4326) FROM planet_osm_roads p ORDER BY ST_Distance(ST_Transform(p.way, 4326), input.way) ASC LIMIT 1),
		input.way) as way, row_number() OVER () as rownum  FROM (SELECT unnest(ARRAY[${stops_prep}]) as way) as input) 
		SELECT sum(ST_Distance(r.way::geography, rr.way::geography)) FROM roadPoints r JOIN roadPoints rr ON r.rownum = rr.rownum + 1`
	).then((data) => ({ distance: data.sum}));
}

module.exports = {
	nearestRoadPoint,
	roadNet,
	gasStationsNearby,
	gasStationsForRoad,
	tripRange
};