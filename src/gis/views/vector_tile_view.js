(function(){

	function colorToHex(b) {
		var hexChar = ["0", "1", "2", "3", "4", "5", "6", "7","8", "9", "a", "b", "c", "d", "e", "f"];
		return hexChar[(b >> 20) & 0x0f] + hexChar[(b >> 16) & 0x0f] + 
			hexChar[(b >> 12) & 0x0f] + hexChar[(b >> 8) & 0x0f] + 
			hexChar[(b >> 4) & 0x0f] + hexChar[b & 0x0f];
	}

	function getRandomColor() {
		return (Math.floor(255.0*Math.random()) & 0xFF) << 16 
			| (Math.floor(255.0*Math.random()) & 0xFF) << 8 
			| (Math.floor(255.0*Math.random()) & 0xFF);
	}

	var VectorTileView = function(tileProvider, webGlView, options) {
		this.tileProvider = tileProvider;
		this.webGlView = webGlView;
		this.iconImage = options.iconImage;
		this.fillColor = options.fillColor;
		this.fillOpacity = options.fillOpacity;
		this.strokeColor = options.strokeColor;
		this.strokeOpacity = options.strokeOpacity;
		this.tiles = {};
		this.shownTiles = {};
	};

	VectorTileView.prototype.setTileSize = function(tileSize) {
		this.tileSize = tileSize;
	};

	VectorTileView.prototype.setTileSize = function(tileSize) {
		this.tileSize = tileSize;
	};

	VectorTileView.prototype.showTiles = function(ulx, uly, lrx, lry, zoom) {
		for(var column=ulx; column<=lrx; column++) {
			for(var row=uly; row<=lry; row++) {
				this.showTile(column, row, zoom);
			}
		}
		this.webGlView.draw();
	};

	VectorTileView.prototype.showTile = function(x, y, z) {
		var url = this.tileProvider.getTileUrl(x, y, z);
		// console.log("Showing tile: " + url);
		if(this.shownTiles[url]) return;
		this.shownTiles[url] = true;

		if(this.tiles[url]) {
			if(this.tiles[url].polygons || this.tiles[url].lines)
				if(this.tiles[url].polygons)
					this.webGlView.addGeometry(this.tiles[url].polygons);
				if(this.tiles[url].lines)
					this.webGlView.addLine(this.tiles[url].lines);
			else if(this.tiles[url].data) 
				this.createFeatures(url, this.tiles[url].data);
		}else{
			var self = this;
			this.tileProvider.getTile(x, y, z)
				.then(function(response){
					self.tiles[url] = response;
					if(self.shownTiles[url])
						self.createFeatures(url, self.tiles[url].data);
				}, function(reason){
					console.log(reason);
				});
		}
	};

	VectorTileView.prototype.hideTile = function(x, y, z) {
		var url = this.tileProvider.getTileUrl(x, y, z);
		// console.log("Hiding tile: " + url);
		this.shownTiles[url] = false;

		if(this.tiles[url]) {
			if(this.tiles[url].polygons) {
				this.webGlView.removeGeometry(this.tiles[url].polygons);
				delete this.tiles[url].polygons;
				this.tiles[url].polygons = null;
			}

			if(this.tiles[url].lines) {
				this.webGlView.removeLine(this.tiles[url].lines);
				delete this.tiles[url].lines;
				this.tiles[url].lines = null;
			}

			if(this.tiles[url].points) {
				var points = this.tiles[url].points;
				for(var i=0; i<points.length; i++)
					this.webGlView.removePoint(points[i]);
				this.tiles[url].points = null;
			}
		}
	};

	VectorTileView.prototype.clear = function() {
		for(var url in this.tiles) {
			if(this.tiles[url].polygons) {
				this.webGlView.removeGeometry(this.tiles[url].polygons);
				delete this.tiles[url].polygons;
				this.tiles[url].polygons = null;
			}

			if(this.tiles[url].lines) {
				this.webGlView.removeLine(this.tiles[url].lines);
				delete this.tiles[url].lines;
				this.tiles[url].lines = null;
			}

			if(this.tiles[url].points) {
				var points = this.tiles[url].points;
				for(var i=0; i<points.length; i++)
					this.webGlView.removePoint(points[i]);
				this.tiles[url].points = null;
			}
		}
		this.webGlView.draw();
	};

	VectorTileView.prototype.createFeatures = function(url, features) {
		var added = false;

		if(features.polygons.length > 0) {
			var polygonOptions = {};
			polygonOptions.features = features.polygons;
			polygonOptions.fillColor = this.fillColor;
			polygonOptions.fillOpacity = this.fillOpacity;
			polygonOptions.strokeColor = this.strokeColor;
			polygonOptions.strokeOpacity = this.strokeOpacity;
			this.tiles[url].polygons = this.webGlView.createGeometry(polygonOptions);
			added = true;
		}

		if(features.lines.length > 0) {
			var lineOptions = {};
			lineOptions.features = features.lines;
			lineOptions.strokeColor = this.useRandomColors ? getRandomColor() : null;
			this.tiles[url].lines = this.webGlView.createLine(lineOptions);
			added = true;
		}

		var points = [];
		for(var i=0; i<features.points.length; i++) {
			var point = features.points[i];
			var markerOptions = {
				position: {x:point.x, y:point.y, z:100},
				color: {r:1, g:1, b:1},
				image: this.iconImage,
				imageName: this.iconImage.url
			};
			points.push(this.webGlView.addPoint(markerOptions));
		}
		this.tiles[url].points = points;

		if(added)
			this.webGlView.draw();
	};

	window.VectorTileView = VectorTileView;
}());