(function(){
	var PolygonRenderer = function(webGlView) {
		this.webGlView = webGlView;
	};

	PolygonRenderer.prototype = new ObjectRenderer();
	PolygonRenderer.prototype.constructor = ObjectRenderer;

	PolygonRenderer.prototype.create = function(options) {
		options = options || {};
		var features = options.features || [];
		var fillColor = options.fillColor || 0x0000FF;
		var strokeColor = options.strokeColor || 0xFFFFFF;

		if(features == null || features.length == 0)
			return null;

		var geometry = new THREE.Geometry();
		var outline = new THREE.Geometry();
		var vertexOffset = geometry.vertices.length;
		var numPolygons = 0;

		for(var i=0; i<features.length; i++){
			var feature = features[i];
			if(feature.length == 0) continue;

			// iterate every feature which should contain a list of 
			// [array of polygons [outer loop], [inner loop 1], ..., [inner loop n]]
			for(var j=0; j<feature.length; j++){
				var polygon  = feature[j];
				for(var p=0; p<polygon.length; p++) {
					var loop = polygon[p];
					var points = [], holeIndices = [], holeIndex = 0;

					for(var l=0; l<loop.length; l++) {
						var coordinate = loop[l];
						var point = {x: coordinate[0], y: coordinate[1]};
						points.push(point.x);
						points.push(point.y);

						var vertex = new THREE.Vector3(point.x, point.y, 1001);
						geometry.vertices.push(vertex);

						var vertex1 = new THREE.Vector3(point.x, point.y, 1);
						outline.vertices.push(vertex1);

						if(l == loop.length-1) {
							var coord0 = loop[0];
							var point0 = {x: coord0[0], y: coord0[1]};
							var vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
							outline.vertices.push(vertex0);
						}else{
							var coord0 = loop[l+1];
							var point0 = {x: coord0[0], y: coord0[1]};
							var vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
							outline.vertices.push(vertex0);
						}
					}

					if(p>0) holeIndices.push(holeIndex);
					holeIndex += loop.length;

					var tris = earcut(points, null, 2);
					for(var k=0; k<tris.length; k+=3) {
						// 2-1-0 means face up
						var face = new THREE.Face3(
							tris[k+2] + vertexOffset, 
							tris[k+1] + vertexOffset, 
							tris[k+0] + vertexOffset
						);
						geometry.faces.push(face);
					}
					vertexOffset = geometry.vertices.length;
					numPolygons++;
				};	
			}
		}

		var coveragePolygon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
			color: fillColor,
			opacity: 0.25, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		var outlinePolygon = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({
			color: strokeColor,
			linewidth: 2,
			opacity: 0.25, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		this.webGlView.addObject(coveragePolygon);
		this.webGlView.addObject(outlinePolygon);

		return {shape: coveragePolygon, outline: outlinePolygon};
	};

	PolygonRenderer.prototype.add = function(geometry) {
		this.webGlView.addObject(geometry.shape);
		this.webGlView.addObject(geometry.outline);
	};

	PolygonRenderer.prototype.remove = function(geometry) {
		this.webGlView.removeObject(geometry.shape);
		this.webGlView.removeObject(geometry.outline);
	};

	window.PolygonRenderer = PolygonRenderer;
}());