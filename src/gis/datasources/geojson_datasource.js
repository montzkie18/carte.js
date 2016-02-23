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
		};
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
		var coordinates, rings, linearRing, i;
		if(feature.geometry.type == "Polygon") {
			coordinates = feature.geometry.coordinates;
			rings = [];
			for(i=0; i<coordinates.length; i++) {
				linearRing = coordinates[i];
				rings.push(this._parseCoordinates(linearRing));
			}
			polygons.push(new Polygon(rings, feature.properties));
		}
		else if(feature.geometry.type == "MultiPolygon") {
			coordinates = feature.geometry.coordinates;
			var subPolygons = [];
			for(i=0; i<coordinates.length; i++) {
				var polygonCoordinates = coordinates[i];
				rings = [];
				for(var j=0; j<polygonCoordinates.length; j++) {
					linearRing = polygonCoordinates[j];
					rings.push(this._parseCoordinates(linearRing));
				}
				subPolygons.push(new Polygon(rings, feature.properties));
			}
			polygons.push(new MultiPolygon(subPolygons, feature.properties));
		}
		else if(feature.geometry.type == "LineString") {
			lines.push(new Line(this._parseCoordinates(feature.geometry.coordinates), feature.properties));
		}
		else if(feature.geometry.type == "MultiLineString") {
			coordinates = feature.geometry.coordinates;
			var subLines = [];
			for(i=0; i<coordinates.length; i++) {
				var lineString = coordinates[i];
				subLines.push(new Line(this._parseCoordinates(lineString), feature.properties));
			}
			lines.push(new MultiLine(subLines, feature.properties));
		}
		else if(feature.geometry.type == "Point") {
			coordinates = feature.geometry.coordinates;
			points.push(new Point(coordinates[1], coordinates[0], this.projection, feature.properties));
		}
		return {polygons:polygons, points:points, lines:lines};
	};

	GeoJSONDataSource.prototype._parseCoordinates = function(coordinates) {
		var points = [];
		for(var i=0; i<coordinates.length; i++) {
			points.push(new Point(coordinates[i][1], coordinates[i][0], this.projection));
		}
		return points;
	};

	window.GeoJSONDataSource = GeoJSONDataSource;
}());