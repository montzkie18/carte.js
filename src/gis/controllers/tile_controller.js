(function(){

	var MERCATOR_RANGE = 256;

	function convertPointToTile(latLng, zoom, projection) {
		var worldCoordinate = projection.fromLatLngToPoint(latLng);
		var pixelCoordinate = {x: worldCoordinate.x * Math.pow(2, zoom), y: worldCoordinate.y * Math.pow(2, zoom)};
		var tileCoordinate = {x: Math.floor(pixelCoordinate.x / MERCATOR_RANGE), y: Math.floor(pixelCoordinate.y / MERCATOR_RANGE)};
		return tileCoordinate;
	}

	var TileController = function(webGlView, options) {
		this.webGlView = webGlView;
		options = options ? options : {};
		this.minZoom = (options.minZoom !== undefined) ? options.minZoom : 0;
		this.maxZoom = (options.maxZoom !== undefined) ? options.maxZoom : 10;
		this.clampedBounds = new Rectangle(0, 0, 0, 0);
		this.box = new Rectangle(0, 0, 0, 0);
		this.zoom = 0;
		this.enabled = false;
		this.views = [];
	};

	TileController.prototype.setMap = function(map) {
		if(map) {
			this.map = map;
			this.update();
			this._addEventListeners();
		} else {
			this._removeEventListeners();
			this.map = map;
		}
		return this;
	};

	TileController.prototype.addView = function(view) {
		var index = this.views.indexOf(view);
		if(index < 0) this.views.push(view);
		var b = this.clampedBounds;
		view.setTileSize(MERCATOR_RANGE);
		view.showTiles(b.ulx, b.uly, b.lrx, b.lry, this.zoom);
		return this;
	};

	TileController.prototype.removeView = function(view) {
		var index = this.views.indexOf(view);
		if(index >= 0) this.views.splice(index, 1);
		view.clear();
		return this;
	};

	TileController.prototype._addEventListeners = function() {
		this.changeListener = google.maps.event.addListener(this.map, "bounds_changed", this.update.bind(this));
	};

	TileController.prototype._removeEventListeners = function() {
		google.maps.event.removeListener(this.changeListener);
	};

	TileController.prototype.hasChangedZoom = function(zoom) {
		return this.zoom != zoom;
	};

	TileController.prototype.hasChangedBounds = function(visibleBounds) {
		var currentBounds = this.clampedBounds;
		return currentBounds.ulx != visibleBounds.ulx || 
			currentBounds.uly != visibleBounds.uly || 
			currentBounds.lrx != visibleBounds.lrx || 
			currentBounds.lry != visibleBounds.lry;
	};

	TileController.prototype.getTileBounds = function(boundsNwLatLng, boundsSeLatLng, zoom, projection) {
		var tileCoordinateNw = convertPointToTile(boundsNwLatLng, zoom, projection);
		var tileCoordinateSe = convertPointToTile(boundsSeLatLng, zoom, projection);
		return new Rectangle(tileCoordinateNw.x, tileCoordinateNw.y, 
				tileCoordinateSe.x-tileCoordinateNw.x, tileCoordinateSe.y-tileCoordinateNw.y);
	};

	TileController.prototype.update = function() {
		var map = this.map;
		var projection = map.getProjection();
		var zoom = map.getZoom(),
			bounds = map.getBounds(),
			boundsNeLatLng = bounds.getNorthEast(),
			boundsSwLatLng = bounds.getSouthWest(),
			boundsNwLatLng = new google.maps.LatLng(boundsNeLatLng.lat(), boundsSwLatLng.lng()),
			boundsSeLatLng = new google.maps.LatLng(boundsSwLatLng.lat(), boundsNeLatLng.lng());

		zoom = Math.max(this.minZoom, zoom);
		zoom = Math.min(this.maxZoom, zoom);

		var visibleBounds = this.getTileBounds(boundsNwLatLng, boundsSeLatLng, zoom, projection);
		var currentBounds = this.clampedBounds;
		var x = Math.min(currentBounds.ulx, visibleBounds.ulx),
			y = Math.min(currentBounds.uly, visibleBounds.uly),
			width = Math.max(currentBounds.lrx, visibleBounds.lrx) - x,
			height = Math.max(currentBounds.lry, visibleBounds.lry) - y;
		var range = new Rectangle(x, y, width, height);
		
		// Hide everything if we changed zoom level.
		// Then set the range to update only the visible tiles.
		if(this.hasChangedZoom(zoom)) {
			// Make sure that all currently visible tiles will be hidden.
			this.deleteTiles(currentBounds, currentBounds, new Rectangle(-1, -1, 0, 0), this.zoom);
			// Then make sure that all tiles that should be visible will call showTile below.
			currentBounds = new Rectangle(-1, -1, 0, 0);
			// We only need to update all visible tiles below.
			range = visibleBounds;
		}

		// Iterate all the layers to update which tiles are visible.
		if(this.hasChangedBounds(visibleBounds)) {
			this.updateTiles(range, currentBounds, visibleBounds, zoom);
		}
	};

	TileController.prototype.updateTiles = function(range, currentBounds, visibleBounds, zoom) {
		var views = this.views;
		for(var i=0; i<views.length; i++) {
			for(var column=range.ulx; column<=range.lrx; column++) {
				for(var row=range.uly; row<=range.lry; row++) {
					if(visibleBounds.containsPoint(column, row)) {
						// Only showTile if it's not already visible
						if(!currentBounds.containsPoint(column, row))
							views[i].showTile(column, row, zoom);
					}else{
						// Hide tile that is currently visible
						if(currentBounds.containsPoint(column, row))
							views[i].hideTile(column, row, zoom);
					}
				}
			}
			this.webGlView.draw();
		}
		this.zoom = zoom;
		this.clampedBounds = visibleBounds;
	};

	TileController.prototype.deleteTiles = function(range, currentBounds, visibleBounds, zoom) {
		var views = this.views;
		for(var i=0; i<views.length; i++) {
			for(var column=range.ulx; column<=range.lrx; column++) {
				for(var row=range.uly; row<=range.lry; row++) {
					if(!visibleBounds.containsPoint(column, row) && currentBounds.containsPoint(column, row)) {
						views[i].deleteTile(column, row, zoom);
					}
				}
			}
			this.webGlView.draw();
		}
		this.zoom = zoom;
		this.clampedBounds = visibleBounds;
	};

	TileController.prototype.getObjectUnderPoint = function(screenX, screenY) {
		var bounds = this.map.getBounds();
		var topLeft = new google.maps.LatLng(
			bounds.getNorthEast().lat(),
			bounds.getSouthWest().lng()
		);
		var offset = this.map.getProjection().fromLatLngToPoint(topLeft);
		var scale = Math.pow(2, this.zoom);
		var offsetX = offset.x * scale;
		var offsetY = offset.y * scale;
		var worldScale = 1/Math.pow(2, this.map.getZoom() - this.zoom);
		var worldX = screenX * worldScale;
		var worldY = screenY * worldScale;
		var box = this.box;
		var views = this.views;
		var column=0, row=0;

		// go through each tile and check where the mouse is
		for(column=this.clampedBounds.ulx; column<=this.clampedBounds.lrx; column++) {
			for(row=this.clampedBounds.uly; row<=this.clampedBounds.lry; row++) {
				box.update(column*MERCATOR_RANGE-offsetX, row*MERCATOR_RANGE-offsetY, MERCATOR_RANGE, MERCATOR_RANGE);
				if(box.containsPoint(worldX, worldY)) {
					// get the first hit object from the top most layer
					var outsideMaxZoom = this.zoom == this.map.getZoom();
					for(var i=views.length-1; i>=0; i--) {
						var object = views[i].getObjectUnderPointOnTile(screenX, screenY, column, row, this.zoom, outsideMaxZoom);
						if(object) return object;
					}
				}
			}
		}
		return null;
	};

	window.TileController = TileController;
}());
