(function(){
	var Line = function(points, properties) {
		this.points = points;
		this.properties = properties;
	};

	Line.prototype = new Geom();
	Line.prototype.constructor = Line;

	window.Line = Line;
}());