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
		var points = [];
		if(feature.geometry.type == "Polygon") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++) {
				for(var j=0; j<coordinates[i].length; j++) {
					var latLng = new google.maps.LatLng(coordinates[i][j][1], coordinates[i][j][0]);
					var point = this.projection.fromLatLngToPoint(latLng);
					points.push([point.x, point.y]);
				}
			}
		}
		return points;
	};

	window.GeoJSONDataSource = GeoJSONDataSource;
}());