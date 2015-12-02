(function(){
	var Polygon = function(rings, properties) {
		this.rings = rings;
		this.properties = properties;
		this.sphere = new THREE.Sphere();
	};

	Polygon.prototype = new Geom();
	Polygon.prototype.constructor = Polygon;

	Polygon.prototype.computeBoundingSphere = function() {
		if(this.rings.length > 0) {
			var ring = this.rings[0];
			var points = [];
			for(var i=0; i<ring.length; i++) {
				points.push(new THREE.Vector3(ring[i].point.x, ring[i].point.y, 0));
			}
			this.sphere.setFromPoints(points);
		}
	};

	Polygon.prototype.intersectsSphere = function(sphere) {
		return this.sphere.intersectsSphere(sphere);
	};

	Polygon.prototype.getCenter = function() {
		return this.sphere.center;
	};

	window.Polygon = Polygon;
}());