var map;

document.addEventListener('DOMContentLoaded', function() {
	map = L.map('map').setView([ 48.1459, 17.1071 ], 13);

	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
	    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
	    maxZoom: 18,
	    id: 'mapbox.streets',
	    accessToken: 'pk.eyJ1Ijoic3RlZmFubW90a28iLCJhIjoiY2o5cjBvbXhkMzNqYjJ3czJyMnk0b3k4bCJ9.0XSxuHevcNytuVuTxifXbA'
	}).addTo(map);

map.on('click', onMapClick);
});

function onMapClick(e) {
	var xhr = new XMLHttpRequest();
	xhr.open('POST','api/nearestRoadPoint');
	xhr.responseType = 'json';
	xhr.setRequestHeader('Content-type', 'application/json');
	xhr.addEventListener('load', function() {
		L.polyline(xhr.response.coordinates.map(e => e.reverse())).addTo(map, {
		    color: 'red',
		    weight: 3,
		    opacity: 0.5,
		    smoothFactor: 1
		});
	});
	xhr.send(JSON.stringify(e.latlng));
}