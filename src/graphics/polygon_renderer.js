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

		// iterate every polygon which should contain the following arrays:
		// [outer loop], [inner loop 1], ..., [inner loop n]
		for(var j=0; j<features.length; j++){
			var geom  = features[j];
			geom.setStart(geometry.vertices.length);

			if(geom instanceof Polygon) {
				createPolygonVertices(geom, geometry, outline, vertexOffset);
				vertexOffset = geometry.vertices.length;
			}else if(geom instanceof MultiPolygon) {
				for(var index in geom.polygons) {
					createPolygonVertices(geom.polygons[index], geometry, outline, vertexOffset);
					vertexOffset = geometry.vertices.length;
				}
			}

			geom.setEnd(geometry.vertices.length);
		}

		geometry.computeFaceNormals();
		geometry.computeBoundingSphere();
		geometry.computeBoundingBox();

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


	function createPolygonVertices(polygon, geometry, outline, vertexOffset) {
		for(var ringIndex=0; ringIndex<polygon.rings.length; ringIndex++) {
			var ring = polygon.rings[ringIndex];
			var points = [], holeIndices = [], holeIndex = 0;

			for(var pointIndex=0; pointIndex<ring.length; pointIndex++) {
				var p = ring[pointIndex];
				points.push(p.point.x);
				points.push(p.point.y);

				geometry.vertices.push(new THREE.Vector3(p.point.x, p.point.y, 3990));
				outline.vertices.push(new THREE.Vector3(p.point.x, p.point.y, 1));

				if(pointIndex == ring.length-1) {
					p = ring[0];
					outline.vertices.push(new THREE.Vector3(p.point.x, p.point.y, 1));
				}else{
					p = ring[pointIndex+1];
					outline.vertices.push(new THREE.Vector3(p.point.x, p.point.y, 1));
				}
			}

			if(ringIndex>0) holeIndices.push(holeIndex);
			holeIndex += ring.length;

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
		}
	}

	window.PolygonRenderer = PolygonRenderer;
}());