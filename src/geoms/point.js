(function(){
	var Point = function(lat, lng, projection, properties) {
		this.latLng = new google.maps.LatLng(lat, lng);
		this.point = projection.fromLatLngToPoint(this.latLng);
		this.properties = properties ? properties : {};
		this.properties.latLng = this.latLng;
		this.properties.point = this.point;
	};

	window.Point = Point;
}());
