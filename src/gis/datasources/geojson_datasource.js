(function(){
	var GeoJSONDataSource = function(url, projection){
		this.url = url;
		this.projection = projection;
		this.fileExtension = "json";
		this.responseType = "json";
	};

	GeoJSONDataSource.prototype.parse = function(data) {
		var featureCollection = {polygons:[], points:[], lines:[]};
		var self = this;
		var extractFeatures = function(data) {
			var feature = self._parseFeature(data);
			if(feature.polygons.length > 0)
				featureCollection.polygons = featureCollection.polygons.concat(feature.polygons);
			if(feature.points.length > 0)
				featureCollection.points = featureCollection.points.concat(feature.points);
			if(feature.lines.length > 0)
				featureCollection.lines = featureCollection.lines.concat(feature.lines);
		}
		if(data) {
			if(data.type == "FeatureCollection") {
				var features = data.features;
				for(var i=0; i<features.length; i++)
					extractFeatures(features[i]);
			}else if(data.type == "Feature") {
				extractFeatures(data);
			}
		}
		return featureCollection;
	};

	GeoJSONDataSource.prototype._parseFeature = function(feature) {
		var polygons = [], points = [], lines = [];
		if(feature.geometry.type == "Polygon") {
			var coordinates = feature.geometry.coordinates;
			var polygon = [];
			for(var i=0; i<coordinates.length; i++) {
				var linearRing = coordinates[i];
				polygon.push(this._parseCoordinates(linearRing));
			}
			polygons.push(polygon);
		}
		else if(feature.geometry.type == "MultiPolygon") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++) {
				var polygonCoordinates = coordinates[i];
				var polygon = [];
				for(var j=0; j<polygonCoordinates.length; j++) {
					var linearRing = polygonCoordinates[j];
					polygon.push(this._parseCoordinates(linearRing));
				}
				polygons.push(polygon);
			}
		}
		else if(feature.geometry.type == "LineString") {
			lines.push(this._parseCoordinates(feature.geometry.coordinates));
		}
		else if(feature.geometry.type == "MultiLineString") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++) {
				var lineString = coordinates[i];
				lines.push(this._parseCoordinates(lineString));
			}
		}
		else if(feature.geometry.type == "Point") {
			var coordinates = feature.geometry.coordinates;
			var latLng = new google.maps.LatLng(coordinates[1], coordinates[0]);
			var point = this.projection.fromLatLngToPoint(latLng);
			points.push({latLng: latLng, point: point});
		}
		return {polygons:polygons, points:points, lines:lines};
	};

	GeoJSONDataSource.prototype._parseCoordinates = function(coordinates) {
		var points = [];
		for(var i=0; i<coordinates.length; i++) {
			var latLng = new google.maps.LatLng(coordinates[i][1], coordinates[i][0]);
			var point = this.projection.fromLatLngToPoint(latLng);
			points.push([point.x, point.y]);
		}
		return points;
	};

	window.GeoJSONDataSource = GeoJSONDataSource;
}());