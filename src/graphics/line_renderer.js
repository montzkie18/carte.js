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
			var geom  = features[i];
			if(geom instanceof Line) {
				createLineVertices(geom, line);
			}else if(geom instanceof MultiLine) {
				for(var index in geom.lines) 
					createLineVertices(geom.lines[index], line);
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

	function createLineVertices(obj, line) {
		for(var pointIndex=0; j<obj.points.length; j++) {
			var p = obj.points[pointIndex];
			line.vertices.push(new THREE.Vector3(p.point.x, p.point.y, 1));
			if(j == obj.points.length-1) {
				p = obj.points[0];
				line.vertices.push(new THREE.Vector3(p.point.x, p.point.y, 1));
			}else{
				p = obj.points[j+1];
				line.vertices.push(new THREE.Vector3(p.point.x, p.point.y, 1));
			}
		}	
	}

	window.LineRenderer = LineRenderer;
}());