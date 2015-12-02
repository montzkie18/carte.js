(function(){
	var MultiPolygon = function(polygons, properties) {
		this.polygons = polygons;
		this.properties  =properties;
	};

	MultiPolygon.prototype = new Geom();
	MultiPolygon.prototype.constructor = MultiPolygon;

	MultiPolygon.prototype.computeBoundingSphere = function() {
		if(!this.sphere) this.sphere = new THREE.Sphere();
		var points = [];
		for(var i=0; i<this.polygons.length; i++) {
			var polygon = this.polygons[i];
			if(polygon.rings.length > 0) {
				var ring = polygon.rings[0];
				for(var j=0; j<ring.length; j++) {
					points.push(new THREE.Vector3(ring[j].point.x, ring[j].point.y, 0));
				}
			}
		}
		this.sphere.setFromPoints(points);
	};

	MultiPolygon.prototype.intersectsSphere = function(sphere) {
		return this.sphere.intersectsSphere(sphere);
	};

	window.MultiPolygon = MultiPolygon;
}());