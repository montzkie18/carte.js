(function(){
	var LineRenderer = function() {};

	LineRenderer.prototype.init = function() { return this; };

	LineRenderer.prototype.draw = function() { return this; };

	LineRenderer.prototype.update = function() { return this; };

	LineRenderer.prototype.create = function(options) {
		options = options || {};
		var features = options.features || [];
		var strokeColor = (options.strokeColor !== null && options.strokeColor !== undefined) ? options.strokeColor : 0xFFFFFF;

		if(features === null || features.length === 0)
			return null;

		var line = new THREE.Geometry();

		// iterate every line which should contain the following array:
		// [linestring or array of points]
		for(var i=0; i<features.length; i++){
			var polygon  = features[i];
			for(var j=0; j<polygon.length; j++) {
				var coordinate = polygon[j];
				var point = {x: coordinate[0], y: coordinate[1]};

				var vertex1 = new THREE.Vector3(point.x, point.y, 1);
				line.vertices.push(vertex1);

				var coord0, point0, vertex0;
				if(j == polygon.length-1) {
					coord0 = polygon[0];
					point0 = {x: coord0[0], y: coord0[1]};
					vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
					line.vertices.push(vertex0);
				}else{
					coord0 = polygon[j+1];
					point0 = {x: coord0[0], y: coord0[1]};
					vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
					line.vertices.push(vertex0);
				}
			}	
		}

		var linePolygon = new THREE.LineSegments(line, new THREE.LineBasicMaterial({
			color: strokeColor,
			linewidth: 2,
			opacity: 0.25, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		return linePolygon;
	};

	window.LineRenderer = LineRenderer;
}());