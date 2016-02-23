(function(){
	var MultiLine = function(lines, properties) {
		this.lines = lines;
		this.properties = properties;
	};

	MultiLine.prototype = new Geom();
	MultiLine.prototype.constructor = MultiLine;

	window.MultiLine = MultiLine;
}());