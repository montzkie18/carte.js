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

	var VectorTileView = function(tileProvider, webGlView, options, webServices) {
		this.tileProvider = tileProvider;
		this.webGlView = webGlView;
		this.iconImage = options.iconImage;
		this.fillColor = options.fillColor;
		this.fillOpacity = options.fillOpacity;
		this.strokeColor = options.strokeColor;
		this.strokeOpacity = options.strokeOpacity;
		this.webServices = webServices;
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		this.mouse3D = new THREE.Vector3();
		this.mouseSphere = new THREE.Sphere();
		this.tiles = {};
		this.shownTiles = {};
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
			self.webServices.checkLayerTile(url)
				.then(function (response) {
					if (response.data.is_tile_exist) {
						self.tileProvider.getTile(x, y, z)
							.then(function(response){
								self.tiles[url] = response;
								var features = response.data;
								var polygons = features.polygons;
								for(var i=0; i<polygons.length; i++)
									polygons[i].computeBoundingSphere();
								if(self.shownTiles[url])
									self.createFeatures(url, features);
							}, function(reason){
								console.log(reason);
							});
					}
				}, function (reason) {
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
		for(var url in this.shownTiles) this.shownTiles[url] = false;
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
			var p = features.points[i];
			var markerOptions = {
				position: {x:p.point.x, y:p.point.y, z:100},
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

	VectorTileView.prototype.getObjectUnderPointOnTile = function(screenX, screenY, tileX, tileY, zoom, sphereCollision) {
		var url = this.tileProvider.getTileUrl(tileX, tileY, zoom);
		if(this.tiles[url] && this.tiles[url].polygons) {
			var tile = this.tiles[url];
			var scale = 1/Math.pow(2, zoom);
			// normalize screenX from -1 to 1
			this.mouse.x = (screenX / this.webGlView.width) * 2 - 1;
			// normalize screenY from 1 to -1
			this.mouse.y = -(screenY / this.webGlView.height) * 2 + 1;

			this.raycaster.linePrecision = scale;
			this.raycaster.setFromCamera(this.mouse, this.webGlView.camera);

			this.mouse3D.copy(this.raycaster.ray.origin);
			this.mouse3D.setZ(0);
			this.mouseSphere.set(this.mouse3D, scale);

			// for the sample dataset that we're using, the polygons are too small at lower zoom levels
			// that they can't be detected by raycast since triangles are too small for intersection.
			// so we opted for a simple bounding sphere collision instead, but needs accuracy on higher zoom.

			//!TODO: Activate boundingSphere collision dynamically if polygons are too small
			// or just enable via an optional flag.
			// if(sphereCollision) {
				return getIntersectionFromSphere(this.mouseSphere, tile);
			// }else{
			// 	return getIntersectionFromRaycast(this.mouse, tile, this.raycaster);
			// }
		}
		return null;
	};

	function getIntersectionFromSphere(mouseSphere, tile) {
		var polygons = tile.data.polygons;
		for(var i=0; i<polygons.length; i++) {
			if(polygons[i].intersectsSphere(mouseSphere))
				return polygons[i];
		}
		return null;
	}

	function getIntersectionFromRaycast(mouse, tile, raycaster, scale) {
		var intersections = raycaster.intersectObject(tile.polygons.shape);
		var intersection = (intersections.length) > 0 ? intersections[0] : null;
		if(intersection) {
			// the outline polygon has twice more vertices than our actual mesh
			// so we divide the vertex index so we get the corresponding geometry we also hit
			var index = (intersection instanceof THREE.LineSegments) ? intersection.index / 2 : intersection.index;
			//!TODO: Perform binary search for performance!
			for(var i=0; i<tile.data.polygons.length; i++) {
				if(tile.data.polygons[i].containsIndex(index))
					return tile.data.polygons[i];
			}
		}
		return null;
	}

	window.VectorTileView = VectorTileView;
}());