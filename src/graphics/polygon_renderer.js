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
		var strokeColor = options.strokeColor || 0x000000;

		if(features == null || features.length == 0)
			return null;

		var geometry = new THREE.Geometry();
		var outline = new THREE.Geometry();
		var vertexOffset = geometry.vertices.length;
		var numPolygons = 0;

		for(var i=0; i<features.length; i++){
			var feature = features[i];
			if(feature.length == 0) continue;

			var points = [];
			for(var j=0; j<feature.length; j++){
				var point = {x: feature[j][0], y: feature[j][1]};
				points.push(point.x);
				points.push(point.y);

				var vertex = new THREE.Vector3(point.x, point.y, 1001);
				geometry.vertices.push(vertex);

				if(j>0) {
					var ppoint = {x: feature[j-1][0], y: feature[j-1][1]};
					var v1 = new THREE.Vector3(ppoint.x, ppoint.y, 1000);
					outline.vertices.push(v1);

					var v2 = new THREE.Vector3(point.x, point.y, 1000);
					outline.vertices.push(v2);
				}
			}

			var tris = earcut(points);
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
			i++;
		}

		var coveragePolygon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
			color: fillColor, opacity: 1.0
		}));

		var outlinePolygon = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({
			color: strokeColor,
			linewidth: 2
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