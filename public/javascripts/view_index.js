var map;

var tripStart = null;
var tripEnd = null;
var tripStops = [];

var nextClick = null;

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

// function onMapClick(e) {
// 	var xhr = new XMLHttpRequest();
// 	xhr.open('POST','api/nearestRoadPoint');
// 	xhr.responseType = 'json';
// 	xhr.setRequestHeader('Content-type', 'application/json');
// 	xhr.addEventListener('load', function() {
// 		L.marker(xhr.response.coordinates.reverse()).addTo(map);
// 	});
// 	xhr.send(JSON.stringify(e.latlng));
// }

let waitingRequests = 0;

function setSource() {
	nextClick = clickSource;
}

function setTarget() {
	nextClick = clickTarget;
}

function setNearbyGas() {
	nextClick = nearbyGas;
}

function addTripStop() {
	nextClick = clickTripStop;
}

function nearbyGas(e) {

	L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
	waitingRequests++;
	document.body.style.cursor = 'wait';
	var xhr = new XMLHttpRequest();
	xhr.open('POST','api/gasStationsNearby');
	xhr.responseType = 'json';
	xhr.setRequestHeader('Content-type', 'application/json');
	xhr.addEventListener('load', function() {
		waitingRequests--;
		if (waitingRequests == 0) {
			document.body.style.cursor = 'default';
		}
		L.geoJSON(xhr.response).addTo(map);
		/*xhr.response.forEach((geojson) =>  {
			L.polyline(geojson.coordinates.map(e => e.reverse()), {
			    color: 'red',
			    weight: 3,
			    opacity: 0.5,
			    smoothFactor: 1
			}).addTo(map);
		});*/
	});
	xhr.send(JSON.stringify(e.latlng));
}

function tripCalculate() {

	if (tripStart == null || tripEnd == null) {
		return;
	}

	document.body.style.cursor = 'wait';
	var xhr = new XMLHttpRequest();
	xhr.open('POST','api/gasStationsForRoad');
	xhr.responseType = 'json';
	xhr.setRequestHeader('Content-type', 'application/json');
	xhr.addEventListener('load', function() {
		waitingRequests--;
		if (waitingRequests == 0) {
			document.body.style.cursor = 'default';
		}
		L.geoJSON(xhr.response).addTo(map);
		/*xhr.response.forEach((geojson) =>  {
			L.polyline(geojson.coordinates.map(e => e.reverse()), {
			    color: 'red',
			    weight: 3,
			    opacity: 0.5,
			    smoothFactor: 1
			}).addTo(map);
		});*/
	});
	xhr.send(JSON.stringify({
		source: tripStart.getLatLng(),
		target: tripEnd.getLatLng()
	}));
}

function calcStops() {

	//document.body.style.cursor = 'wait';
	var xhr = new XMLHttpRequest();
	xhr.open('POST','api/tripRange');
	xhr.responseType = 'json';
	xhr.setRequestHeader('Content-type', 'application/json');
	xhr.addEventListener('load', function() {
		/*waitingRequests--;
		if (waitingRequests == 0) {
			document.body.style.cursor = 'default';
		}*/
		alert(`The distance between the marked points is ${xhr.response.distance} meters`);
	});
	xhr.send(JSON.stringify({stops: tripStops.map(e => e.getLatLng())}));
}

function clickSource(e) {
	if (tripStart == null) {
		tripStart = L.circle([e.latlng.lat, e.latlng.lng], {color: 'red', radius: 750});
		tripStart.addTo(map);
	} else {
		tripStart.setLatLng(e.latlng);
	}
}

function clickTarget(e) {
	if (tripEnd == null) {
		tripEnd = L.circle([e.latlng.lat, e.latlng.lng], {color: 'green', radius: 750});
		tripEnd.addTo(map);
	} else {
		tripEnd.setLatLng(e.latlng);
	}
}

function onMapClick(e) {
	if (nextClick != null) {
		nextClick(e);
		nextClick = null;
	}
}

function clickTripStop(e) {
	tripStops.push(L.circle(e.latlng, {color: 'yellow', radius: 400}));
	tripStops[tripStops.length - 1].addTo(map);
}