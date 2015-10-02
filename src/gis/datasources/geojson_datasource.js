(function(){
	var GeoJSONDataSource = function(url, projection){
		this.url = url;
		this.projection = projection;
		this.fileExtension = "json";
		this.responseType = "json";
	};

	GeoJSONDataSource.prototype.parse = function(data) {
		var featureCollection = [];
		if(data) {
			if(data["type"] == "FeatureCollection") {
				var features = data["features"];
				for(var i=0; i<features.length; i++)
					featureCollection.push(this._parseFeature(features[i]));
			}else if(data["type"] == "Feature") {
				featureCollection.push(this._parseFeature(data));
			}
		}
		return featureCollection;
	};

	GeoJSONDataSource.prototype._parseFeature = function(feature) {
		var polygons = [];
		if(feature.geometry.type == "Polygon") {
			polygons.push(this._parsePolygon(feature.geometry.coordinates));
		}
		else if(feature.geometry.type == "MultiPolygon") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++)
				polygons.push(this._parsePolygon(coordinates[i]));
		}
		return polygons;
	};

	GeoJSONDataSource.prototype._parsePolygon = function(coordinates) {
		var polygon = [];
		for(var i=0; i<coordinates.length; i++) {
			var points = [];
			for(var j=0; j<coordinates[i].length; j++) {
				var latLng = new google.maps.LatLng(coordinates[i][j][1], coordinates[i][j][0]);
				var point = this.projection.fromLatLngToPoint(latLng);
				points.push([point.x, point.y]);
			}
			polygon.push(points);
		}
		return polygon;
	};

	window.GeoJSONDataSource = GeoJSONDataSource;
}());