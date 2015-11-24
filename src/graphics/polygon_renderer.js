(function(){
	var PolygonRenderer = function() {};

	PolygonRenderer.prototype = new ObjectRenderer();
	PolygonRenderer.prototype.constructor = PolygonRenderer;

	PolygonRenderer.prototype.create = function(options) {
		options = options || {};
		var features = options.features || [];
		var fillColor = (options.fillColor !== null && options.fillColor !== undefined) ? options.fillColor : 0x0000FF;
		var fillOpacity = (options.fillOpacity !== null && options.fillOpacity !== undefined) ? options.fillOpacity : 0.25;
		var strokeColor = (options.strokeColor !== null && options.strokeColor !== undefined) ? options.strokeColor : 0xFFFFFF;
		var strokeOpacity = (options.strokeOpacity !== null && options.strokeOpacity !== undefined) ? options.strokeOpacity : 0.25;

		if(features === null || features.length === 0)
			return null;

		var geometry = new THREE.Geometry();
		var outline = new THREE.Geometry();
		var vertexOffset = geometry.vertices.length;
		var numPolygons = 0;

		// iterate every polygon which should contain the following arrays:
		// [outer loop], [inner loop 1], ..., [inner loop n]
		for(var j=0; j<features.length; j++){
			var polygon  = features[j];
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

					var coord0, point0, vertex0;
					if(l == loop.length-1) {
						coord0 = loop[0];
						point0 = {x: coord0[0], y: coord0[1]};
						vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
						outline.vertices.push(vertex0);
					}else{
						coord0 = loop[l+1];
						point0 = {x: coord0[0], y: coord0[1]};
						vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
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
			}	
		}

		var coveragePolygon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
			color: fillColor,
			opacity: fillOpacity, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		var outlinePolygon = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({
			color: strokeColor,
			opacity: strokeOpacity,
			linewidth: 5,
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		return {shape: coveragePolygon, outline: outlinePolygon};
	};

	window.PolygonRenderer = PolygonRenderer;
}());