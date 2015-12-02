(function(){
	var Geom = function() {};

	Geom.prototype.setStart = function(value) {
		this.startIndex = value;
	};

	Geom.prototype.setEnd = function(value) {
		this.endIndex = value;
	};

	Geom.prototype.containsIndex = function(value) {
		return this.startIndex <= value && value <= this.endIndex;
	};

	window.Geom = Geom;
}());