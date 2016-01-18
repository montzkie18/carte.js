(function(){
	var ImageTileView = function(tileProvider, webGlView, webServices) {
		this.tileProvider = tileProvider;
		this.webGlView = webGlView;
		this.webServices = webServices;
		this.tiles = {};
		this.shownTiles = {};
	};

	ImageTileView.prototype.setTileSize = function(tileSize) {
		this.tileSize = tileSize;
	};

	ImageTileView.prototype.showTiles = function(ulx, uly, lrx, lry, zoom) {
		for(var column=ulx; column<=lrx; column++) {
			for(var row=uly; row<=lry; row++) {
				this.showTile(column, row, zoom);
			}
		}
		this.webGlView.draw();
	};

	ImageTileView.prototype.showTile = function(x, y, z) {
		var url = this.tileProvider.getTileUrl(x, y, z);
		if(this.shownTiles[url]) return;
		this.shownTiles[url] = true;

		if(this.tiles[url]) {
			if(!this.tiles[url].geometry) {
				var scaleFactor = Math.pow(2, z);
				var spriteSize = this.tileSize / scaleFactor;
				var spriteOptions = {
					position: {x:x*spriteSize, y:y*spriteSize, z:z},
					width: spriteSize,
					height: spriteSize,
					image: this.tiles[url].data,
					imageName: url
				};
				this.tiles[url].geometry = this.webGlView.addSprite(spriteOptions);
				this.webGlView.draw();
			}
		}else{
			this.webServices.checkLayerTile(url)
				.then(function (response) {
					//console.log('Response: ', response);
					if (response.data.is_tile_exist) {
						var self = this;
						this.tileProvider.getTile(x, y, z)
							.then(function(response){
								self.tiles[url] = response;
								var scaleFactor = Math.pow(2, z);
								var spriteSize = self.tileSize / scaleFactor;
								var spriteOptions = {
									position: {x:x*spriteSize, y:y*spriteSize, z:z},
									width: spriteSize,
									height: spriteSize,
									image: self.tiles[url].data,
									imageName: url
								};
								if(self.shownTiles[url]) {
									self.tiles[url].geometry = self.webGlView.addSprite(spriteOptions);
									self.webGlView.draw();
								}
							}, function(reason){
								//console.log(reason);
							});
					}
				}, function (reason) {
					console.log(reason);
				});
		}
	};

	ImageTileView.prototype.hideTile = function(x, y, z) {
		var url = this.tileProvider.getTileUrl(x, y, z);
		this.shownTiles[url] = false;
		if(this.tiles[url] && this.tiles[url].geometry) {
			this.webGlView.removeSprite(this.tiles[url].geometry);
			this.tiles[url].geometry = null;
		}
	};

	ImageTileView.prototype.clear = function() {
		for(var url in this.tiles) {
			if(this.tiles[url].geometry) {
				this.webGlView.removeSprite(this.tiles[url].geometry);
				this.tiles[url].geometry = null;
			}
		}
		for(var url in this.shownTiles) this.shownTiles[url] = false;
		this.webGlView.draw();
	};

	ImageTileView.prototype.getObjectUnderPointOnTile = function(pointX, pointY, tileX, tileY, zoom) {
		// image tiles are not clickable for now
		return null;
	};

	window.ImageTileView = ImageTileView;
}());