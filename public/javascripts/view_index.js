var map;

document.addEventListener('DOMContentLoaded', function() {
	map = L.map('map').setView([ 48.1459, 17.1071 ], 13);
	var xhr = new XMLHttpRequest();
	xhr.open('GET','api/random_func');
	xhr.responseType = 'json';
	xhr.addEventListener('load', function() {
		xhr.response.map(e => L.marker(e.coordinates.reverse())).forEach(e => { e.addTo(map) });
	});
	xhr.send();

	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoic3RlZmFubW90a28iLCJhIjoiY2o5cjBvbXhkMzNqYjJ3czJyMnk0b3k4bCJ9.0XSxuHevcNytuVuTxifXbA'
}).addTo(map);
});