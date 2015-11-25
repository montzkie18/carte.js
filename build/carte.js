/*jslint browser: true */
/*jslint node: true */
"use strict";
// declare package names
var carte = {};
(function(){
	var Rectangle = function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.ulx = x;
		this.uly = y;
		this.lrx = x+width;
		this.lry = y+width;
	};

	Rectangle.prototype.containsPoint = function(x, y) {
		return this.ulx<=x && x<=this.lrx && this.uly<=y && y<=this.lry;
	};

	Rectangle.prototype.containsRect = function(rect) {
		return this.containsPoint(rect.x, rect.y) && 
			this.containsPoint(rect.x+rect.width, rect.y+rect.height);
	};

	Rectangle.prototype.containsDimensions = function(width, height) {
		return this.width >= width && this.height >= height;
	};

	Rectangle.prototype.getNormalizedRect = function(maxWidth, maxHeight) {
		var x = this.x / maxWidth,
			y = this.y / maxHeight,
			width = this.width / maxWidth,
			height = this.height / maxHeight;
		return new Rectangle(x, y, width, height);
	};

	window.Rectangle = Rectangle;
}());
(function(){
	var SpriteNode = function(rect) {
		this.rect = rect;
		this.name = "sprite0";
		this.image = null;
		this.child = [];
	};

	SpriteNode.prototype.computeNormal = function(maxWidth, maxHeight) {
		this.maxWidth = maxWidth;
		this.maxHeight = maxHeight;
		this.normalRect = this.rect.getNormalizedRect(maxWidth, maxHeight);
		return this;
	};

	/**
	 * Perform max rect algorithm for finding where to fit the image.
	 * Sample implementation for lightmaps: http://www.blackpawn.com/texts/lightmaps/
	 */
	SpriteNode.prototype.insert = function(name, image) {
		var newNode = null;
		if(this.image !== null) {
			// this already contains an image so let's check it's children
			if(this.child.length > 0) {
				newNode = this.child[0].insert(name, image);
				if(newNode !== null) return newNode;
				return this.child[1].insert(name, image);
			}
			// this is a leaf node and already contains an image that 'just fits'
			return null;
		} else {
			if(this.rect.containsDimensions(image.width, image.height)) {
				if(this.rect.width == image.width && this.rect.height == image.height) {
					this.name = name;
					this.image = image;
					return this;
				}

				if(this.child.length > 0) {
					newNode = this.child[0].insert(name, image);
					if(newNode !== null) return newNode;
					return this.child[1].insert(name, image);
				} else {
					var rect = this.rect;
					var dW = this.rect.width - image.width;
					var dH = this.rect.height - image.height;
					if(dW > dH) {
						// split this rectangle vertically into two, left and right
						this.child[0] = new SpriteNode(new Rectangle(rect.x, rect.y, image.width, rect.height));
						this.child[1] = new SpriteNode(new Rectangle(rect.x+image.width, rect.y, dW, rect.height));
					}else{
						// split this rectangle horizontally into two, one above another below
						this.child[0] = new SpriteNode(new Rectangle(rect.x, rect.y, rect.width, image.height));
						this.child[1] = new SpriteNode(new Rectangle(rect.x, rect.y+image.height, rect.width, dH));
					}
					this.child[0].computeNormal(this.maxWidth, this.maxHeight);
					this.child[1].computeNormal(this.maxWidth, this.maxHeight);
					// this image should automatically fit the first node
					return this.child[0].insert(name, image);
				}
			}
			// this will not fit this node
			return null;
		}
	};

	SpriteNode.prototype.get = function(name) {
		if(this.name == name) return this;
		if(this.child.length > 0) {
			var node = this.child[0].get(name);
			if(node !== null) return node;
			return this.child[1].get(name);
		}
		return null;
	};

	SpriteNode.prototype.delete = function(name) {
		var node = this.get(name);
		if(node) node.clear();
		return node;
	};

	SpriteNode.prototype.clear = function() {
		this.name = "";
		this.image = null;
	};

	var DynamicSpriteSheet = function(width, height) {
		this.canvas = document.createElement('canvas');
		this.canvas.width = width;
		this.canvas.height = height;

		this.context = this.canvas.getContext('2d');
		
		this.texture = new THREE.Texture(this.canvas);
		this.texture.minFilter = THREE.LinearMipMapLinearFilter;
		this.texture.magFilter = THREE.LinearFilter;
		this.texture.flipY = false;

		this.pnode = new SpriteNode(new Rectangle(0, 0, width, height));
		this.pnode.computeNormal(width, height);
	};

	DynamicSpriteSheet.prototype = new THREE.EventDispatcher();
	DynamicSpriteSheet.prototype.constructor = DynamicSpriteSheet;

	DynamicSpriteSheet.prototype.get = function(name) {
		return this.pnode.get(name);
	};

	DynamicSpriteSheet.prototype.add = function(name, image) {
		if(image === undefined || image === null) return null;
		if(this.get(name) !== null) return null;
		var node = this.pnode.insert(name, image);
		if(node) {
			var rect = node.rect;
			this.context.drawImage(image, rect.x, rect.y);
			this.texture.needsUpdate = true;
			this.dispatchEvent({type: 'sprite_added'});
		}
		return node;
	};

	DynamicSpriteSheet.prototype.remove = function(name) {
		var node = this.pnode.delete(name);
		if(node) {
			var rect = node.rect;
			this.context.clearRect(rect.x, rect.y, rect.width, rect.height);
			this.texture.needsUpdate = true;
			this.dispatchEvent({type: 'sprite_removed'});
		}
		return node;
	};

	DynamicSpriteSheet.prototype.load = function(name, url) {

	};

	window.DynamicSpriteSheet = DynamicSpriteSheet;
}());
(function(){
	var LineRenderer = function() {};

	LineRenderer.prototype.init = function() { return this; };

	LineRenderer.prototype.draw = function() { return this; };

	LineRenderer.prototype.update = function() { return this; };

	LineRenderer.prototype.create = function(options) {
		options = options || {};
		var features = options.features || [];
		var strokeColor = (options.strokeColor !== null && options.strokeColor !== undefined) ? options.strokeColor : 0xFFFFFF;

		if(features === null || features.length === 0)
			return null;

		var line = new THREE.Geometry();

		// iterate every line which should contain the following array:
		// [linestring or array of points]
		for(var i=0; i<features.length; i++){
			var polygon  = features[i];
			for(var j=0; j<polygon.length; j++) {
				var coordinate = polygon[j];
				var point = {x: coordinate[0], y: coordinate[1]};

				var vertex1 = new THREE.Vector3(point.x, point.y, 1);
				line.vertices.push(vertex1);

				var coord0, point0, vertex0;
				if(j == polygon.length-1) {
					coord0 = polygon[0];
					point0 = {x: coord0[0], y: coord0[1]};
					vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
					line.vertices.push(vertex0);
				}else{
					coord0 = polygon[j+1];
					point0 = {x: coord0[0], y: coord0[1]};
					vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
					line.vertices.push(vertex0);
				}
			}	
		}

		var linePolygon = new THREE.LineSegments(line, new THREE.LineBasicMaterial({
			color: strokeColor,
			linewidth: 2,
			opacity: 0.25, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		return linePolygon;
	};

	window.LineRenderer = LineRenderer;
}());
(function(){
	var ObjectRenderer = function() {};

	ObjectRenderer.prototype.init = function() { 
		return this;
	};

	ObjectRenderer.prototype.draw = function() {

	};

	ObjectRenderer.prototype.update = function() {

	};

	ObjectRenderer.prototype.create = function(options) {

	};

	ObjectRenderer.prototype.add = function(object) {

	};

	ObjectRenderer.prototype.remove = function(object) {

	};

	ObjectRenderer.prototype.destroy = function(object) {

	};

	window.ObjectRenderer = ObjectRenderer;
}());
(function(){
	var vshader = "" +
		"uniform float pointSize;" +
		"attribute vec4 tile;" +
		"varying vec4 vTile;" +
		"varying vec3 vColor;" +
		"void main() {" +
		"	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);" +
		"	gl_Position = projectionMatrix * mvPosition;" +
		"	gl_PointSize = pointSize;" +
		"	vTile = tile;" +
		"	vColor = color;" +
		"}";

	var fshader = "" +
		"uniform sampler2D tex1;" +
		"uniform vec2 spriteSize;" +
		"varying vec4 vTile;" +
		"varying vec3 vColor;" +
		"void main() {" +
		"	vec2 tileUV = vTile.xy + vTile.zw * gl_PointCoord;" +
		"	gl_FragColor = texture2D(tex1, tileUV) * vec4(vColor.rgb, 1.0);" +
		"}";

	var MAX_COUNT = Math.pow(2,32) - 1;
	var START_VALUE = -99999.0;

	var Marker = function() {};
	Marker.prototype = Object.create(THREE.EventDispatcher.prototype);

	var PointRenderer = function(webGlView) {
		this.webGlView = webGlView;
		this.pointSize = 32.0;

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		this.markers = {};
		this.hoveredMarker = null;

		this.minIndex = MAX_COUNT;
		this.maxIndex = 0;
		this.index = 0;
	};

	PointRenderer.prototype.init = function() {
		this.positions = new Float32Array(1000000 * 3);
		if(typeof(this.positions.fill) == typeof(Function)){
			this.positions.fill(START_VALUE);
		} else {
			for(var i=0; i<this.positions.length; i++)
				this.positions[i] = START_VALUE;
		}
		this.positionsAttribute = new THREE.BufferAttribute(this.positions, 3);
		// this.positionsAttribute.setDynamic(true);

		this.colors = new Float32Array(1000000 * 3);
		this.colorsAttribute = new THREE.BufferAttribute(this.colors, 3);
		// this.colorsAttribute.setDynamic(true);

		this.tiles = new Float32Array(1000000 * 4); 
		this.tilesAttribute = new THREE.BufferAttribute(this.tiles, 4); 
		// this.tilesAttribute.setDynamic(true);

		this.geometry = new THREE.BufferGeometry();
		this.geometry.addAttribute('position', this.positionsAttribute);
		this.geometry.addAttribute('color', this.colorsAttribute);
		this.geometry.addAttribute('tile', this.tilesAttribute);

		this.spriteSheet = new DynamicSpriteSheet(256, 256);
		this.material = new THREE.ShaderMaterial( {
			uniforms: {
				tex1: { type: "t", value: this.spriteSheet.texture },
				pointSize: { type: "f", value: this.pointSize }
			},
			vertexColors: THREE.VertexColors,
			vertexShader: vshader,
			fragmentShader: fshader,
			transparent: true,
			depthWrite: false,
			depthTest: false
		});

		this.sceneObject = new THREE.Points(this.geometry, this.material);
		this.raycastObjects = [this.sceneObject];
		this.addEventListeners();

		return this;
	};

	PointRenderer.prototype.addEventListeners = function() {
		var map = this.webGlView.getMap();
		google.maps.event.addListener(map, 'mousemove', this.handleDocumentMouseMove.bind(this));
		google.maps.event.addListener(map, 'click', this.handleDocumentMouseClick.bind(this));
	};

	PointRenderer.prototype.handleDocumentMouseMove = function(event) {
		this.update(event);
	};

	PointRenderer.prototype.handleDocumentMouseClick = function(event) {
		this.update(event);
		if(this.hoveredMarker) 
			this.hoveredMarker.dispatchEvent({type: "click"});
	};

	PointRenderer.prototype._createMarker = function(index) {
		var marker = new Marker();
		marker.index = index;
		this.markers[index] = marker;
		return marker;
	};

	PointRenderer.prototype.add = function(options) {
		var arrayIndex = this.index * 3;
		while(arrayIndex < this.positions.length && this.positions[arrayIndex] !== START_VALUE)
			arrayIndex = ++this.index*3;

		if(arrayIndex >= this.positions.length){
			//!TODO: Expand points buffer
			console.log("[PointRenderer] Run out of points!!!");
			return;
		}

		options = options || {};
		options.position = options.position || {x:0, y:0, z:0};
		options.color = options.color || {r:1, g:1, b:1};

		this.positions[arrayIndex + 0] = options.position.x;
		this.positions[arrayIndex + 1] = options.position.y;
		this.positions[arrayIndex + 2] = options.position.z;

		this.colors[arrayIndex + 0] = options.color.r;
		this.colors[arrayIndex + 1] = options.color.g;
		this.colors[arrayIndex + 2] = options.color.b;

		var sprite = this.spriteSheet.get(options.imageName);
		if(!sprite) {
			sprite = this.spriteSheet.add(options.imageName, options.image);
			if(!sprite) {
				console.log("[PointRenderer] SpriteSheet already full.");
			}
		}
		var spriteRect = sprite !== null ? sprite.normalRect : {x:0, y:0, width:0, height:0};
		this.tiles[this.index*4 + 0] = spriteRect.x;
		this.tiles[this.index*4 + 1] = spriteRect.y;
		this.tiles[this.index*4 + 2] = spriteRect.width;
		this.tiles[this.index*4 + 3] = spriteRect.height;

		this.minIndex = Math.min(this.minIndex, this.index);
		this.maxIndex = Math.max(this.maxIndex, this.index);
		var marker = this.markers[this.index] || this._createMarker(this.index);
		marker.options = options;
		this.index++;
		return marker;
	};

	PointRenderer.prototype.remove = function(marker) {
		var arrayIndex = marker.index * 3;
		this.positions[arrayIndex + 0] = START_VALUE;
		this.positions[arrayIndex + 1] = START_VALUE;
		this.positions[arrayIndex + 2] = START_VALUE;

		this.minIndex = Math.min(this.minIndex, marker.index);
		this.maxIndex = Math.max(this.maxIndex, marker.index);

		if(this.index > marker.index) this.index = marker.index;
	};

	PointRenderer.prototype.draw = function() {
		// only update positions that changed by passing a range
		this.minIndex = (this.minIndex == MAX_COUNT) ? 0 : this.minIndex;
		var needsUpdate = this.maxIndex != this.minIndex;

		this.positionsAttribute.updateRange.offset = this.minIndex*3;
		this.positionsAttribute.updateRange.count = (this.maxIndex*3+3)-(this.minIndex*3);
		this.positionsAttribute.needsUpdate = needsUpdate;

		this.colorsAttribute.updateRange.offset = this.minIndex*3;
		this.colorsAttribute.updateRange.count = (this.maxIndex*3+3)-(this.minIndex*3);
		this.colorsAttribute.needsUpdate = needsUpdate;

		this.tilesAttribute.updateRange.offset = this.minIndex*4;
		this.tilesAttribute.updateRange.count = (this.maxIndex*4+4)-(this.minIndex*4);
		this.tilesAttribute.needsUpdate = needsUpdate;

		if(needsUpdate) {
			this.geometry.computeBoundingBox();
			this.geometry.computeBoundingSphere();
		}

		this.minIndex = MAX_COUNT;
		this.maxIndex = 0;
	};

	PointRenderer.prototype.update = function(event) {
		if(event.clientX !== undefined && event.clientY !== undefined) {
			this.mouse.x = (event.clientX / this.webGlView.width) * 2 - 1;
			this.mouse.y = -(event.clientY / this.webGlView.height) * 2 + 1;
		}else if(event.pixel) {
			this.mouse.x = (event.pixel.x / this.webGlView.width) * 2 - 1;
			this.mouse.y = -(event.pixel.y / this.webGlView.height) * 2 + 1;
		}

		// check if we hit any of the points in the particle system
		this.raycaster.params.Points.threshold = 16*1/Math.pow(2, this.webGlView.scale);
		this.raycaster.setFromCamera(this.mouse, this.webGlView.camera);
		var intersections = this.raycaster.intersectObjects(this.raycastObjects);
		var intersection = (intersections.length) > 0 ? intersections[0] : null;

		// we hit something
		if(intersection) {
			// first time to hover something
			if(this.hoveredMarker === null) {
				this.hoveredMarker = this.markers[intersection.index];
				this.hoveredMarker.dispatchEvent({type: 'mouseover'});
			}
			// we're already hovering something then something got in the way
			else if(this.hoveredMarker.index != intersection.index) {
				this.hoveredMarker.dispatchEvent({type: 'mouseout'});
				this.hoveredMarker = this.markers[intersection.index];
				this.hoveredMarker.dispatchEvent({type: 'mouseover'});
			}
			if(this.webGlView && this.webGlView.map)
				this.webGlView.map.setOptions({draggableCursor:'pointer'});
		}
		// there's nothing under the mouse
		else {
			// we lost our object. bye bye
			if(this.hoveredMarker !== null) {
				this.hoveredMarker.dispatchEvent({type: 'mouseout'});
				this.hoveredMarker = null;
				if(this.webGlView && this.webGlView.map) {
					this.webGlView.map.setOptions({draggableCursor:null});
				}
			}
		}
	};

	window.PointRenderer = PointRenderer;
}());
(function(){
	var PolygonRenderer = function() {};

	PolygonRenderer.prototype = new ObjectRenderer();
	PolygonRenderer.prototype.constructor = PolygonRenderer;

	PolygonRenderer.prototype.create = function(options) {
		options = options || {};
		var features = options.features || [];
		var fillColor = (options.fillColor !== null && options.fillColor !== undefined) ? options.fillColor : 0x0000FF;
		var fillOpacity = (options.fillOpacity !== null && options.fillOpacity !== undefined) ? options.fillOpacity : 0.25;
		var strokeColor = (options.strokeColor !== null && options.strokeColor !== undefined) ? options.strokeColor : 0xFFFFFF;
		var strokeOpacity = (options.strokeOpacity !== null && options.strokeOpacity !== undefined) ? options.strokeOpacity : 0.25;

		if(features === null || features.length === 0)
			return null;

		var geometry = new THREE.Geometry();
		var outline = new THREE.Geometry();
		var vertexOffset = geometry.vertices.length;
		var numPolygons = 0;

		// iterate every polygon which should contain the following arrays:
		// [outer loop], [inner loop 1], ..., [inner loop n]
		for(var j=0; j<features.length; j++){
			var polygon  = features[j];
			for(var p=0; p<polygon.length; p++) {
				var loop = polygon[p];
				var points = [], holeIndices = [], holeIndex = 0;

				for(var l=0; l<loop.length; l++) {
					var coordinate = loop[l];
					var point = {x: coordinate[0], y: coordinate[1]};
					points.push(point.x);
					points.push(point.y);

					var vertex = new THREE.Vector3(point.x, point.y, 1001);
					geometry.vertices.push(vertex);

					var vertex1 = new THREE.Vector3(point.x, point.y, 1);
					outline.vertices.push(vertex1);

					var coord0, point0, vertex0;
					if(l == loop.length-1) {
						coord0 = loop[0];
						point0 = {x: coord0[0], y: coord0[1]};
						vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
						outline.vertices.push(vertex0);
					}else{
						coord0 = loop[l+1];
						point0 = {x: coord0[0], y: coord0[1]};
						vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
						outline.vertices.push(vertex0);
					}
				}

				if(p>0) holeIndices.push(holeIndex);
				holeIndex += loop.length;

				var tris = earcut(points, null, 2);
				for(var k=0; k<tris.length; k+=3) {
					// 2-1-0 means face up
					var face = new THREE.Face3(
						tris[k+2] + vertexOffset, 
						tris[k+1] + vertexOffset, 
						tris[k+0] + vertexOffset
					);
					geometry.faces.push(face);
				}
				vertexOffset = geometry.vertices.length;
				numPolygons++;
			}	
		}

		var coveragePolygon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
			color: fillColor,
			opacity: fillOpacity, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		var outlinePolygon = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({
			color: strokeColor,
			opacity: strokeOpacity,
			linewidth: 5,
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		return {shape: coveragePolygon, outline: outlinePolygon};
	};

	window.PolygonRenderer = PolygonRenderer;
}());
(function(){
	var vshader = "" +
		"attribute vec4 tile;" +
		"varying vec2 vUv;" +
		"varying vec4 vTile;" +
		"void main() {" +
		"	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);" +
		"	gl_Position = projectionMatrix * mvPosition;" +
		"	vUv = uv;" +
		"	vTile = tile;" +
		"}";

	var fshader = "" +
		"uniform sampler2D tex1;" +
		"uniform float alpha;" +
		"varying vec2 vUv;" +
		"varying vec4 vTile;" +
		"void main() {" +
		"	vec2 uv = vTile.xy + vTile.zw * vUv;" +
		"	gl_FragColor = texture2D(tex1, uv) * vec4(1, 1, 1, alpha);" +
		"}";

	var MAX_COUNT = Math.pow(2,32) - 1;
	var START_VALUE = -99999.0;

	var POSITION_INTERVAL = 3*4; // 3 dimensions per vertex, 4 vertex per sprite
	var INDEX_INTERVAL = 3*2; // 3 index per tri, 2 tri per sprite
	var UV_INTERVAL = 2*4; // 2 uv per vertex, 4 vertex per sprite
	var TILE_INTERVAL = 4*4; // offset(x,y) + size(width, heigt) per vertex, 4 vertex per sprite

	var SpriteRenderer = function(){
		this.minIndex = MAX_COUNT;
		this.maxIndex = 0;
		this.index = 0;
		this.sprites = [];
		this.opacity = 0.8;
	};

	SpriteRenderer.prototype.init = function() {
		this.positions = new Float32Array(1024*POSITION_INTERVAL); 
		if(typeof(this.positions.fill) == typeof(Function)){
			this.positions.fill(START_VALUE);
		} else {
			for(var i=0; i<this.positions.length; i++)
				this.positions[i] = START_VALUE;
		}
		this.positionsAttribute = new THREE.BufferAttribute(this.positions, 3);
		// this.positionsAttribute.setDynamic(true);

		this.indices = new Uint16Array(1024*INDEX_INTERVAL); 
		this.indicesAttribute = new THREE.BufferAttribute(this.indices, 1);
		// this.indicesAttribute.setDynamic(true);

		this.uv = new Float32Array(1024*UV_INTERVAL); 
		this.uvAttribute = new THREE.BufferAttribute(this.uv, 2); 
		// this.uvAttribute.setDynamic(true);

		this.tiles = new Float32Array(1024*TILE_INTERVAL); 
		this.tilesAttribute = new THREE.BufferAttribute(this.tiles, 4); 
		// this.tilesAttribute.setDynamic(true);

		this.geometry = new THREE.BufferGeometry();
		this.geometry.setIndex(this.indicesAttribute);
		this.geometry.addAttribute('position', this.positionsAttribute);
		this.geometry.addAttribute('uv', this.uvAttribute);
		this.geometry.addAttribute('tile', this.tilesAttribute);

		this.spriteSheet = new DynamicSpriteSheet(4096, 4096);
		this.material = new THREE.ShaderMaterial( {
			uniforms: {
				tex1: { type: "t", value: this.spriteSheet.texture },
				alpha: { type: "f", value: this.opacity }
			},
			vertexShader: vshader,
			fragmentShader: fshader
		});

		this.sceneObject = new THREE.Mesh(this.geometry, this.material);

		return this;
	};

	SpriteRenderer.prototype.add = function(options) {
		var positionIndex = this.index*POSITION_INTERVAL;
		while(positionIndex < this.positions.length && this.positions[positionIndex] !== START_VALUE)
			positionIndex = ++this.index*POSITION_INTERVAL;

		if(positionIndex >= this.positions.length){
			//!TODO: Expand points buffer
			console.log("[SpriteRenderer] Run out of points!!!");
			return;
		}

		var image = options.image;
		var imageName = options.imageName;
		var sprite = this.spriteSheet.get(imageName);
		if(!sprite) {
			sprite = this.spriteSheet.add(imageName, image);
			if(!sprite) {
				//!TODO: Create a new sprite sheet if this one gets full
				console.log("[SpriteRenderer] SpriteSheet already full.");
			}
		}

		options = options || {};
		options.position = options.position || {x:0, y:0, z:0};
		options.width = options.width || 256;
		options.height = options.height || 256;
		options.imageName = options.icon || "red-dot";

		this.positions[positionIndex + 0] = options.position.x;
		this.positions[positionIndex + 1] = options.position.y;
		this.positions[positionIndex + 2] = options.position.z;
		this.positions[positionIndex + 3] = options.position.x + options.width;
		this.positions[positionIndex + 4] = options.position.y;
		this.positions[positionIndex + 5] = options.position.z;
		this.positions[positionIndex + 6] = options.position.x;
		this.positions[positionIndex + 7] = options.position.y + options.height;
		this.positions[positionIndex + 8] = options.position.z;
		this.positions[positionIndex + 9] = options.position.x + options.width;
		this.positions[positionIndex +10] = options.position.y + options.height;
		this.positions[positionIndex +11] = options.position.z;

		var arrayIndex = this.index*INDEX_INTERVAL;
		this.indices[arrayIndex + 0] = this.index*4 + 0;
		this.indices[arrayIndex + 1] = this.index*4 + 2;
		this.indices[arrayIndex + 2] = this.index*4 + 1;
		this.indices[arrayIndex + 3] = this.index*4 + 1;
		this.indices[arrayIndex + 4] = this.index*4 + 2;
		this.indices[arrayIndex + 5] = this.index*4 + 3;

		var uvIndex = this.index*UV_INTERVAL;
		this.uv[uvIndex + 0] = 0;
		this.uv[uvIndex + 1] = 0;
		this.uv[uvIndex + 2] = 1;
		this.uv[uvIndex + 3] = 0;
		this.uv[uvIndex + 4] = 0;
		this.uv[uvIndex + 5] = 1;
		this.uv[uvIndex + 6] = 1;
		this.uv[uvIndex + 7] = 1;

		var t = this.index*TILE_INTERVAL;
		this.tiles[t+0] = this.tiles[t+4] = this.tiles[t+8] = this.tiles[t+12] = sprite.normalRect.x;
		this.tiles[t+1] = this.tiles[t+5] = this.tiles[t+9] = this.tiles[t+13] = sprite.normalRect.y;
		this.tiles[t+2] = this.tiles[t+6] = this.tiles[t+10] = this.tiles[t+14] = sprite.normalRect.width;
		this.tiles[t+3] = this.tiles[t+7] = this.tiles[t+11] = this.tiles[t+15] = sprite.normalRect.height;

		this.minIndex = Math.min(this.minIndex, this.index);
		this.maxIndex = Math.max(this.maxIndex, this.index);
		return {index: this.index++, name: imageName};
	};

	SpriteRenderer.prototype.remove = function(sprite) {
		var positionIndex = sprite.index*POSITION_INTERVAL;
		for(var i=0; i<POSITION_INTERVAL; i++) {
			this.positions[positionIndex + i] = START_VALUE;
		}
		this.spriteSheet.remove(sprite.name);

		this.minIndex = Math.min(this.minIndex, sprite.index);
		this.maxIndex = Math.max(this.maxIndex, sprite.index);

		if(this.index > sprite.index) this.index = sprite.index;
	};

	SpriteRenderer.prototype.draw = function() {
		// only update positions that changed by passing a range
		this.minIndex = (this.minIndex == MAX_COUNT) ? 0 : this.minIndex;
		var needsUpdate = this.maxIndex != this.minIndex;

		var p = POSITION_INTERVAL;
		this.positionsAttribute.updateRange.offset = this.minIndex*p;
		this.positionsAttribute.updateRange.count = (this.maxIndex*p+p)-(this.minIndex*p);
		this.positionsAttribute.needsUpdate = needsUpdate;

		var i = INDEX_INTERVAL;
		this.indicesAttribute.updateRange.offset = this.minIndex*i;
		this.indicesAttribute.updateRange.count = (this.maxIndex*i+i)-(this.minIndex*i);
		this.indicesAttribute.needsUpdate = needsUpdate;

		var u = UV_INTERVAL;
		this.uvAttribute.updateRange.offset = this.minIndex*u;
		this.uvAttribute.updateRange.count = (this.maxIndex*u+u)-(this.minIndex*u);
		this.uvAttribute.needsUpdate = needsUpdate;

		var t = TILE_INTERVAL;
		this.tilesAttribute.updateRange.offset = this.minIndex*t;
		this.tilesAttribute.updateRange.count = (this.maxIndex*t+t)-(this.minIndex*t);
		this.tilesAttribute.needsUpdate = needsUpdate;

		if(needsUpdate) {
			this.geometry.computeBoundingBox();
			this.geometry.computeBoundingSphere();
		}

		this.minIndex = MAX_COUNT;
		this.maxIndex = 0;
	};

	window.SpriteRenderer = SpriteRenderer;
}());

(function(){
	var Sprite = function(data) {
		this.name = data.name;
		var x = data.x,
			y = data.y,
			width = data.width,
			height = data.height;
		this.rect = new Rectangle(x, y, width, height);
	};

	Sprite.prototype.computeNormal = function(maxWidth, maxHeight) {
		this.normalRect = this.rect.getNormalizedRect(maxWidth, maxHeight);
		return this;
	};

	var SpriteSheet = function(texture, sprites) {
		this.texture = texture;
		this.sprites = {};

		for(var i=0; i<sprites.length; i++) {
			this.sprites[sprites[i].name] = new Sprite(sprites[i])
				.computeNormal(texture.image.width, texture.image.height);
		}
	};

	SpriteSheet.prototype.get = function(spriteName) {
		return this.sprites[spriteName];
	};

	window.SpriteSheet = SpriteSheet;
}());
(function(){
	var CSS_TRANSFORM = (function() {
		var div = document.createElement('div');
		var props = [
			'transform',
			'WebkitTransform',
			'MozTransform',
			'OTransform',
			'msTransform'
		];
		for (var i = 0; i < props.length; i++) {
			var prop = props[i];
			if (div.style[prop] !== undefined) {
				return prop;
			}
		}
		return props[0];
	})();

	var WebGLView = function(map) {
		this._map = map;
		this.camera = new THREE.OrthographicCamera(0, 255, 0, 255, -3000, 3000);
		this.camera.position.z = 1000;
		this.scene = new THREE.Scene();
		this.sceneMask = new THREE.Scene();
		this.sceneForeground = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialiasing: true,
			clearColor: 0x000000,
			clearAlpha: 0

		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.autoClear = false;
		this.renderer.domElement.style["pointer-events"] = 'none';
		this.context = this.renderer.context;
		this.animationFrame = null;
		this.objectRenderers = [];
		this.numMasks = 0;

		this.update = function() {
			var map = this.map;
			var projection = this.getProjection();
			if(!map || !projection) return;
			
			var bounds = map.getBounds();
			var topLeft = new google.maps.LatLng(
				bounds.getNorthEast().lat(),
				bounds.getSouthWest().lng()
			);

			// Translate the webgl canvas based on maps's bounds
			var canvas = this.renderer.domElement;
			var point = projection.fromLatLngToDivPixel(topLeft);
			canvas.style[CSS_TRANSFORM] = 'translate(' + Math.round(point.x) + 'px,' + Math.round(point.y) + 'px)';

			// Resize the renderer / canvas based on size of the map
			var div = map.getDiv(), 
				width = div.clientWidth, 
				height = div.clientHeight;

			if (width !== this.width || height !== this.height){
				this.width = width;
				this.height = height;
				this.renderer.setSize(width, height);
			}

			// Update camera based on map zoom and position
			var zoom = map.getZoom();
			var scale = Math.pow(2, zoom);
			var offset = map.getProjection().fromLatLngToPoint(topLeft);

			this.camera.position.x = offset.x;
			this.camera.position.y = offset.y;

			this.scale = zoom;
			this.camera.scale.x = this.width / 256 / scale;
			this.camera.scale.y = this.height / 256 / scale;
		};

		this.draw = function() {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = requestAnimationFrame(this.deferredRender.bind(this));
		};

		this.deferredRender = function() {
			this.update();

			var context = this.context, renderer = this.renderer;
			var maskEnabled = this.numMasks > 0;

			this.renderer.setClearColor(0xffffff, 0);
			this.renderer.clear(true, true, true);

			if(maskEnabled) {
				context.colorMask(false, false, false, false);
				context.depthMask(false);

				context.enable(context.STENCIL_TEST);
				context.stencilOp(context.REPLACE, context.REPLACE, context.REPLACE);
				context.stencilFunc(context.ALWAYS, 0, 0xffffffff);
				context.clearStencil(1);

				this.renderer.render(this.sceneMask, this.camera, null, true);

				context.colorMask(true, true, true, true);
				context.depthMask(true );

				context.stencilFunc(context.EQUAL, 0, 0xffffffff);  // draw if == 0
				context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
			}

			for(var i=0; i<this.objectRenderers.length; i++)
				this.objectRenderers[i].draw();

			this.renderer.render(this.scene, this.camera, null, !maskEnabled);

			if(maskEnabled) {
				context.disable(context.STENCIL_TEST);
			}

			this.pointRenderer.draw();
			this.renderer.render(this.sceneForeground, this.camera);

			this.dispatchEvent({type: 'render'});
		};
	};

	WebGLView.prototype = _.extend(new google.maps.OverlayView(), new THREE.EventDispatcher());
	WebGLView.prototype.constructor = WebGLView;

	WebGLView.prototype.getMap = function() {
		return this._map;
	};

	WebGLView.prototype.onAdd = function() {
		this.getPanes().overlayLayer.appendChild(this.renderer.domElement);
		this.addEventListeners();
		this.dispatchEvent({type: 'added_to_dom'});
	};

	WebGLView.prototype.onRemove = function() {
		var canvas = this.renderer.domElement;
		this.canvas.parentElement.removeChild(this.canvas);
		this.removeEventListeners();
		this.dispatchEvent({type: 'removed_from_dom'});
	};

	WebGLView.prototype.init = function() {
		// draw all points in the foreground
		this.pointRenderer = new PointRenderer(this).init();
		this.sceneForeground.add(this.pointRenderer.sceneObject);

		// all these layers are maskable
		this.spriteRenderer = new SpriteRenderer().init();
		this.scene.add(this.spriteRenderer.sceneObject);
		this.polygonRenderer = new PolygonRenderer().init();
		this.lineRenderer = new LineRenderer().init();

		// add all maskable layers to an array so we can draw/update them all later
		this.objectRenderers.push(this.polygonRenderer);
		this.objectRenderers.push(this.spriteRenderer);
		this.objectRenderers.push(this.lineRenderer);
		return this;
	};

	WebGLView.prototype.addEventListeners = function() {
		this.changeHandler = google.maps.event.addListener(this.map, 'bounds_changed', this.draw.bind(this));
	};

	WebGLView.prototype.removeEventListeners = function() {
		google.maps.event.removeListener(this.changeHandler);
		this.changeHandler = null;
	};

	WebGLView.prototype.addObject = function(geometry) {
		this.scene.add(geometry);
	};

	WebGLView.prototype.removeObject = function(geometry) {
		this.scene.remove(geometry);
	};

	WebGLView.prototype.addPoint = function(options) {
		return this.pointRenderer.add(options);
	};

	WebGLView.prototype.removePoint = function(point) {
		this.pointRenderer.remove(point);
	};

	WebGLView.prototype.addSprite = function(options) {
		return this.spriteRenderer.add(options);
	};

	WebGLView.prototype.removeSprite = function(sprite) {
		this.spriteRenderer.remove(sprite);
	};

	WebGLView.prototype.createGeometry = function(options) {
		var geometry = this.polygonRenderer.create(options);
		if(geometry !== null) {
			this.addGeometry(geometry);
		}
		return geometry;
	};

	WebGLView.prototype.addGeometry = function(geometry) {
		this.scene.add(geometry.shape);
		this.scene.add(geometry.outline);
	};

	WebGLView.prototype.removeGeometry = function(geometry) {
		this.scene.remove(geometry.shape);
		this.scene.remove(geometry.outline);
	};

	WebGLView.prototype.destroyGeometry = function(geometry) {
		delete geometry.shape;
		delete geometry.outline;
	};

	WebGLView.prototype.createLine = function(options) {
		var geometry = this.lineRenderer.create(options);
		if(geometry !== null) {
			this.addLine(geometry);
		}
		return geometry;
	};

	WebGLView.prototype.addLine = function(line) {
		this.scene.add(line);
	};

	WebGLView.removeLine = function(line) {
		this.scene.remove(line);
	};

	WebGLView.destroyLine = function(line) {
		
	};

	WebGLView.prototype.createMask = function(options) {
		var mask = this.polygonRenderer.create(options);
		if(mask !== null) {
			this.addMask(mask);
		}
		return mask;
	};

	WebGLView.prototype.addMask = function(geometry) {
		this.sceneMask.add(geometry.shape);
		this.sceneMask.add(geometry.outline);
		this.numMasks+=1;
	};

	WebGLView.prototype.removeMask = function(geometry) {
		this.sceneMask.remove(geometry.shape);
		this.sceneMask.remove(geometry.outline);
		this.numMasks-=1;
	};

	WebGLView.prototype.destroyMask = function(geometry) {
		delete geometry.shape;
		delete geometry.outline;
	};

	window.WebGLView = WebGLView;
}());
(function(){
	var http = {};

	http.get = function(url, options) {
		var deferred = Q.defer();
		var responseType = options.responseType;
		if(responseType === 'blob') {
			var image = $("<img />").attr('src', url).on('load', function(){
				deferred.resolve({data:image[0]});
			});
		}else{
			$.ajax(url, options)
				.success(function(data, status, xhr){
					deferred.resolve({data:data, status:status, xhr:xhr});
				})
				.error(function(xhr, status, error){
					deferred.reject({xhr:xhr, status:status, error:error});
				});
		}
		return deferred.promise;
	};

	window.http = http;
}());
(function(){
	var CLUSTER_PIXEL_SIZE = 64;

	var ClusterController = function(webGlView) {
		this.webGlView = webGlView;
		this.views = [];
	};

	ClusterController.prototype.setMap = function(map) {
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

	ClusterController.prototype.addView = function(view) {
		var index = this.views.indexOf(view);
		if(index < 0) this.views.push(view);
		var b = this.bounds;
		view.setClusterPixelSize(CLUSTER_PIXEL_SIZE);
		return this;
	};

	ClusterController.prototype.removeView = function(view) {
		var index = this.views.indexOf(view);
		if(index >= 0) this.views.splice(index, 1);
		view.clear();
		return this;
	};

	ClusterController.prototype._addEventListeners = function() {
		this.changeListener = google.maps.event.addListener(this.map, "bounds_changed", this.update.bind(this));
	};

	ClusterController.prototype._removeEventListeners = function() {
		google.maps.event.removeListener(this.changeListener);
	};

	ClusterController.prototype.update = function() {

	};

	window.ClusterController = ClusterController;
}());
(function(){

	var MERCATOR_RANGE = 256;

	function convertPointToTile(latLng, zoom, projection) {
		var worldCoordinate = projection.fromLatLngToPoint(latLng);
		var pixelCoordinate = {x: worldCoordinate.x * Math.pow(2, zoom), y: worldCoordinate.y * Math.pow(2, zoom)};
		var tileCoordinate = {x: Math.floor(pixelCoordinate.x / MERCATOR_RANGE), y: Math.floor(pixelCoordinate.y / MERCATOR_RANGE)};
		return tileCoordinate;
	}

	var TileController = function(webGlView) {
		this.webGlView = webGlView;
		this.bounds = new Rectangle(0, 0, 0, 0);
		this.zoom = 0;
		this.minZoom = 0;
		this.maxZoom = 10;
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
		var b = this.bounds;
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
		var currentBounds = this.bounds;
		return currentBounds.ulx != visibleBounds.ulx || 
			currentBounds.uly != visibleBounds.uly || 
			currentBounds.lrx != visibleBounds.lrx || 
			currentBounds.lry != visibleBounds.lry;
	};

	TileController.prototype.update = function() {
		var map = this.map;
		var projection = map.getProjection();
		var zoom = map.getZoom();
		zoom = Math.max(this.minZoom, zoom);
		zoom = Math.min(this.maxZoom, zoom);

		var bounds = map.getBounds(),
			boundsNeLatLng = bounds.getNorthEast(),
			boundsSwLatLng = bounds.getSouthWest(),
			boundsNwLatLng = new google.maps.LatLng(boundsNeLatLng.lat(), boundsSwLatLng.lng()),
			boundsSeLatLng = new google.maps.LatLng(boundsSwLatLng.lat(), boundsNeLatLng.lng()),
			tileCoordinateNw = convertPointToTile(boundsNwLatLng, zoom, projection),
			tileCoordinateSe = convertPointToTile(boundsSeLatLng, zoom, projection),
			visibleBounds = new Rectangle(tileCoordinateNw.x, tileCoordinateNw.y, 
				tileCoordinateSe.x-tileCoordinateNw.x, tileCoordinateSe.y-tileCoordinateNw.y);

		var currentBounds = this.bounds;
		var x = Math.min(currentBounds.ulx, visibleBounds.ulx),
			y = Math.min(currentBounds.uly, visibleBounds.uly),
			width = Math.max(currentBounds.lrx, visibleBounds.lrx) - x,
			height = Math.max(currentBounds.lry, visibleBounds.lry) - y;
		var range = new Rectangle(x, y, width, height);
		
		// Hide everything if we changed zoom level.
		// Then set the range to update only the visible tiles.
		if(this.hasChangedZoom(zoom)) {
			// Make sure that all currently visible tiles will be hidden.
			this.updateTiles(currentBounds, currentBounds, new Rectangle(-1, -1, 0, 0), this.zoom);
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
		this.bounds = visibleBounds;
	};

	window.TileController = TileController;
}());

(function(){
	var GeoJSONDataSource = function(url, projection){
		this.url = url;
		this.projection = projection;
		this.fileExtension = "json";
		this.responseType = "json";
	};

	GeoJSONDataSource.prototype.parse = function(data) {
		var featureCollection = {polygons:[], points:[], lines:[]};
		var self = this;
		var extractFeatures = function(data) {
			var feature = self._parseFeature(data);
			if(feature.polygons.length > 0)
				featureCollection.polygons = featureCollection.polygons.concat(feature.polygons);
			if(feature.points.length > 0)
				featureCollection.points = featureCollection.points.concat(feature.points);
			if(feature.lines.length > 0)
				featureCollection.lines = featureCollection.lines.concat(feature.lines);
		};
		if(data) {
			if(data.type == "FeatureCollection") {
				var features = data.features;
				for(var i=0; i<features.length; i++)
					extractFeatures(features[i]);
			}else if(data.type == "Feature") {
				extractFeatures(data);
			}
		}
		return featureCollection;
	};

	GeoJSONDataSource.prototype._parseFeature = function(feature) {
		var polygons = [], points = [], lines = [];
		var coordinates, polygon, linearRing, i;
		if(feature.geometry.type == "Polygon") {
			coordinates = feature.geometry.coordinates;
			polygon = [];
			for(i=0; i<coordinates.length; i++) {
				linearRing = coordinates[i];
				polygon.push(this._parseCoordinates(linearRing));
			}
			polygons.push(polygon);
		}
		else if(feature.geometry.type == "MultiPolygon") {
			coordinates = feature.geometry.coordinates;
			for(i=0; i<coordinates.length; i++) {
				var polygonCoordinates = coordinates[i];
				polygon = [];
				for(var j=0; j<polygonCoordinates.length; j++) {
					linearRing = polygonCoordinates[j];
					polygon.push(this._parseCoordinates(linearRing));
				}
				polygons.push(polygon);
			}
		}
		else if(feature.geometry.type == "LineString") {
			lines.push(this._parseCoordinates(feature.geometry.coordinates));
		}
		else if(feature.geometry.type == "MultiLineString") {
			coordinates = feature.geometry.coordinates;
			for(i=0; i<coordinates.length; i++) {
				var lineString = coordinates[i];
				lines.push(this._parseCoordinates(lineString));
			}
		}
		else if(feature.geometry.type == "Point") {
			coordinates = feature.geometry.coordinates;
			var latLng = new google.maps.LatLng(coordinates[1], coordinates[0]);
			var point = this.projection.fromLatLngToPoint(latLng);
			points.push({latLng: latLng, point: point});
		}
		return {polygons:polygons, points:points, lines:lines};
	};

	GeoJSONDataSource.prototype._parseCoordinates = function(coordinates) {
		var points = [];
		for(var i=0; i<coordinates.length; i++) {
			var latLng = new google.maps.LatLng(coordinates[i][1], coordinates[i][0]);
			var point = this.projection.fromLatLngToPoint(latLng);
			points.push([point.x, point.y]);
		}
		return points;
	};

	window.GeoJSONDataSource = GeoJSONDataSource;
}());
(function(){
	var ImageDataSource = function(url){
		this.url = url;
		this.fileExtension = "png";
		this.responseType = "blob";
	};

	ImageDataSource.prototype.parse = function(data){
		return data;
	};

	window.ImageDataSource = ImageDataSource;
}());
(function(){
	/**
	 * Sites Typed Array - Data Source
	 * Format: Uint32Array[i*4] where i is number of sites
	 * array[0] = latitude
	 * array[1] = longitude
	 * array[2] = cluster count. if > 1, then it's a cluster. if == 1, then it's a point.
	 * array[3] = site id
	 */
	var STADataSource = function(url, projection){
		this.url = url;
		this.projection = projection;
		this.fileExtension = "";
		this.responseType = "arraybuffer";
	};

	STADataSource.prototype.parse = function(arraybuffer) {
		var projection = this.projection;
		var data = new Uint32Array(arraybuffer);
		var markers = [];
		for (var i = 0; i < data.length; i+=4) {
			var latLng = new google.maps.LatLng(data[i]/1000000.0, data[i+1]/1000000.0);
			var point = projection.fromLatLngToPoint(latLng);
			var count = data[i+2];
			var id  = data[i+3];
			markers.push({id: id, count: count, latLng: latLng, point: point});
		}
		return markers;
	};

	window.STADataSource = STADataSource;
}());
(function(){
	var TileProvider = function(dataSource, $http, $q) {
		this.dataSource = dataSource;
		this.$http = $http;
		this.$q = $q;
		this.tiles = {};
	};

	TileProvider.prototype.getTileUrl = function(x, y, z) {
		return this.dataSource.url+"/"+z+"/"+x+"/"+y+"."+this.dataSource.fileExtension;
	};

	TileProvider.prototype.getTile = function(x, y, z) {
		var deferred = this.$q.defer();
		var url = this.getTileUrl(x, y, z);
		if(this.tiles[url]){
			deferred.resolve({url:url, data:this.tiles[url]});
		}else{
			var self = this;
			this.$http.get(url, {responseType: this.dataSource.responseType})
				.then(function(response){
					self.tiles[url] = self.dataSource.parse(response.data);
					deferred.resolve({url:url, data:self.tiles[url]});
				}, function(reason){
					deferred.reject(reason);
				});
		}
		return deferred.promise;
	};

	window.TileProvider = TileProvider;
}());
(function(){
	var ImageTileView = function(tileProvider, webGlView) {
		this.tileProvider = tileProvider;
		this.webGlView = webGlView;
		this.tiles = {};
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
					self.tiles[url].geometry = self.webGlView.addSprite(spriteOptions);
					self.webGlView.draw();
				}, function(reason){
					//console.log(reason);
				});
		}
	};

	ImageTileView.prototype.hideTile = function(x, y, z) {
		var url = this.tileProvider.getTileUrl(x, y, z);
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
		this.webGlView.draw();
	};

	window.ImageTileView = ImageTileView;
}());
(function(){
	var SiteClusterView = function(){

	};

	window.SiteClusterView = SiteClusterView;
}());
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
//# sourceMappingURL=carte.js.map
