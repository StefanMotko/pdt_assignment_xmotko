const pg = require('pg-promise')({});
const dbc = require('../appconfig.json');
const db = pg(`postgres://${dbc.username}:${dbc.password}@${dbc.host}:${dbc.port}/${dbc.name}`);

function nearestRoadPoint(x,y) {
	//
}

module.exports = {
	nearestRoadPoint
};