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

	var VectorTileView = function(tileProvider, webGlView, useRandomColors) {
		this.tileProvider = tileProvider;
		this.webGlView = webGlView;
		this.tiles = {};
		this.shownTiles = {};

		// used for debugging
		this.useRandomColors = useRandomColors;
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
		if(this.shownTiles[url]) return;
		this.shownTiles[url] = true;

		if(this.tiles[url]) {
			if(this.tiles[url].geometry) {
				this.webGlView.addGeometry(this.tiles[url].geometry);
			}
			else if(this.tiles[url].data) {
				var options = {};
				options.features = this.tiles[url].data;
				options.fillColor = this.useRandomColors ? getRandomColor() : null;
				this.tiles[url].geometry = this.webGlView.createGeometry(options);
				this.webGlView.draw();
			}
		}else{
			var self = this;
			this.tileProvider.getTile(x, y, z)
				.then(function(response){
					self.tiles[url] = response;
					if(self.shownTiles[url]) {
						var options = {};
						options.features = self.tiles[url].data;
						options.fillColor = self.useRandomColors ? getRandomColor() : null;
						self.tiles[url].geometry = self.webGlView.createGeometry(options);
						self.webGlView.draw();
					}
				}, function(reason){
					//console.log(reason);
				});
		}
	};

	VectorTileView.prototype.hideTile = function(x, y, z) {
		var url = this.tileProvider.getTileUrl(x, y, z);
		this.shownTiles[url] = false;

		if(this.tiles[url] && this.tiles[url].geometry) {
			this.webGlView.removeGeometry(this.tiles[url].geometry);
			delete this.tiles[url].geometry;
			this.tiles[url].geometry = null;
		}
	};

	VectorTileView.prototype.clear = function() {
		for(var url in this.tiles) {
			if(this.tiles[url].geometry)
				this.webGlView.removeGeometry(this.tiles[url].geometry);
		}
		this.webGlView.draw();
	};

	window.VectorTileView = VectorTileView;
}());