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
		this.texture.minFilter = THREE.NearestFilter;
		this.texture.magFilter = THREE.NearestFilter;
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

		for(var i=0; i<features.length; i++){
			var feature = features[i];
			if(feature.length === 0) continue;

			// iterate every feature which should contain a list of 
			// [array of polygons [outer loop], [inner loop 1], ..., [inner loop n]]
			for(var j=0; j<feature.length; j++){
				var polygon  = feature[j];
				for(var p=0; p<polygon.length; p++) {
					var loop = polygon[p];
					for(var l=0; l<loop.length; l++) {
						var coordinate = loop[l];
						var point = {x: coordinate[0], y: coordinate[1]};

						var vertex1 = new THREE.Vector3(point.x, point.y, 1);
						line.vertices.push(vertex1);

						var coord0, point0, vertex0;
						if(l == loop.length-1) {
							coord0 = loop[0];
							point0 = {x: coord0[0], y: coord0[1]};
							vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
							line.vertices.push(vertex0);
						}else{
							coord0 = loop[l+1];
							point0 = {x: coord0[0], y: coord0[1]};
							vertex0 = new THREE.Vector3(point0.x, point0.y, 1);
							line.vertices.push(vertex0);
						}
					}
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
	var vshader = (function () {/*
		uniform float pointSize;
		attribute vec4 tile;
		varying vec4 vTile;
		varying vec3 vColor;

		void main() {
			vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * mvPosition;
			gl_PointSize = pointSize;
			vTile = tile;
			vColor = color;
		}
	*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];

	var fshader = (function () {/*
		uniform sampler2D tex1;
		uniform vec2 spriteSize;
		varying vec4 vTile;
		varying vec3 vColor;

		void main() {
			vec2 tileUV = vTile.xy + vTile.zw * gl_PointCoord;
			gl_FragColor = texture2D(tex1, tileUV) * vec4(vColor.rgb, 1.0);
		}
	*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];

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
		this.positions.fill(START_VALUE);
		this.positionsAttribute = new THREE.BufferAttribute(this.positions, 3);
		this.positionsAttribute.setDynamic(true);

		this.colors = new Float32Array(1000000 * 3);
		this.colorsAttribute = new THREE.BufferAttribute(this.colors, 3);
		this.colorsAttribute.setDynamic(true);

		this.tiles = new Float32Array(1000000 * 4); 
		this.tilesAttribute = new THREE.BufferAttribute(this.tiles, 4); 
		this.tilesAttribute.setDynamic(true);

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
		document.addEventListener('mousemove', this.handleDocumentMouseMove.bind(this), false);
		document.addEventListener('click', this.handleDocumentMouseClick.bind(this), false);
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
		this.mouse.x = (event.clientX / this.webGlView.width) * 2 - 1;
		this.mouse.y = -(event.clientY / this.webGlView.height) * 2 + 1;

		// check if we hit any of the points in the particle system
		this.raycaster.params.Points.threshold = 16*1/Math.pow(2, this.webGlView.scale);
		this.raycaster.setFromCamera(this.mouse, this.webGlView.camera);
		var intersections = this.raycaster.intersectObjects(this.raycastObjects);
		intersection = (intersections.length) > 0 ? intersections[0] : null;

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
			}
			if(this.webGlView && this.webGlView.map)
				this.webGlView.map.setOptions({draggableCursor:null});
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
		var strokeColor = (options.strokeColor !== null && options.strokeColor !== undefined) ? options.strokeColor : 0xFFFFFF;

		if(features === null || features.length === 0)
			return null;

		var geometry = new THREE.Geometry();
		var outline = new THREE.Geometry();
		var vertexOffset = geometry.vertices.length;
		var numPolygons = 0;

		for(var i=0; i<features.length; i++){
			var feature = features[i];
			if(feature.length === 0) continue;

			// iterate every feature which should contain a list of 
			// [array of polygons [outer loop], [inner loop 1], ..., [inner loop n]]
			for(var j=0; j<feature.length; j++){
				var polygon  = feature[j];
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
		}

		var coveragePolygon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
			color: fillColor,
			opacity: 0.25, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		var outlinePolygon = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({
			color: strokeColor,
			linewidth: 2,
			opacity: 0.25, 
			transparent: true,
			depthWrite: false,
			depthTest: false
		}));

		return {shape: coveragePolygon, outline: outlinePolygon};
	};

	window.PolygonRenderer = PolygonRenderer;
}());
(function(){
	var vshader = (function () {/*
		attribute vec4 tile;
		varying vec2 vUv;
		varying vec4 vTile;
		void main() {
			vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * mvPosition;
			vUv = uv;
			vTile = tile;
		}
	*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];

	var fshader = (function () {/*
		uniform sampler2D tex1;
		uniform float alpha;
		varying vec2 vUv;
		varying vec4 vTile;
		void main() {
			vec2 uv = vTile.xy + vTile.zw * vUv;
			gl_FragColor = texture2D(tex1, uv) * vec4(1, 1, 1, alpha);
		}
	*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];

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
		this.positions.fill(START_VALUE);
		this.positionsAttribute = new THREE.BufferAttribute(this.positions, 3);
		this.positionsAttribute.setDynamic(true);

		this.indices = new Uint16Array(1024*INDEX_INTERVAL); 
		this.indicesAttribute = new THREE.BufferAttribute(this.indices, 1);
		this.indicesAttribute.setDynamic(true);

		this.uv = new Float32Array(1024*UV_INTERVAL); 
		this.uvAttribute = new THREE.BufferAttribute(this.uv, 2); 
		this.uvAttribute.setDynamic(true);

		this.tiles = new Float32Array(1024*TILE_INTERVAL); 
		this.tilesAttribute = new THREE.BufferAttribute(this.tiles, 4); 
		this.tilesAttribute.setDynamic(true);

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

	var WebGLView = function() {
		this.camera = new THREE.OrthographicCamera(0, 255, 0, 255, -3000, 3000);
		this.camera.position.z = 1000;
		this.scene = new THREE.Scene();
		this.sceneMask = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialiasing: true,
			clearColor: 0x000000,
			clearAlpha: 0

		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.autoClear = false;
		this.context = this.renderer.context;
		this.animationFrame = null;
		this.objectRenderers = [];
		this.numMasks = 0;

		this.update = function() {
			var map = this.map;
			var bounds = map.getBounds();
			var topLeft = new google.maps.LatLng(
				bounds.getNorthEast().lat(),
				bounds.getSouthWest().lng()
			);

			// Translate the webgl canvas based on maps's bounds
			var canvas = this.renderer.domElement;
			var point = this.getProjection().fromLatLngToDivPixel(topLeft);
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

			if(maskEnabled) {
				context.colorMask( false, false, false, false );
				context.depthMask( false );

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

			this.dispatchEvent({type: 'render'});
		};
	};

	WebGLView.prototype = _.extend(new google.maps.OverlayView(), new THREE.EventDispatcher());
	WebGLView.prototype.constructor = WebGLView;

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
		//!TODO: Remove dependency of PointRenderer from WebGLView
		this.pointRenderer = new PointRenderer(this).init();
		this.scene.add(this.pointRenderer.sceneObject);
		this.spriteRenderer = new SpriteRenderer().init();
		this.scene.add(this.spriteRenderer.sceneObject);
		this.polygonRenderer = new PolygonRenderer().init();
		this.lineRenderer = new LineRenderer().init();
		// add them to an array so we can draw/update them all later
		this.objectRenderers.push(this.pointRenderer);
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
		delete line;
	};

	WebGLView.prototype.createMask = function(options) {
		var mask = this.polygonRenderer.create(options);
		if(mask !== null) {
			this.addMask(mask);
			this.numMasks++;
		}
		return mask;
	};

	WebGLView.prototype.addMask = function(geometry) {
		this.sceneMask.add(geometry.shape);
		this.sceneMask.add(geometry.outline);
		this.numMasks++;
	};

	WebGLView.prototype.removeMask = function(geometry) {
		this.sceneMask.remove(geometry.shape);
		this.sceneMask.remove(geometry.outline);
		this.numMasks--;
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
		var map = this.map,
			bounds = map.getBounds(),
			boundsNeLatLng = bounds.getNorthEast(),
			boundsSwLatLng = bounds.getSouthWest(),
			boundsNwLatLng = new google.maps.LatLng(boundsNeLatLng.lat(), boundsSwLatLng.lng()),
			boundsSeLatLng = new google.maps.LatLng(boundsSwLatLng.lat(), boundsNeLatLng.lng()),
			zoom = map.getZoom(),
			projection = map.getProjection(),
			tileCoordinateNw = convertPointToTile(boundsNwLatLng, zoom, projection),
			tileCoordinateSe = convertPointToTile(boundsSeLatLng, zoom, projection),
			visibleBounds = new Rectangle(tileCoordinateNw.x, tileCoordinateNw.y, 
				tileCoordinateSe.x-tileCoordinateNw.x, tileCoordinateSe.y-tileCoordinateNw.y);

		zoom = Math.max(this.minZoom, zoom);
		zoom = Math.min(this.maxZoom, zoom);

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
				featureCollection.polygons.push(feature.polygons);
			if(feature.points.length > 0)
				featureCollection.points = featureCollection.points.concat(feature.points);
			if(feature.lines.length > 0)
				featureCollection.lines.push(feature.lines);
		}
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
		if(feature.geometry.type == "Polygon") {
			polygons.push(this._parseCoordinates(feature.geometry.coordinates));
		}
		else if(feature.geometry.type == "MultiPolygon") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++)
				polygons.push(this._parseCoordinates(coordinates[i]));
		}
		else if(feature.geometry.type == "Point") {
			var coordinates = feature.geometry.coordinates;
			var latLng = new google.maps.LatLng(coordinates[1], coordinates[0]);
			var point = this.projection.fromLatLngToPoint(latLng);
			points.push({latLng: latLng, point: point});
		}
		else if(feature.geometry.type == "LineString") {
			lines.push(this._parseCoordinates(feature.geometry.coordinates));
		}
		return {polygons:polygons, points:points, lines:lines};
	};

	GeoJSONDataSource.prototype._parseCoordinates = function(coordinates) {
		var polygon = [];
		for(var i=0; i<coordinates.length; i++) {
			var points = [];
			for(var j=0; j<coordinates[i].length; j++) {
				var latLng = new google.maps.LatLng(coordinates[i][j][1], coordinates[i][j][0]);
				var point = this.projection.fromLatLngToPoint(latLng);
				points.push([point.x, point.y]);
			}
			polygon.push(points);
		}
		return polygon;
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

	STADataSource.prototype.parse = function(data) {
		var projection = this.projection;
		var data = new Uint32Array(response.data);
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
		// console.log("Showing tile: " + url);
		if(this.shownTiles[url]) return;
		this.shownTiles[url] = true;

		if(this.tiles[url]) {
			if(this.tiles[url].polygon || this.tiles[url].line)
				if(this.tiles[url].polygon)
					this.webGlView.addGeometry(this.tiles[url].polygon);
				if(this.tiles[url].line)
					this.webGlView.addLine(this.tiles[url].line);
			else if(this.tiles[url].data) 
				this.createFeatures(this.tiles[url].data);
		}else{
			var self = this;
			this.tileProvider.getTile(x, y, z)
				.then(function(response){
					self.tiles[url] = response;
					if(self.shownTiles[url])
						self.createFeatures(self.tiles[url].data);
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
			if(this.tiles[url].polygon) {
				this.webGlView.removeGeometry(this.tiles[url].polygon);
				delete this.tiles[url].polygon;
				this.tiles[url].polygon = null;
			}

			if(this.tiles[url].line) {
				this.webGlView.removeLine(this.tiles[url].line);
				delete this.tiles[url].line;
				this.tiles[url].line = null;
			}
		}
	};

	VectorTileView.prototype.clear = function() {
		for(var url in this.tiles) {
			if(this.tiles[url].polygon) {
				this.webGlView.removeGeometry(this.tiles[url].polygon);
				delete this.tiles[url].polygon;
				this.tiles[url].polygon = null;
			}

			if(this.tiles[url].line) {
				this.webGlView.removeLine(this.tiles[url].line);
				delete this.tiles[url].line;
				this.tiles[url].line = null;
			}
		}
		this.webGlView.draw();
	};

	VectorTileView.prototype.createFeatures = function(features) {
		var added = false;

		if(features.polygons.length > 0) {
			var polygonOptions = {};
			polygonOptions.features = features.polygons;
			polygonOptions.fillColor = this.useRandomColors ? getRandomColor() : null;
			this.tiles[url].polygon = this.webGlView.createGeometry(polygonOptions);
			added = true;
		}

		if(features.lines.length > 0) {
			var lineOptions = {};
			lineOptions.features = features.lines;
			lineOptions.strokeColor = this.useRandomColors ? getRandomColor() : null;
			this.tiles[url].line = this.webGlView.createLine(lineOptions);
			added = true;
		}

		if(added)
			this.webGlView.draw();
	};

	window.VectorTileView = VectorTileView;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJnZW9tcy9yZWN0YW5nbGUuanMiLCJncmFwaGljcy9keW5hbWljX3Nwcml0ZXNoZWV0LmpzIiwiZ3JhcGhpY3MvbGluZV9yZW5kZXJlci5qcyIsImdyYXBoaWNzL29iamVjdF9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3BvaW50X3JlbmRlcmVyLmpzIiwiZ3JhcGhpY3MvcG9seWdvbl9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3Nwcml0ZV9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3Nwcml0ZXNoZWV0LmpzIiwiZ3JhcGhpY3Mvd2ViZ2xfdmlldy5qcyIsInV0aWxzL2h0dHByZXF1ZXN0cy5qcyIsImdpcy9jb250cm9sbGVycy9jbHVzdGVyX2NvbnRyb2xsZXIuanMiLCJnaXMvY29udHJvbGxlcnMvdGlsZV9jb250cm9sbGVyLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL2dlb2pzb25fZGF0YXNvdXJjZS5qcyIsImdpcy9kYXRhc291cmNlcy9pbWFnZV9kYXRhc291cmNlLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL3N0YV9kYXRhc291cmNlLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL3RpbGVfcHJvdmlkZXIuanMiLCJnaXMvdmlld3MvaW1hZ2VfdGlsZV92aWV3LmpzIiwiZ2lzL3ZpZXdzL3NpdGVfY2x1c3Rlcl92aWV3LmpzIiwiZ2lzL3ZpZXdzL3ZlY3Rvcl90aWxlX3ZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJjYXJ0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGRlY2xhcmUgcGFja2FnZSBuYW1lc1xudmFyIGNhcnRlID0ge307IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBSZWN0YW5nbGUgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG5cdFx0dGhpcy54ID0geDtcblx0XHR0aGlzLnkgPSB5O1xuXHRcdHRoaXMud2lkdGggPSB3aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblx0XHR0aGlzLnVseCA9IHg7XG5cdFx0dGhpcy51bHkgPSB5O1xuXHRcdHRoaXMubHJ4ID0geCt3aWR0aDtcblx0XHR0aGlzLmxyeSA9IHkrd2lkdGg7XG5cdH07XG5cblx0UmVjdGFuZ2xlLnByb3RvdHlwZS5jb250YWluc1BvaW50ID0gZnVuY3Rpb24oeCwgeSkge1xuXHRcdHJldHVybiB0aGlzLnVseDw9eCAmJiB4PD10aGlzLmxyeCAmJiB0aGlzLnVseTw9eSAmJiB5PD10aGlzLmxyeTtcblx0fTtcblxuXHRSZWN0YW5nbGUucHJvdG90eXBlLmNvbnRhaW5zUmVjdCA9IGZ1bmN0aW9uKHJlY3QpIHtcblx0XHRyZXR1cm4gdGhpcy5jb250YWluc1BvaW50KHJlY3QueCwgcmVjdC55KSAmJiBcblx0XHRcdHRoaXMuY29udGFpbnNQb2ludChyZWN0LngrcmVjdC53aWR0aCwgcmVjdC55K3JlY3QuaGVpZ2h0KTtcblx0fTtcblxuXHRSZWN0YW5nbGUucHJvdG90eXBlLmNvbnRhaW5zRGltZW5zaW9ucyA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQpIHtcblx0XHRyZXR1cm4gdGhpcy53aWR0aCA+PSB3aWR0aCAmJiB0aGlzLmhlaWdodCA+PSBoZWlnaHQ7XG5cdH07XG5cblx0UmVjdGFuZ2xlLnByb3RvdHlwZS5nZXROb3JtYWxpemVkUmVjdCA9IGZ1bmN0aW9uKG1heFdpZHRoLCBtYXhIZWlnaHQpIHtcblx0XHR2YXIgeCA9IHRoaXMueCAvIG1heFdpZHRoLFxuXHRcdFx0eSA9IHRoaXMueSAvIG1heEhlaWdodCxcblx0XHRcdHdpZHRoID0gdGhpcy53aWR0aCAvIG1heFdpZHRoLFxuXHRcdFx0aGVpZ2h0ID0gdGhpcy5oZWlnaHQgLyBtYXhIZWlnaHQ7XG5cdFx0cmV0dXJuIG5ldyBSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG5cdH07XG5cblx0d2luZG93LlJlY3RhbmdsZSA9IFJlY3RhbmdsZTtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBTcHJpdGVOb2RlID0gZnVuY3Rpb24ocmVjdCkge1xuXHRcdHRoaXMucmVjdCA9IHJlY3Q7XG5cdFx0dGhpcy5uYW1lID0gXCJzcHJpdGUwXCI7XG5cdFx0dGhpcy5pbWFnZSA9IG51bGw7XG5cdFx0dGhpcy5jaGlsZCA9IFtdO1xuXHR9O1xuXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmNvbXB1dGVOb3JtYWwgPSBmdW5jdGlvbihtYXhXaWR0aCwgbWF4SGVpZ2h0KSB7XG5cdFx0dGhpcy5tYXhXaWR0aCA9IG1heFdpZHRoO1xuXHRcdHRoaXMubWF4SGVpZ2h0ID0gbWF4SGVpZ2h0O1xuXHRcdHRoaXMubm9ybWFsUmVjdCA9IHRoaXMucmVjdC5nZXROb3JtYWxpemVkUmVjdChtYXhXaWR0aCwgbWF4SGVpZ2h0KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQvKipcblx0ICogUGVyZm9ybSBtYXggcmVjdCBhbGdvcml0aG0gZm9yIGZpbmRpbmcgd2hlcmUgdG8gZml0IHRoZSBpbWFnZS5cblx0ICogU2FtcGxlIGltcGxlbWVudGF0aW9uIGZvciBsaWdodG1hcHM6IGh0dHA6Ly93d3cuYmxhY2twYXduLmNvbS90ZXh0cy9saWdodG1hcHMvXG5cdCAqL1xuXHRTcHJpdGVOb2RlLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbihuYW1lLCBpbWFnZSkge1xuXHRcdHZhciBuZXdOb2RlID0gbnVsbDtcblx0XHRpZih0aGlzLmltYWdlICE9PSBudWxsKSB7XG5cdFx0XHQvLyB0aGlzIGFscmVhZHkgY29udGFpbnMgYW4gaW1hZ2Ugc28gbGV0J3MgY2hlY2sgaXQncyBjaGlsZHJlblxuXHRcdFx0aWYodGhpcy5jaGlsZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdG5ld05vZGUgPSB0aGlzLmNoaWxkWzBdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHRcdGlmKG5ld05vZGUgIT09IG51bGwpIHJldHVybiBuZXdOb2RlO1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5jaGlsZFsxXS5pbnNlcnQobmFtZSwgaW1hZ2UpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdGhpcyBpcyBhIGxlYWYgbm9kZSBhbmQgYWxyZWFkeSBjb250YWlucyBhbiBpbWFnZSB0aGF0ICdqdXN0IGZpdHMnXG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYodGhpcy5yZWN0LmNvbnRhaW5zRGltZW5zaW9ucyhpbWFnZS53aWR0aCwgaW1hZ2UuaGVpZ2h0KSkge1xuXHRcdFx0XHRpZih0aGlzLnJlY3Qud2lkdGggPT0gaW1hZ2Uud2lkdGggJiYgdGhpcy5yZWN0LmhlaWdodCA9PSBpbWFnZS5oZWlnaHQpIHtcblx0XHRcdFx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdFx0XHRcdHRoaXMuaW1hZ2UgPSBpbWFnZTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHRoaXMuY2hpbGQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdG5ld05vZGUgPSB0aGlzLmNoaWxkWzBdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHRcdFx0aWYobmV3Tm9kZSAhPT0gbnVsbCkgcmV0dXJuIG5ld05vZGU7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRbMV0uaW5zZXJ0KG5hbWUsIGltYWdlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgcmVjdCA9IHRoaXMucmVjdDtcblx0XHRcdFx0XHR2YXIgZFcgPSB0aGlzLnJlY3Qud2lkdGggLSBpbWFnZS53aWR0aDtcblx0XHRcdFx0XHR2YXIgZEggPSB0aGlzLnJlY3QuaGVpZ2h0IC0gaW1hZ2UuaGVpZ2h0O1xuXHRcdFx0XHRcdGlmKGRXID4gZEgpIHtcblx0XHRcdFx0XHRcdC8vIHNwbGl0IHRoaXMgcmVjdGFuZ2xlIHZlcnRpY2FsbHkgaW50byB0d28sIGxlZnQgYW5kIHJpZ2h0XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzBdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngsIHJlY3QueSwgaW1hZ2Uud2lkdGgsIHJlY3QuaGVpZ2h0KSk7XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzFdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngraW1hZ2Uud2lkdGgsIHJlY3QueSwgZFcsIHJlY3QuaGVpZ2h0KSk7XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHQvLyBzcGxpdCB0aGlzIHJlY3RhbmdsZSBob3Jpem9udGFsbHkgaW50byB0d28sIG9uZSBhYm92ZSBhbm90aGVyIGJlbG93XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzBdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngsIHJlY3QueSwgcmVjdC53aWR0aCwgaW1hZ2UuaGVpZ2h0KSk7XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzFdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngsIHJlY3QueStpbWFnZS5oZWlnaHQsIHJlY3Qud2lkdGgsIGRIKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuY2hpbGRbMF0uY29tcHV0ZU5vcm1hbCh0aGlzLm1heFdpZHRoLCB0aGlzLm1heEhlaWdodCk7XG5cdFx0XHRcdFx0dGhpcy5jaGlsZFsxXS5jb21wdXRlTm9ybWFsKHRoaXMubWF4V2lkdGgsIHRoaXMubWF4SGVpZ2h0KTtcblx0XHRcdFx0XHQvLyB0aGlzIGltYWdlIHNob3VsZCBhdXRvbWF0aWNhbGx5IGZpdCB0aGUgZmlyc3Qgbm9kZVxuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNoaWxkWzBdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdC8vIHRoaXMgd2lsbCBub3QgZml0IHRoaXMgbm9kZVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHR9O1xuXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRpZih0aGlzLm5hbWUgPT0gbmFtZSkgcmV0dXJuIHRoaXM7XG5cdFx0aWYodGhpcy5jaGlsZC5sZW5ndGggPiAwKSB7XG5cdFx0XHR2YXIgbm9kZSA9IHRoaXMuY2hpbGRbMF0uZ2V0KG5hbWUpO1xuXHRcdFx0aWYobm9kZSAhPT0gbnVsbCkgcmV0dXJuIG5vZGU7XG5cdFx0XHRyZXR1cm4gdGhpcy5jaGlsZFsxXS5nZXQobmFtZSk7XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9O1xuXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHR2YXIgbm9kZSA9IHRoaXMuZ2V0KG5hbWUpO1xuXHRcdGlmKG5vZGUpIG5vZGUuY2xlYXIoKTtcblx0XHRyZXR1cm4gbm9kZTtcblx0fTtcblxuXHRTcHJpdGVOb2RlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMubmFtZSA9IFwiXCI7XG5cdFx0dGhpcy5pbWFnZSA9IG51bGw7XG5cdH07XG5cblx0dmFyIER5bmFtaWNTcHJpdGVTaGVldCA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQpIHtcblx0XHR0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuY2FudmFzLndpZHRoID0gd2lkdGg7XG5cdFx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcblx0XHR0aGlzLnRleHR1cmUgPSBuZXcgVEhSRUUuVGV4dHVyZSh0aGlzLmNhbnZhcyk7XG5cdFx0dGhpcy50ZXh0dXJlLm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XG5cdFx0dGhpcy50ZXh0dXJlLm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XG5cdFx0dGhpcy50ZXh0dXJlLmZsaXBZID0gZmFsc2U7XG5cblx0XHR0aGlzLnBub2RlID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZSgwLCAwLCB3aWR0aCwgaGVpZ2h0KSk7XG5cdFx0dGhpcy5wbm9kZS5jb21wdXRlTm9ybWFsKHdpZHRoLCBoZWlnaHQpO1xuXHR9O1xuXG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUgPSBuZXcgVEhSRUUuRXZlbnREaXNwYXRjaGVyKCk7XG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEeW5hbWljU3ByaXRlU2hlZXQ7XG5cblx0RHluYW1pY1Nwcml0ZVNoZWV0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucG5vZGUuZ2V0KG5hbWUpO1xuXHR9O1xuXG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24obmFtZSwgaW1hZ2UpIHtcblx0XHRpZihpbWFnZSA9PT0gdW5kZWZpbmVkIHx8IGltYWdlID09PSBudWxsKSByZXR1cm4gbnVsbDtcblx0XHRpZih0aGlzLmdldChuYW1lKSAhPT0gbnVsbCkgcmV0dXJuIG51bGw7XG5cdFx0dmFyIG5vZGUgPSB0aGlzLnBub2RlLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0aWYobm9kZSkge1xuXHRcdFx0dmFyIHJlY3QgPSBub2RlLnJlY3Q7XG5cdFx0XHR0aGlzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCByZWN0LngsIHJlY3QueSk7XG5cdFx0XHR0aGlzLnRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnc3ByaXRlX2FkZGVkJ30pO1xuXHRcdH1cblx0XHRyZXR1cm4gbm9kZTtcblx0fTtcblxuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHR2YXIgbm9kZSA9IHRoaXMucG5vZGUuZGVsZXRlKG5hbWUpO1xuXHRcdGlmKG5vZGUpIHtcblx0XHRcdHZhciByZWN0ID0gbm9kZS5yZWN0O1xuXHRcdFx0dGhpcy5jb250ZXh0LmNsZWFyUmVjdChyZWN0LngsIHJlY3QueSwgcmVjdC53aWR0aCwgcmVjdC5oZWlnaHQpO1xuXHRcdFx0dGhpcy50ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ3Nwcml0ZV9yZW1vdmVkJ30pO1xuXHRcdH1cblx0XHRyZXR1cm4gbm9kZTtcblx0fTtcblxuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihuYW1lLCB1cmwpIHtcblxuXHR9O1xuXG5cdHdpbmRvdy5EeW5hbWljU3ByaXRlU2hlZXQgPSBEeW5hbWljU3ByaXRlU2hlZXQ7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgTGluZVJlbmRlcmVyID0gZnVuY3Rpb24oKSB7fTtcblxuXHRMaW5lUmVuZGVyZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH07XG5cblx0TGluZVJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xuXG5cdExpbmVSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xuXG5cdExpbmVSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdHZhciBmZWF0dXJlcyA9IG9wdGlvbnMuZmVhdHVyZXMgfHwgW107XG5cdFx0dmFyIHN0cm9rZUNvbG9yID0gKG9wdGlvbnMuc3Ryb2tlQ29sb3IgIT09IG51bGwgJiYgb3B0aW9ucy5zdHJva2VDb2xvciAhPT0gdW5kZWZpbmVkKSA/IG9wdGlvbnMuc3Ryb2tlQ29sb3IgOiAweEZGRkZGRjtcblxuXHRcdGlmKGZlYXR1cmVzID09PSBudWxsIHx8IGZlYXR1cmVzLmxlbmd0aCA9PT0gMClcblx0XHRcdHJldHVybiBudWxsO1xuXG5cdFx0dmFyIGxpbmUgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcblxuXHRcdGZvcih2YXIgaT0wOyBpPGZlYXR1cmVzLmxlbmd0aDsgaSsrKXtcblx0XHRcdHZhciBmZWF0dXJlID0gZmVhdHVyZXNbaV07XG5cdFx0XHRpZihmZWF0dXJlLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG5cblx0XHRcdC8vIGl0ZXJhdGUgZXZlcnkgZmVhdHVyZSB3aGljaCBzaG91bGQgY29udGFpbiBhIGxpc3Qgb2YgXG5cdFx0XHQvLyBbYXJyYXkgb2YgcG9seWdvbnMgW291dGVyIGxvb3BdLCBbaW5uZXIgbG9vcCAxXSwgLi4uLCBbaW5uZXIgbG9vcCBuXV1cblx0XHRcdGZvcih2YXIgaj0wOyBqPGZlYXR1cmUubGVuZ3RoOyBqKyspe1xuXHRcdFx0XHR2YXIgcG9seWdvbiAgPSBmZWF0dXJlW2pdO1xuXHRcdFx0XHRmb3IodmFyIHA9MDsgcDxwb2x5Z29uLmxlbmd0aDsgcCsrKSB7XG5cdFx0XHRcdFx0dmFyIGxvb3AgPSBwb2x5Z29uW3BdO1xuXHRcdFx0XHRcdGZvcih2YXIgbD0wOyBsPGxvb3AubGVuZ3RoOyBsKyspIHtcblx0XHRcdFx0XHRcdHZhciBjb29yZGluYXRlID0gbG9vcFtsXTtcblx0XHRcdFx0XHRcdHZhciBwb2ludCA9IHt4OiBjb29yZGluYXRlWzBdLCB5OiBjb29yZGluYXRlWzFdfTtcblxuXHRcdFx0XHRcdFx0dmFyIHZlcnRleDEgPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludC54LCBwb2ludC55LCAxKTtcblx0XHRcdFx0XHRcdGxpbmUudmVydGljZXMucHVzaCh2ZXJ0ZXgxKTtcblxuXHRcdFx0XHRcdFx0dmFyIGNvb3JkMCwgcG9pbnQwLCB2ZXJ0ZXgwO1xuXHRcdFx0XHRcdFx0aWYobCA9PSBsb29wLmxlbmd0aC0xKSB7XG5cdFx0XHRcdFx0XHRcdGNvb3JkMCA9IGxvb3BbMF07XG5cdFx0XHRcdFx0XHRcdHBvaW50MCA9IHt4OiBjb29yZDBbMF0sIHk6IGNvb3JkMFsxXX07XG5cdFx0XHRcdFx0XHRcdHZlcnRleDAgPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludDAueCwgcG9pbnQwLnksIDEpO1xuXHRcdFx0XHRcdFx0XHRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MCk7XG5cdFx0XHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRcdFx0Y29vcmQwID0gbG9vcFtsKzFdO1xuXHRcdFx0XHRcdFx0XHRwb2ludDAgPSB7eDogY29vcmQwWzBdLCB5OiBjb29yZDBbMV19O1xuXHRcdFx0XHRcdFx0XHR2ZXJ0ZXgwID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQwLngsIHBvaW50MC55LCAxKTtcblx0XHRcdFx0XHRcdFx0bGluZS52ZXJ0aWNlcy5wdXNoKHZlcnRleDApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVx0XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIGxpbmVQb2x5Z29uID0gbmV3IFRIUkVFLkxpbmVTZWdtZW50cyhsaW5lLCBuZXcgVEhSRUUuTGluZUJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0Y29sb3I6IHN0cm9rZUNvbG9yLFxuXHRcdFx0bGluZXdpZHRoOiAyLFxuXHRcdFx0b3BhY2l0eTogMC4yNSwgXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pKTtcblxuXHRcdHJldHVybiBsaW5lUG9seWdvbjtcblx0fTtcblxuXHR3aW5kb3cuTGluZVJlbmRlcmVyID0gTGluZVJlbmRlcmVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIE9iamVjdFJlbmRlcmVyID0gZnVuY3Rpb24oKSB7fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkgeyBcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKCkge1xuXG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihvYmplY3QpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihvYmplY3QpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24ob2JqZWN0KSB7XG5cblx0fTtcblxuXHR3aW5kb3cuT2JqZWN0UmVuZGVyZXIgPSBPYmplY3RSZW5kZXJlcjtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciB2c2hhZGVyID0gKGZ1bmN0aW9uICgpIHsvKlxuXHRcdHVuaWZvcm0gZmxvYXQgcG9pbnRTaXplO1xuXHRcdGF0dHJpYnV0ZSB2ZWM0IHRpbGU7XG5cdFx0dmFyeWluZyB2ZWM0IHZUaWxlO1xuXHRcdHZhcnlpbmcgdmVjMyB2Q29sb3I7XG5cblx0XHR2b2lkIG1haW4oKSB7XG5cdFx0XHR2ZWM0IG12UG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KHBvc2l0aW9uLCAxLjApO1xuXHRcdFx0Z2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcblx0XHRcdGdsX1BvaW50U2l6ZSA9IHBvaW50U2l6ZTtcblx0XHRcdHZUaWxlID0gdGlsZTtcblx0XHRcdHZDb2xvciA9IGNvbG9yO1xuXHRcdH1cblx0Ki99KS50b1N0cmluZygpLm1hdGNoKC9bXl0qXFwvXFwqKFteXSopXFwqXFwvXFx9JC8pWzFdO1xuXG5cdHZhciBmc2hhZGVyID0gKGZ1bmN0aW9uICgpIHsvKlxuXHRcdHVuaWZvcm0gc2FtcGxlcjJEIHRleDE7XG5cdFx0dW5pZm9ybSB2ZWMyIHNwcml0ZVNpemU7XG5cdFx0dmFyeWluZyB2ZWM0IHZUaWxlO1xuXHRcdHZhcnlpbmcgdmVjMyB2Q29sb3I7XG5cblx0XHR2b2lkIG1haW4oKSB7XG5cdFx0XHR2ZWMyIHRpbGVVViA9IHZUaWxlLnh5ICsgdlRpbGUuencgKiBnbF9Qb2ludENvb3JkO1xuXHRcdFx0Z2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHRleDEsIHRpbGVVVikgKiB2ZWM0KHZDb2xvci5yZ2IsIDEuMCk7XG5cdFx0fVxuXHQqL30pLnRvU3RyaW5nKCkubWF0Y2goL1teXSpcXC9cXCooW15dKilcXCpcXC9cXH0kLylbMV07XG5cblx0dmFyIE1BWF9DT1VOVCA9IE1hdGgucG93KDIsMzIpIC0gMTtcblx0dmFyIFNUQVJUX1ZBTFVFID0gLTk5OTk5LjA7XG5cblx0dmFyIE1hcmtlciA9IGZ1bmN0aW9uKCkge307XG5cdE1hcmtlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFRIUkVFLkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuXG5cdHZhciBQb2ludFJlbmRlcmVyID0gZnVuY3Rpb24od2ViR2xWaWV3KSB7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy5wb2ludFNpemUgPSAzMi4wO1xuXG5cdFx0dGhpcy5yYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cdFx0dGhpcy5tb3VzZSA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG5cdFx0dGhpcy5tYXJrZXJzID0ge307XG5cdFx0dGhpcy5ob3ZlcmVkTWFya2VyID0gbnVsbDtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNQVhfQ09VTlQ7XG5cdFx0dGhpcy5tYXhJbmRleCA9IDA7XG5cdFx0dGhpcy5pbmRleCA9IDA7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucG9zaXRpb25zID0gbmV3IEZsb2F0MzJBcnJheSgxMDAwMDAwICogMyk7XG5cdFx0dGhpcy5wb3NpdGlvbnMuZmlsbChTVEFSVF9WQUxVRSk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMucG9zaXRpb25zLCAzKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy5jb2xvcnMgPSBuZXcgRmxvYXQzMkFycmF5KDEwMDAwMDAgKiAzKTtcblx0XHR0aGlzLmNvbG9yc0F0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy5jb2xvcnMsIDMpO1xuXHRcdHRoaXMuY29sb3JzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLnRpbGVzID0gbmV3IEZsb2F0MzJBcnJheSgxMDAwMDAwICogNCk7IFxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMudGlsZXMsIDQpOyBcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLmdlb21ldHJ5ID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XG5cdFx0dGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgdGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCdjb2xvcicsIHRoaXMuY29sb3JzQXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgndGlsZScsIHRoaXMudGlsZXNBdHRyaWJ1dGUpO1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBEeW5hbWljU3ByaXRlU2hlZXQoMjU2LCAyNTYpO1xuXHRcdHRoaXMubWF0ZXJpYWwgPSBuZXcgVEhSRUUuU2hhZGVyTWF0ZXJpYWwoIHtcblx0XHRcdHVuaWZvcm1zOiB7XG5cdFx0XHRcdHRleDE6IHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLnNwcml0ZVNoZWV0LnRleHR1cmUgfSxcblx0XHRcdFx0cG9pbnRTaXplOiB7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5wb2ludFNpemUgfVxuXHRcdFx0fSxcblx0XHRcdHZlcnRleENvbG9yczogVEhSRUUuVmVydGV4Q29sb3JzLFxuXHRcdFx0dmVydGV4U2hhZGVyOiB2c2hhZGVyLFxuXHRcdFx0ZnJhZ21lbnRTaGFkZXI6IGZzaGFkZXIsXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zY2VuZU9iamVjdCA9IG5ldyBUSFJFRS5Qb2ludHModGhpcy5nZW9tZXRyeSwgdGhpcy5tYXRlcmlhbCk7XG5cdFx0dGhpcy5yYXljYXN0T2JqZWN0cyA9IFt0aGlzLnNjZW5lT2JqZWN0XTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuaGFuZGxlRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSwgZmFsc2UpO1xuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5oYW5kbGVEb2N1bWVudE1vdXNlQ2xpY2suYmluZCh0aGlzKSwgZmFsc2UpO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLmhhbmRsZURvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHR0aGlzLnVwZGF0ZShldmVudCk7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlRG9jdW1lbnRNb3VzZUNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHR0aGlzLnVwZGF0ZShldmVudCk7XG5cdFx0aWYodGhpcy5ob3ZlcmVkTWFya2VyKSBcblx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlci5kaXNwYXRjaEV2ZW50KHt0eXBlOiBcImNsaWNrXCJ9KTtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5fY3JlYXRlTWFya2VyID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHR2YXIgbWFya2VyID0gbmV3IE1hcmtlcigpO1xuXHRcdG1hcmtlci5pbmRleCA9IGluZGV4O1xuXHRcdHRoaXMubWFya2Vyc1tpbmRleF0gPSBtYXJrZXI7XG5cdFx0cmV0dXJuIG1hcmtlcjtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIGFycmF5SW5kZXggPSB0aGlzLmluZGV4ICogMztcblx0XHR3aGlsZShhcnJheUluZGV4IDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoICYmIHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXhdICE9PSBTVEFSVF9WQUxVRSlcblx0XHRcdGFycmF5SW5kZXggPSArK3RoaXMuaW5kZXgqMztcblxuXHRcdGlmKGFycmF5SW5kZXggPj0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoKXtcblx0XHRcdC8vIVRPRE86IEV4cGFuZCBwb2ludHMgYnVmZmVyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltQb2ludFJlbmRlcmVyXSBSdW4gb3V0IG9mIHBvaW50cyEhIVwiKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHRvcHRpb25zLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbiB8fCB7eDowLCB5OjAsIHo6MH07XG5cdFx0b3B0aW9ucy5jb2xvciA9IG9wdGlvbnMuY29sb3IgfHwge3I6MSwgZzoxLCBiOjF9O1xuXG5cdFx0dGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleCArIDBdID0gb3B0aW9ucy5wb3NpdGlvbi54O1xuXHRcdHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXggKyAxXSA9IG9wdGlvbnMucG9zaXRpb24ueTtcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMl0gPSBvcHRpb25zLnBvc2l0aW9uLno7XG5cblx0XHR0aGlzLmNvbG9yc1thcnJheUluZGV4ICsgMF0gPSBvcHRpb25zLmNvbG9yLnI7XG5cdFx0dGhpcy5jb2xvcnNbYXJyYXlJbmRleCArIDFdID0gb3B0aW9ucy5jb2xvci5nO1xuXHRcdHRoaXMuY29sb3JzW2FycmF5SW5kZXggKyAyXSA9IG9wdGlvbnMuY29sb3IuYjtcblxuXHRcdHZhciBzcHJpdGUgPSB0aGlzLnNwcml0ZVNoZWV0LmdldChvcHRpb25zLmltYWdlTmFtZSk7XG5cdFx0aWYoIXNwcml0ZSkge1xuXHRcdFx0c3ByaXRlID0gdGhpcy5zcHJpdGVTaGVldC5hZGQob3B0aW9ucy5pbWFnZU5hbWUsIG9wdGlvbnMuaW1hZ2UpO1xuXHRcdFx0aWYoIXNwcml0ZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltQb2ludFJlbmRlcmVyXSBTcHJpdGVTaGVldCBhbHJlYWR5IGZ1bGwuXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgc3ByaXRlUmVjdCA9IHNwcml0ZSAhPT0gbnVsbCA/IHNwcml0ZS5ub3JtYWxSZWN0IDoge3g6MCwgeTowLCB3aWR0aDowLCBoZWlnaHQ6MH07XG5cdFx0dGhpcy50aWxlc1t0aGlzLmluZGV4KjQgKyAwXSA9IHNwcml0ZVJlY3QueDtcblx0XHR0aGlzLnRpbGVzW3RoaXMuaW5kZXgqNCArIDFdID0gc3ByaXRlUmVjdC55O1xuXHRcdHRoaXMudGlsZXNbdGhpcy5pbmRleCo0ICsgMl0gPSBzcHJpdGVSZWN0LndpZHRoO1xuXHRcdHRoaXMudGlsZXNbdGhpcy5pbmRleCo0ICsgM10gPSBzcHJpdGVSZWN0LmhlaWdodDtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNYXRoLm1pbih0aGlzLm1pbkluZGV4LCB0aGlzLmluZGV4KTtcblx0XHR0aGlzLm1heEluZGV4ID0gTWF0aC5tYXgodGhpcy5tYXhJbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0dmFyIG1hcmtlciA9IHRoaXMubWFya2Vyc1t0aGlzLmluZGV4XSB8fCB0aGlzLl9jcmVhdGVNYXJrZXIodGhpcy5pbmRleCk7XG5cdFx0bWFya2VyLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdHRoaXMuaW5kZXgrKztcblx0XHRyZXR1cm4gbWFya2VyO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdHZhciBhcnJheUluZGV4ID0gbWFya2VyLmluZGV4ICogMztcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMF0gPSBTVEFSVF9WQUxVRTtcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMV0gPSBTVEFSVF9WQUxVRTtcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMl0gPSBTVEFSVF9WQUxVRTtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNYXRoLm1pbih0aGlzLm1pbkluZGV4LCBtYXJrZXIuaW5kZXgpO1xuXHRcdHRoaXMubWF4SW5kZXggPSBNYXRoLm1heCh0aGlzLm1heEluZGV4LCBtYXJrZXIuaW5kZXgpO1xuXG5cdFx0aWYodGhpcy5pbmRleCA+IG1hcmtlci5pbmRleCkgdGhpcy5pbmRleCA9IG1hcmtlci5pbmRleDtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oKSB7XG5cdFx0Ly8gb25seSB1cGRhdGUgcG9zaXRpb25zIHRoYXQgY2hhbmdlZCBieSBwYXNzaW5nIGEgcmFuZ2Vcblx0XHR0aGlzLm1pbkluZGV4ID0gKHRoaXMubWluSW5kZXggPT0gTUFYX0NPVU5UKSA/IDAgOiB0aGlzLm1pbkluZGV4O1xuXHRcdHZhciBuZWVkc1VwZGF0ZSA9IHRoaXMubWF4SW5kZXggIT0gdGhpcy5taW5JbmRleDtcblxuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqMztcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KjMrMyktKHRoaXMubWluSW5kZXgqMyk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHRoaXMuY29sb3JzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqMztcblx0XHR0aGlzLmNvbG9yc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KjMrMyktKHRoaXMubWluSW5kZXgqMyk7XG5cdFx0dGhpcy5jb2xvcnNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCo0O1xuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCo0KzQpLSh0aGlzLm1pbkluZGV4KjQpO1xuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdGlmKG5lZWRzVXBkYXRlKSB7XG5cdFx0XHR0aGlzLmdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXHRcdFx0dGhpcy5nZW9tZXRyeS5jb21wdXRlQm91bmRpbmdTcGhlcmUoKTtcblx0XHR9XG5cblx0XHR0aGlzLm1pbkluZGV4ID0gTUFYX0NPVU5UO1xuXHRcdHRoaXMubWF4SW5kZXggPSAwO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0dGhpcy5tb3VzZS54ID0gKGV2ZW50LmNsaWVudFggLyB0aGlzLndlYkdsVmlldy53aWR0aCkgKiAyIC0gMTtcblx0XHR0aGlzLm1vdXNlLnkgPSAtKGV2ZW50LmNsaWVudFkgLyB0aGlzLndlYkdsVmlldy5oZWlnaHQpICogMiArIDE7XG5cblx0XHQvLyBjaGVjayBpZiB3ZSBoaXQgYW55IG9mIHRoZSBwb2ludHMgaW4gdGhlIHBhcnRpY2xlIHN5c3RlbVxuXHRcdHRoaXMucmF5Y2FzdGVyLnBhcmFtcy5Qb2ludHMudGhyZXNob2xkID0gMTYqMS9NYXRoLnBvdygyLCB0aGlzLndlYkdsVmlldy5zY2FsZSk7XG5cdFx0dGhpcy5yYXljYXN0ZXIuc2V0RnJvbUNhbWVyYSh0aGlzLm1vdXNlLCB0aGlzLndlYkdsVmlldy5jYW1lcmEpO1xuXHRcdHZhciBpbnRlcnNlY3Rpb25zID0gdGhpcy5yYXljYXN0ZXIuaW50ZXJzZWN0T2JqZWN0cyh0aGlzLnJheWNhc3RPYmplY3RzKTtcblx0XHRpbnRlcnNlY3Rpb24gPSAoaW50ZXJzZWN0aW9ucy5sZW5ndGgpID4gMCA/IGludGVyc2VjdGlvbnNbMF0gOiBudWxsO1xuXG5cdFx0Ly8gd2UgaGl0IHNvbWV0aGluZ1xuXHRcdGlmKGludGVyc2VjdGlvbikge1xuXHRcdFx0Ly8gZmlyc3QgdGltZSB0byBob3ZlciBzb21ldGhpbmdcblx0XHRcdGlmKHRoaXMuaG92ZXJlZE1hcmtlciA9PT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIgPSB0aGlzLm1hcmtlcnNbaW50ZXJzZWN0aW9uLmluZGV4XTtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdtb3VzZW92ZXInfSk7XG5cdFx0XHR9XG5cdFx0XHQvLyB3ZSdyZSBhbHJlYWR5IGhvdmVyaW5nIHNvbWV0aGluZyB0aGVuIHNvbWV0aGluZyBnb3QgaW4gdGhlIHdheVxuXHRcdFx0ZWxzZSBpZih0aGlzLmhvdmVyZWRNYXJrZXIuaW5kZXggIT0gaW50ZXJzZWN0aW9uLmluZGV4KSB7XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlci5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnbW91c2VvdXQnfSk7XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlciA9IHRoaXMubWFya2Vyc1tpbnRlcnNlY3Rpb24uaW5kZXhdO1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ21vdXNlb3Zlcid9KTtcblx0XHRcdH1cblx0XHRcdGlmKHRoaXMud2ViR2xWaWV3ICYmIHRoaXMud2ViR2xWaWV3Lm1hcClcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcubWFwLnNldE9wdGlvbnMoe2RyYWdnYWJsZUN1cnNvcjoncG9pbnRlcid9KTtcblx0XHR9XG5cdFx0Ly8gdGhlcmUncyBub3RoaW5nIHVuZGVyIHRoZSBtb3VzZVxuXHRcdGVsc2Uge1xuXHRcdFx0Ly8gd2UgbG9zdCBvdXIgb2JqZWN0LiBieWUgYnllXG5cdFx0XHRpZih0aGlzLmhvdmVyZWRNYXJrZXIgIT09IG51bGwpIHtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdtb3VzZW91dCd9KTtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyID0gbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmKHRoaXMud2ViR2xWaWV3ICYmIHRoaXMud2ViR2xWaWV3Lm1hcClcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcubWFwLnNldE9wdGlvbnMoe2RyYWdnYWJsZUN1cnNvcjpudWxsfSk7XG5cdFx0fVxuXHR9O1xuXG5cdHdpbmRvdy5Qb2ludFJlbmRlcmVyID0gUG9pbnRSZW5kZXJlcjtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBQb2x5Z29uUmVuZGVyZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5cdFBvbHlnb25SZW5kZXJlci5wcm90b3R5cGUgPSBuZXcgT2JqZWN0UmVuZGVyZXIoKTtcblx0UG9seWdvblJlbmRlcmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBvbHlnb25SZW5kZXJlcjtcblxuXHRQb2x5Z29uUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHR2YXIgZmVhdHVyZXMgPSBvcHRpb25zLmZlYXR1cmVzIHx8IFtdO1xuXHRcdHZhciBmaWxsQ29sb3IgPSAob3B0aW9ucy5maWxsQ29sb3IgIT09IG51bGwgJiYgb3B0aW9ucy5maWxsQ29sb3IgIT09IHVuZGVmaW5lZCkgPyBvcHRpb25zLmZpbGxDb2xvciA6IDB4MDAwMEZGO1xuXHRcdHZhciBzdHJva2VDb2xvciA9IChvcHRpb25zLnN0cm9rZUNvbG9yICE9PSBudWxsICYmIG9wdGlvbnMuc3Ryb2tlQ29sb3IgIT09IHVuZGVmaW5lZCkgPyBvcHRpb25zLnN0cm9rZUNvbG9yIDogMHhGRkZGRkY7XG5cblx0XHRpZihmZWF0dXJlcyA9PT0gbnVsbCB8fCBmZWF0dXJlcy5sZW5ndGggPT09IDApXG5cdFx0XHRyZXR1cm4gbnVsbDtcblxuXHRcdHZhciBnZW9tZXRyeSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xuXHRcdHZhciBvdXRsaW5lID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XG5cdFx0dmFyIHZlcnRleE9mZnNldCA9IGdlb21ldHJ5LnZlcnRpY2VzLmxlbmd0aDtcblx0XHR2YXIgbnVtUG9seWdvbnMgPSAwO1xuXG5cdFx0Zm9yKHZhciBpPTA7IGk8ZmVhdHVyZXMubGVuZ3RoOyBpKyspe1xuXHRcdFx0dmFyIGZlYXR1cmUgPSBmZWF0dXJlc1tpXTtcblx0XHRcdGlmKGZlYXR1cmUubGVuZ3RoID09PSAwKSBjb250aW51ZTtcblxuXHRcdFx0Ly8gaXRlcmF0ZSBldmVyeSBmZWF0dXJlIHdoaWNoIHNob3VsZCBjb250YWluIGEgbGlzdCBvZiBcblx0XHRcdC8vIFthcnJheSBvZiBwb2x5Z29ucyBbb3V0ZXIgbG9vcF0sIFtpbm5lciBsb29wIDFdLCAuLi4sIFtpbm5lciBsb29wIG5dXVxuXHRcdFx0Zm9yKHZhciBqPTA7IGo8ZmVhdHVyZS5sZW5ndGg7IGorKyl7XG5cdFx0XHRcdHZhciBwb2x5Z29uICA9IGZlYXR1cmVbal07XG5cdFx0XHRcdGZvcih2YXIgcD0wOyBwPHBvbHlnb24ubGVuZ3RoOyBwKyspIHtcblx0XHRcdFx0XHR2YXIgbG9vcCA9IHBvbHlnb25bcF07XG5cdFx0XHRcdFx0dmFyIHBvaW50cyA9IFtdLCBob2xlSW5kaWNlcyA9IFtdLCBob2xlSW5kZXggPSAwO1xuXG5cdFx0XHRcdFx0Zm9yKHZhciBsPTA7IGw8bG9vcC5sZW5ndGg7IGwrKykge1xuXHRcdFx0XHRcdFx0dmFyIGNvb3JkaW5hdGUgPSBsb29wW2xdO1xuXHRcdFx0XHRcdFx0dmFyIHBvaW50ID0ge3g6IGNvb3JkaW5hdGVbMF0sIHk6IGNvb3JkaW5hdGVbMV19O1xuXHRcdFx0XHRcdFx0cG9pbnRzLnB1c2gocG9pbnQueCk7XG5cdFx0XHRcdFx0XHRwb2ludHMucHVzaChwb2ludC55KTtcblxuXHRcdFx0XHRcdFx0dmFyIHZlcnRleCA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50LngsIHBvaW50LnksIDEwMDEpO1xuXHRcdFx0XHRcdFx0Z2VvbWV0cnkudmVydGljZXMucHVzaCh2ZXJ0ZXgpO1xuXG5cdFx0XHRcdFx0XHR2YXIgdmVydGV4MSA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50LngsIHBvaW50LnksIDEpO1xuXHRcdFx0XHRcdFx0b3V0bGluZS52ZXJ0aWNlcy5wdXNoKHZlcnRleDEpO1xuXG5cdFx0XHRcdFx0XHR2YXIgY29vcmQwLCBwb2ludDAsIHZlcnRleDA7XG5cdFx0XHRcdFx0XHRpZihsID09IGxvb3AubGVuZ3RoLTEpIHtcblx0XHRcdFx0XHRcdFx0Y29vcmQwID0gbG9vcFswXTtcblx0XHRcdFx0XHRcdFx0cG9pbnQwID0ge3g6IGNvb3JkMFswXSwgeTogY29vcmQwWzFdfTtcblx0XHRcdFx0XHRcdFx0dmVydGV4MCA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50MC54LCBwb2ludDAueSwgMSk7XG5cdFx0XHRcdFx0XHRcdG91dGxpbmUudmVydGljZXMucHVzaCh2ZXJ0ZXgwKTtcblx0XHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0XHRjb29yZDAgPSBsb29wW2wrMV07XG5cdFx0XHRcdFx0XHRcdHBvaW50MCA9IHt4OiBjb29yZDBbMF0sIHk6IGNvb3JkMFsxXX07XG5cdFx0XHRcdFx0XHRcdHZlcnRleDAgPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludDAueCwgcG9pbnQwLnksIDEpO1xuXHRcdFx0XHRcdFx0XHRvdXRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYocD4wKSBob2xlSW5kaWNlcy5wdXNoKGhvbGVJbmRleCk7XG5cdFx0XHRcdFx0aG9sZUluZGV4ICs9IGxvb3AubGVuZ3RoO1xuXG5cdFx0XHRcdFx0dmFyIHRyaXMgPSBlYXJjdXQocG9pbnRzLCBudWxsLCAyKTtcblx0XHRcdFx0XHRmb3IodmFyIGs9MDsgazx0cmlzLmxlbmd0aDsgays9Mykge1xuXHRcdFx0XHRcdFx0Ly8gMi0xLTAgbWVhbnMgZmFjZSB1cFxuXHRcdFx0XHRcdFx0dmFyIGZhY2UgPSBuZXcgVEhSRUUuRmFjZTMoXG5cdFx0XHRcdFx0XHRcdHRyaXNbaysyXSArIHZlcnRleE9mZnNldCwgXG5cdFx0XHRcdFx0XHRcdHRyaXNbaysxXSArIHZlcnRleE9mZnNldCwgXG5cdFx0XHRcdFx0XHRcdHRyaXNbayswXSArIHZlcnRleE9mZnNldFxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGdlb21ldHJ5LmZhY2VzLnB1c2goZmFjZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZlcnRleE9mZnNldCA9IGdlb21ldHJ5LnZlcnRpY2VzLmxlbmd0aDtcblx0XHRcdFx0XHRudW1Qb2x5Z29ucysrO1xuXHRcdFx0XHR9XHRcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgY292ZXJhZ2VQb2x5Z29uID0gbmV3IFRIUkVFLk1lc2goZ2VvbWV0cnksIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRjb2xvcjogZmlsbENvbG9yLFxuXHRcdFx0b3BhY2l0eTogMC4yNSwgXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pKTtcblxuXHRcdHZhciBvdXRsaW5lUG9seWdvbiA9IG5ldyBUSFJFRS5MaW5lU2VnbWVudHMob3V0bGluZSwgbmV3IFRIUkVFLkxpbmVCYXNpY01hdGVyaWFsKHtcblx0XHRcdGNvbG9yOiBzdHJva2VDb2xvcixcblx0XHRcdGxpbmV3aWR0aDogMixcblx0XHRcdG9wYWNpdHk6IDAuMjUsIFxuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXG5cdFx0XHRkZXB0aFdyaXRlOiBmYWxzZSxcblx0XHRcdGRlcHRoVGVzdDogZmFsc2Vcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4ge3NoYXBlOiBjb3ZlcmFnZVBvbHlnb24sIG91dGxpbmU6IG91dGxpbmVQb2x5Z29ufTtcblx0fTtcblxuXHR3aW5kb3cuUG9seWdvblJlbmRlcmVyID0gUG9seWdvblJlbmRlcmVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIHZzaGFkZXIgPSAoZnVuY3Rpb24gKCkgey8qXG5cdFx0YXR0cmlidXRlIHZlYzQgdGlsZTtcblx0XHR2YXJ5aW5nIHZlYzIgdlV2O1xuXHRcdHZhcnlpbmcgdmVjNCB2VGlsZTtcblx0XHR2b2lkIG1haW4oKSB7XG5cdFx0XHR2ZWM0IG12UG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KHBvc2l0aW9uLCAxLjApO1xuXHRcdFx0Z2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcblx0XHRcdHZVdiA9IHV2O1xuXHRcdFx0dlRpbGUgPSB0aWxlO1xuXHRcdH1cblx0Ki99KS50b1N0cmluZygpLm1hdGNoKC9bXl0qXFwvXFwqKFteXSopXFwqXFwvXFx9JC8pWzFdO1xuXG5cdHZhciBmc2hhZGVyID0gKGZ1bmN0aW9uICgpIHsvKlxuXHRcdHVuaWZvcm0gc2FtcGxlcjJEIHRleDE7XG5cdFx0dW5pZm9ybSBmbG9hdCBhbHBoYTtcblx0XHR2YXJ5aW5nIHZlYzIgdlV2O1xuXHRcdHZhcnlpbmcgdmVjNCB2VGlsZTtcblx0XHR2b2lkIG1haW4oKSB7XG5cdFx0XHR2ZWMyIHV2ID0gdlRpbGUueHkgKyB2VGlsZS56dyAqIHZVdjtcblx0XHRcdGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh0ZXgxLCB1dikgKiB2ZWM0KDEsIDEsIDEsIGFscGhhKTtcblx0XHR9XG5cdCovfSkudG9TdHJpbmcoKS5tYXRjaCgvW15dKlxcL1xcKihbXl0qKVxcKlxcL1xcfSQvKVsxXTtcblxuXHR2YXIgTUFYX0NPVU5UID0gTWF0aC5wb3coMiwzMikgLSAxO1xuXHR2YXIgU1RBUlRfVkFMVUUgPSAtOTk5OTkuMDtcblxuXHR2YXIgUE9TSVRJT05fSU5URVJWQUwgPSAzKjQ7IC8vIDMgZGltZW5zaW9ucyBwZXIgdmVydGV4LCA0IHZlcnRleCBwZXIgc3ByaXRlXG5cdHZhciBJTkRFWF9JTlRFUlZBTCA9IDMqMjsgLy8gMyBpbmRleCBwZXIgdHJpLCAyIHRyaSBwZXIgc3ByaXRlXG5cdHZhciBVVl9JTlRFUlZBTCA9IDIqNDsgLy8gMiB1diBwZXIgdmVydGV4LCA0IHZlcnRleCBwZXIgc3ByaXRlXG5cdHZhciBUSUxFX0lOVEVSVkFMID0gNCo0OyAvLyBvZmZzZXQoeCx5KSArIHNpemUod2lkdGgsIGhlaWd0KSBwZXIgdmVydGV4LCA0IHZlcnRleCBwZXIgc3ByaXRlXG5cblx0dmFyIFNwcml0ZVJlbmRlcmVyID0gZnVuY3Rpb24oKXtcblx0XHR0aGlzLm1pbkluZGV4ID0gTUFYX0NPVU5UO1xuXHRcdHRoaXMubWF4SW5kZXggPSAwO1xuXHRcdHRoaXMuaW5kZXggPSAwO1xuXHRcdHRoaXMuc3ByaXRlcyA9IFtdO1xuXHRcdHRoaXMub3BhY2l0eSA9IDAuODtcblx0fTtcblxuXHRTcHJpdGVSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucG9zaXRpb25zID0gbmV3IEZsb2F0MzJBcnJheSgxMDI0KlBPU0lUSU9OX0lOVEVSVkFMKTsgXG5cdFx0dGhpcy5wb3NpdGlvbnMuZmlsbChTVEFSVF9WQUxVRSk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMucG9zaXRpb25zLCAzKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy5pbmRpY2VzID0gbmV3IFVpbnQxNkFycmF5KDEwMjQqSU5ERVhfSU5URVJWQUwpOyBcblx0XHR0aGlzLmluZGljZXNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMuaW5kaWNlcywgMSk7XG5cdFx0dGhpcy5pbmRpY2VzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLnV2ID0gbmV3IEZsb2F0MzJBcnJheSgxMDI0KlVWX0lOVEVSVkFMKTsgXG5cdFx0dGhpcy51dkF0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy51diwgMik7IFxuXHRcdHRoaXMudXZBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMudGlsZXMgPSBuZXcgRmxvYXQzMkFycmF5KDEwMjQqVElMRV9JTlRFUlZBTCk7IFxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMudGlsZXMsIDQpOyBcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLmdlb21ldHJ5ID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XG5cdFx0dGhpcy5nZW9tZXRyeS5zZXRJbmRleCh0aGlzLmluZGljZXNBdHRyaWJ1dGUpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIHRoaXMucG9zaXRpb25zQXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgndXYnLCB0aGlzLnV2QXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgndGlsZScsIHRoaXMudGlsZXNBdHRyaWJ1dGUpO1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBEeW5hbWljU3ByaXRlU2hlZXQoNDA5NiwgNDA5Nik7XG5cdFx0dGhpcy5tYXRlcmlhbCA9IG5ldyBUSFJFRS5TaGFkZXJNYXRlcmlhbCgge1xuXHRcdFx0dW5pZm9ybXM6IHtcblx0XHRcdFx0dGV4MTogeyB0eXBlOiBcInRcIiwgdmFsdWU6IHRoaXMuc3ByaXRlU2hlZXQudGV4dHVyZSB9LFxuXHRcdFx0XHRhbHBoYTogeyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMub3BhY2l0eSB9XG5cdFx0XHR9LFxuXHRcdFx0dmVydGV4U2hhZGVyOiB2c2hhZGVyLFxuXHRcdFx0ZnJhZ21lbnRTaGFkZXI6IGZzaGFkZXJcblx0XHR9KTtcblxuXHRcdHRoaXMuc2NlbmVPYmplY3QgPSBuZXcgVEhSRUUuTWVzaCh0aGlzLmdlb21ldHJ5LCB0aGlzLm1hdGVyaWFsKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFNwcml0ZVJlbmRlcmVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIHBvc2l0aW9uSW5kZXggPSB0aGlzLmluZGV4KlBPU0lUSU9OX0lOVEVSVkFMO1xuXHRcdHdoaWxlKHBvc2l0aW9uSW5kZXggPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGggJiYgdGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleF0gIT09IFNUQVJUX1ZBTFVFKVxuXHRcdFx0cG9zaXRpb25JbmRleCA9ICsrdGhpcy5pbmRleCpQT1NJVElPTl9JTlRFUlZBTDtcblxuXHRcdGlmKHBvc2l0aW9uSW5kZXggPj0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoKXtcblx0XHRcdC8vIVRPRE86IEV4cGFuZCBwb2ludHMgYnVmZmVyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltTcHJpdGVSZW5kZXJlcl0gUnVuIG91dCBvZiBwb2ludHMhISFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGltYWdlID0gb3B0aW9ucy5pbWFnZTtcblx0XHR2YXIgaW1hZ2VOYW1lID0gb3B0aW9ucy5pbWFnZU5hbWU7XG5cdFx0dmFyIHNwcml0ZSA9IHRoaXMuc3ByaXRlU2hlZXQuZ2V0KGltYWdlTmFtZSk7XG5cdFx0aWYoIXNwcml0ZSkge1xuXHRcdFx0c3ByaXRlID0gdGhpcy5zcHJpdGVTaGVldC5hZGQoaW1hZ2VOYW1lLCBpbWFnZSk7XG5cdFx0XHRpZighc3ByaXRlKSB7XG5cdFx0XHRcdC8vIVRPRE86IENyZWF0ZSBhIG5ldyBzcHJpdGUgc2hlZXQgaWYgdGhpcyBvbmUgZ2V0cyBmdWxsXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Nwcml0ZVJlbmRlcmVyXSBTcHJpdGVTaGVldCBhbHJlYWR5IGZ1bGwuXCIpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdG9wdGlvbnMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uIHx8IHt4OjAsIHk6MCwgejowfTtcblx0XHRvcHRpb25zLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAyNTY7XG5cdFx0b3B0aW9ucy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAyNTY7XG5cdFx0b3B0aW9ucy5pbWFnZU5hbWUgPSBvcHRpb25zLmljb24gfHwgXCJyZWQtZG90XCI7XG5cblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgMF0gPSBvcHRpb25zLnBvc2l0aW9uLng7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDFdID0gb3B0aW9ucy5wb3NpdGlvbi55O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyAyXSA9IG9wdGlvbnMucG9zaXRpb24uejtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgM10gPSBvcHRpb25zLnBvc2l0aW9uLnggKyBvcHRpb25zLndpZHRoO1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA0XSA9IG9wdGlvbnMucG9zaXRpb24ueTtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgNV0gPSBvcHRpb25zLnBvc2l0aW9uLno7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDZdID0gb3B0aW9ucy5wb3NpdGlvbi54O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA3XSA9IG9wdGlvbnMucG9zaXRpb24ueSArIG9wdGlvbnMuaGVpZ2h0O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA4XSA9IG9wdGlvbnMucG9zaXRpb24uejtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgOV0gPSBvcHRpb25zLnBvc2l0aW9uLnggKyBvcHRpb25zLndpZHRoO1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKzEwXSA9IG9wdGlvbnMucG9zaXRpb24ueSArIG9wdGlvbnMuaGVpZ2h0O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKzExXSA9IG9wdGlvbnMucG9zaXRpb24uejtcblxuXHRcdHZhciBhcnJheUluZGV4ID0gdGhpcy5pbmRleCpJTkRFWF9JTlRFUlZBTDtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDBdID0gdGhpcy5pbmRleCo0ICsgMDtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDFdID0gdGhpcy5pbmRleCo0ICsgMjtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDJdID0gdGhpcy5pbmRleCo0ICsgMTtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDNdID0gdGhpcy5pbmRleCo0ICsgMTtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDRdID0gdGhpcy5pbmRleCo0ICsgMjtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDVdID0gdGhpcy5pbmRleCo0ICsgMztcblxuXHRcdHZhciB1dkluZGV4ID0gdGhpcy5pbmRleCpVVl9JTlRFUlZBTDtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyAwXSA9IDA7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgMV0gPSAwO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDJdID0gMTtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyAzXSA9IDA7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgNF0gPSAwO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDVdID0gMTtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyA2XSA9IDE7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgN10gPSAxO1xuXG5cdFx0dmFyIHQgPSB0aGlzLmluZGV4KlRJTEVfSU5URVJWQUw7XG5cdFx0dGhpcy50aWxlc1t0KzBdID0gdGhpcy50aWxlc1t0KzRdID0gdGhpcy50aWxlc1t0KzhdID0gdGhpcy50aWxlc1t0KzEyXSA9IHNwcml0ZS5ub3JtYWxSZWN0Lng7XG5cdFx0dGhpcy50aWxlc1t0KzFdID0gdGhpcy50aWxlc1t0KzVdID0gdGhpcy50aWxlc1t0KzldID0gdGhpcy50aWxlc1t0KzEzXSA9IHNwcml0ZS5ub3JtYWxSZWN0Lnk7XG5cdFx0dGhpcy50aWxlc1t0KzJdID0gdGhpcy50aWxlc1t0KzZdID0gdGhpcy50aWxlc1t0KzEwXSA9IHRoaXMudGlsZXNbdCsxNF0gPSBzcHJpdGUubm9ybWFsUmVjdC53aWR0aDtcblx0XHR0aGlzLnRpbGVzW3QrM10gPSB0aGlzLnRpbGVzW3QrN10gPSB0aGlzLnRpbGVzW3QrMTFdID0gdGhpcy50aWxlc1t0KzE1XSA9IHNwcml0ZS5ub3JtYWxSZWN0LmhlaWdodDtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNYXRoLm1pbih0aGlzLm1pbkluZGV4LCB0aGlzLmluZGV4KTtcblx0XHR0aGlzLm1heEluZGV4ID0gTWF0aC5tYXgodGhpcy5tYXhJbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0cmV0dXJuIHtpbmRleDogdGhpcy5pbmRleCsrLCBuYW1lOiBpbWFnZU5hbWV9O1xuXHR9O1xuXG5cdFNwcml0ZVJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihzcHJpdGUpIHtcblx0XHR2YXIgcG9zaXRpb25JbmRleCA9IHNwcml0ZS5pbmRleCpQT1NJVElPTl9JTlRFUlZBTDtcblx0XHRmb3IodmFyIGk9MDsgaTxQT1NJVElPTl9JTlRFUlZBTDsgaSsrKSB7XG5cdFx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgaV0gPSBTVEFSVF9WQUxVRTtcblx0XHR9XG5cdFx0dGhpcy5zcHJpdGVTaGVldC5yZW1vdmUoc3ByaXRlLm5hbWUpO1xuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1hdGgubWluKHRoaXMubWluSW5kZXgsIHNwcml0ZS5pbmRleCk7XG5cdFx0dGhpcy5tYXhJbmRleCA9IE1hdGgubWF4KHRoaXMubWF4SW5kZXgsIHNwcml0ZS5pbmRleCk7XG5cblx0XHRpZih0aGlzLmluZGV4ID4gc3ByaXRlLmluZGV4KSB0aGlzLmluZGV4ID0gc3ByaXRlLmluZGV4O1xuXHR9O1xuXG5cdFNwcml0ZVJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oKSB7XG5cdFx0Ly8gb25seSB1cGRhdGUgcG9zaXRpb25zIHRoYXQgY2hhbmdlZCBieSBwYXNzaW5nIGEgcmFuZ2Vcblx0XHR0aGlzLm1pbkluZGV4ID0gKHRoaXMubWluSW5kZXggPT0gTUFYX0NPVU5UKSA/IDAgOiB0aGlzLm1pbkluZGV4O1xuXHRcdHZhciBuZWVkc1VwZGF0ZSA9IHRoaXMubWF4SW5kZXggIT0gdGhpcy5taW5JbmRleDtcblxuXHRcdHZhciBwID0gUE9TSVRJT05fSU5URVJWQUw7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCpwO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqcCtwKS0odGhpcy5taW5JbmRleCpwKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0dmFyIGkgPSBJTkRFWF9JTlRFUlZBTDtcblx0XHR0aGlzLmluZGljZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCppO1xuXHRcdHRoaXMuaW5kaWNlc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KmkraSktKHRoaXMubWluSW5kZXgqaSk7XG5cdFx0dGhpcy5pbmRpY2VzQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHR2YXIgdSA9IFVWX0lOVEVSVkFMO1xuXHRcdHRoaXMudXZBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCp1O1xuXHRcdHRoaXMudXZBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCp1K3UpLSh0aGlzLm1pbkluZGV4KnUpO1xuXHRcdHRoaXMudXZBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHZhciB0ID0gVElMRV9JTlRFUlZBTDtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqdDtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqdCt0KS0odGhpcy5taW5JbmRleCp0KTtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHRpZihuZWVkc1VwZGF0ZSkge1xuXHRcdFx0dGhpcy5nZW9tZXRyeS5jb21wdXRlQm91bmRpbmdCb3goKTtcblx0XHRcdHRoaXMuZ2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nU3BoZXJlKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1BWF9DT1VOVDtcblx0XHR0aGlzLm1heEluZGV4ID0gMDtcblx0fTtcblxuXHR3aW5kb3cuU3ByaXRlUmVuZGVyZXIgPSBTcHJpdGVSZW5kZXJlcjtcbn0oKSk7XG4iLCIoZnVuY3Rpb24oKXtcblx0dmFyIFNwcml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHR0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG5cdFx0dmFyIHggPSBkYXRhLngsXG5cdFx0XHR5ID0gZGF0YS55LFxuXHRcdFx0d2lkdGggPSBkYXRhLndpZHRoLFxuXHRcdFx0aGVpZ2h0ID0gZGF0YS5oZWlnaHQ7XG5cdFx0dGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcblx0fTtcblxuXHRTcHJpdGUucHJvdG90eXBlLmNvbXB1dGVOb3JtYWwgPSBmdW5jdGlvbihtYXhXaWR0aCwgbWF4SGVpZ2h0KSB7XG5cdFx0dGhpcy5ub3JtYWxSZWN0ID0gdGhpcy5yZWN0LmdldE5vcm1hbGl6ZWRSZWN0KG1heFdpZHRoLCBtYXhIZWlnaHQpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdHZhciBTcHJpdGVTaGVldCA9IGZ1bmN0aW9uKHRleHR1cmUsIHNwcml0ZXMpIHtcblx0XHR0aGlzLnRleHR1cmUgPSB0ZXh0dXJlO1xuXHRcdHRoaXMuc3ByaXRlcyA9IHt9O1xuXG5cdFx0Zm9yKHZhciBpPTA7IGk8c3ByaXRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5zcHJpdGVzW3Nwcml0ZXNbaV0ubmFtZV0gPSBuZXcgU3ByaXRlKHNwcml0ZXNbaV0pXG5cdFx0XHRcdC5jb21wdXRlTm9ybWFsKHRleHR1cmUuaW1hZ2Uud2lkdGgsIHRleHR1cmUuaW1hZ2UuaGVpZ2h0KTtcblx0XHR9XG5cdH07XG5cblx0U3ByaXRlU2hlZXQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHNwcml0ZU5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5zcHJpdGVzW3Nwcml0ZU5hbWVdO1xuXHR9O1xuXG5cdHdpbmRvdy5TcHJpdGVTaGVldCA9IFNwcml0ZVNoZWV0O1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIENTU19UUkFOU0ZPUk0gPSAoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHZhciBwcm9wcyA9IFtcblx0XHRcdCd0cmFuc2Zvcm0nLFxuXHRcdFx0J1dlYmtpdFRyYW5zZm9ybScsXG5cdFx0XHQnTW96VHJhbnNmb3JtJyxcblx0XHRcdCdPVHJhbnNmb3JtJyxcblx0XHRcdCdtc1RyYW5zZm9ybSdcblx0XHRdO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwcm9wID0gcHJvcHNbaV07XG5cdFx0XHRpZiAoZGl2LnN0eWxlW3Byb3BdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV0dXJuIHByb3A7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBwcm9wc1swXTtcblx0fSkoKTtcblxuXHR2YXIgV2ViR0xWaWV3ID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuT3J0aG9ncmFwaGljQ2FtZXJhKDAsIDI1NSwgMCwgMjU1LCAtMzAwMCwgMzAwMCk7XG5cdFx0dGhpcy5jYW1lcmEucG9zaXRpb24ueiA9IDEwMDA7XG5cdFx0dGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuXHRcdHRoaXMuc2NlbmVNYXNrID0gbmV3IFRIUkVFLlNjZW5lKCk7XG5cdFx0dGhpcy5yZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKHtcblx0XHRcdGFscGhhOiB0cnVlLFxuXHRcdFx0YW50aWFsaWFzaW5nOiB0cnVlLFxuXHRcdFx0Y2xlYXJDb2xvcjogMHgwMDAwMDAsXG5cdFx0XHRjbGVhckFscGhhOiAwXG5cblx0XHR9KTtcblx0XHR0aGlzLnJlbmRlcmVyLnNldFBpeGVsUmF0aW8od2luZG93LmRldmljZVBpeGVsUmF0aW8pO1xuXHRcdHRoaXMucmVuZGVyZXIuYXV0b0NsZWFyID0gZmFsc2U7XG5cdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5yZW5kZXJlci5jb250ZXh0O1xuXHRcdHRoaXMuYW5pbWF0aW9uRnJhbWUgPSBudWxsO1xuXHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzID0gW107XG5cdFx0dGhpcy5udW1NYXNrcyA9IDA7XG5cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1hcCA9IHRoaXMubWFwO1xuXHRcdFx0dmFyIGJvdW5kcyA9IG1hcC5nZXRCb3VuZHMoKTtcblx0XHRcdHZhciB0b3BMZWZ0ID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhcblx0XHRcdFx0Ym91bmRzLmdldE5vcnRoRWFzdCgpLmxhdCgpLFxuXHRcdFx0XHRib3VuZHMuZ2V0U291dGhXZXN0KCkubG5nKClcblx0XHRcdCk7XG5cblx0XHRcdC8vIFRyYW5zbGF0ZSB0aGUgd2ViZ2wgY2FudmFzIGJhc2VkIG9uIG1hcHMncyBib3VuZHNcblx0XHRcdHZhciBjYW52YXMgPSB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQ7XG5cdFx0XHR2YXIgcG9pbnQgPSB0aGlzLmdldFByb2plY3Rpb24oKS5mcm9tTGF0TG5nVG9EaXZQaXhlbCh0b3BMZWZ0KTtcblx0XHRcdGNhbnZhcy5zdHlsZVtDU1NfVFJBTlNGT1JNXSA9ICd0cmFuc2xhdGUoJyArIE1hdGgucm91bmQocG9pbnQueCkgKyAncHgsJyArIE1hdGgucm91bmQocG9pbnQueSkgKyAncHgpJztcblxuXHRcdFx0Ly8gUmVzaXplIHRoZSByZW5kZXJlciAvIGNhbnZhcyBiYXNlZCBvbiBzaXplIG9mIHRoZSBtYXBcblx0XHRcdHZhciBkaXYgPSBtYXAuZ2V0RGl2KCksIFxuXHRcdFx0XHR3aWR0aCA9IGRpdi5jbGllbnRXaWR0aCwgXG5cdFx0XHRcdGhlaWdodCA9IGRpdi5jbGllbnRIZWlnaHQ7XG5cblx0XHRcdGlmICh3aWR0aCAhPT0gdGhpcy53aWR0aCB8fCBoZWlnaHQgIT09IHRoaXMuaGVpZ2h0KXtcblx0XHRcdFx0dGhpcy53aWR0aCA9IHdpZHRoO1xuXHRcdFx0XHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblx0XHRcdFx0dGhpcy5yZW5kZXJlci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBVcGRhdGUgY2FtZXJhIGJhc2VkIG9uIG1hcCB6b29tIGFuZCBwb3NpdGlvblxuXHRcdFx0dmFyIHpvb20gPSBtYXAuZ2V0Wm9vbSgpO1xuXHRcdFx0dmFyIHNjYWxlID0gTWF0aC5wb3coMiwgem9vbSk7XG5cdFx0XHR2YXIgb2Zmc2V0ID0gbWFwLmdldFByb2plY3Rpb24oKS5mcm9tTGF0TG5nVG9Qb2ludCh0b3BMZWZ0KTtcblxuXHRcdFx0dGhpcy5jYW1lcmEucG9zaXRpb24ueCA9IG9mZnNldC54O1xuXHRcdFx0dGhpcy5jYW1lcmEucG9zaXRpb24ueSA9IG9mZnNldC55O1xuXG5cdFx0XHR0aGlzLnNjYWxlID0gem9vbTtcblx0XHRcdHRoaXMuY2FtZXJhLnNjYWxlLnggPSB0aGlzLndpZHRoIC8gMjU2IC8gc2NhbGU7XG5cdFx0XHR0aGlzLmNhbWVyYS5zY2FsZS55ID0gdGhpcy5oZWlnaHQgLyAyNTYgLyBzY2FsZTtcblx0XHR9O1xuXG5cdFx0dGhpcy5kcmF3ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdGlvbkZyYW1lKTtcblx0XHRcdHRoaXMuYW5pbWF0aW9uRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5kZWZlcnJlZFJlbmRlci5iaW5kKHRoaXMpKTtcblx0XHR9O1xuXG5cdFx0dGhpcy5kZWZlcnJlZFJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy51cGRhdGUoKTtcblxuXHRcdFx0dmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHQsIHJlbmRlcmVyID0gdGhpcy5yZW5kZXJlcjtcblx0XHRcdHZhciBtYXNrRW5hYmxlZCA9IHRoaXMubnVtTWFza3MgPiAwO1xuXG5cdFx0XHRpZihtYXNrRW5hYmxlZCkge1xuXHRcdFx0XHRjb250ZXh0LmNvbG9yTWFzayggZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UgKTtcblx0XHRcdFx0Y29udGV4dC5kZXB0aE1hc2soIGZhbHNlICk7XG5cblx0XHRcdFx0Y29udGV4dC5lbmFibGUoY29udGV4dC5TVEVOQ0lMX1RFU1QpO1xuXHRcdFx0XHRjb250ZXh0LnN0ZW5jaWxPcChjb250ZXh0LlJFUExBQ0UsIGNvbnRleHQuUkVQTEFDRSwgY29udGV4dC5SRVBMQUNFKTtcblx0XHRcdFx0Y29udGV4dC5zdGVuY2lsRnVuYyhjb250ZXh0LkFMV0FZUywgMCwgMHhmZmZmZmZmZik7XG5cdFx0XHRcdGNvbnRleHQuY2xlYXJTdGVuY2lsKDEpO1xuXG5cdFx0XHRcdHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuc2NlbmVNYXNrLCB0aGlzLmNhbWVyYSwgbnVsbCwgdHJ1ZSk7XG5cblx0XHRcdFx0Y29udGV4dC5jb2xvck1hc2sodHJ1ZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSk7XG5cdFx0XHRcdGNvbnRleHQuZGVwdGhNYXNrKHRydWUgKTtcblxuXHRcdFx0XHRjb250ZXh0LnN0ZW5jaWxGdW5jKGNvbnRleHQuRVFVQUwsIDAsIDB4ZmZmZmZmZmYpOyAgLy8gZHJhdyBpZiA9PSAwXG5cdFx0XHRcdGNvbnRleHQuc3RlbmNpbE9wKGNvbnRleHQuS0VFUCwgY29udGV4dC5LRUVQLCBjb250ZXh0LktFRVApO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IodmFyIGk9MDsgaTx0aGlzLm9iamVjdFJlbmRlcmVycy5sZW5ndGg7IGkrKylcblx0XHRcdFx0dGhpcy5vYmplY3RSZW5kZXJlcnNbaV0uZHJhdygpO1xuXG5cdFx0XHR0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSwgbnVsbCwgIW1hc2tFbmFibGVkKTtcblxuXHRcdFx0aWYobWFza0VuYWJsZWQpIHtcblx0XHRcdFx0Y29udGV4dC5kaXNhYmxlKGNvbnRleHQuU1RFTkNJTF9URVNUKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAncmVuZGVyJ30pO1xuXHRcdH07XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZSA9IF8uZXh0ZW5kKG5ldyBnb29nbGUubWFwcy5PdmVybGF5VmlldygpLCBuZXcgVEhSRUUuRXZlbnREaXNwYXRjaGVyKCkpO1xuXHRXZWJHTFZpZXcucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gV2ViR0xWaWV3O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUub25BZGQgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmdldFBhbmVzKCkub3ZlcmxheUxheWVyLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2FkZGVkX3RvX2RvbSd9KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLm9uUmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGNhbnZhcyA9IHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudDtcblx0XHR0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuY2FudmFzKTtcblx0XHR0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAncmVtb3ZlZF9mcm9tX2RvbSd9KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcblx0XHQvLyFUT0RPOiBSZW1vdmUgZGVwZW5kZW5jeSBvZiBQb2ludFJlbmRlcmVyIGZyb20gV2ViR0xWaWV3XG5cdFx0dGhpcy5wb2ludFJlbmRlcmVyID0gbmV3IFBvaW50UmVuZGVyZXIodGhpcykuaW5pdCgpO1xuXHRcdHRoaXMuc2NlbmUuYWRkKHRoaXMucG9pbnRSZW5kZXJlci5zY2VuZU9iamVjdCk7XG5cdFx0dGhpcy5zcHJpdGVSZW5kZXJlciA9IG5ldyBTcHJpdGVSZW5kZXJlcigpLmluaXQoKTtcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLnNwcml0ZVJlbmRlcmVyLnNjZW5lT2JqZWN0KTtcblx0XHR0aGlzLnBvbHlnb25SZW5kZXJlciA9IG5ldyBQb2x5Z29uUmVuZGVyZXIoKS5pbml0KCk7XG5cdFx0dGhpcy5saW5lUmVuZGVyZXIgPSBuZXcgTGluZVJlbmRlcmVyKCkuaW5pdCgpO1xuXHRcdC8vIGFkZCB0aGVtIHRvIGFuIGFycmF5IHNvIHdlIGNhbiBkcmF3L3VwZGF0ZSB0aGVtIGFsbCBsYXRlclxuXHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzLnB1c2godGhpcy5wb2ludFJlbmRlcmVyKTtcblx0XHR0aGlzLm9iamVjdFJlbmRlcmVycy5wdXNoKHRoaXMucG9seWdvblJlbmRlcmVyKTtcblx0XHR0aGlzLm9iamVjdFJlbmRlcmVycy5wdXNoKHRoaXMuc3ByaXRlUmVuZGVyZXIpO1xuXHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzLnB1c2godGhpcy5saW5lUmVuZGVyZXIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNoYW5nZUhhbmRsZXIgPSBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgJ2JvdW5kc19jaGFuZ2VkJywgdGhpcy5kcmF3LmJpbmQodGhpcykpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHRnb29nbGUubWFwcy5ldmVudC5yZW1vdmVMaXN0ZW5lcih0aGlzLmNoYW5nZUhhbmRsZXIpO1xuXHRcdHRoaXMuY2hhbmdlSGFuZGxlciA9IG51bGw7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRPYmplY3QgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdHRoaXMuc2NlbmUuYWRkKGdlb21ldHJ5KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLnJlbW92ZU9iamVjdCA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZS5yZW1vdmUoZ2VvbWV0cnkpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkUG9pbnQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMucG9pbnRSZW5kZXJlci5hZGQob3B0aW9ucyk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVQb2ludCA9IGZ1bmN0aW9uKHBvaW50KSB7XG5cdFx0dGhpcy5wb2ludFJlbmRlcmVyLnJlbW92ZShwb2ludCk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRTcHJpdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaXRlUmVuZGVyZXIuYWRkKG9wdGlvbnMpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlU3ByaXRlID0gZnVuY3Rpb24oc3ByaXRlKSB7XG5cdFx0dGhpcy5zcHJpdGVSZW5kZXJlci5yZW1vdmUoc3ByaXRlKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmNyZWF0ZUdlb21ldHJ5ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHZhciBnZW9tZXRyeSA9IHRoaXMucG9seWdvblJlbmRlcmVyLmNyZWF0ZShvcHRpb25zKTtcblx0XHRpZihnZW9tZXRyeSAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy5hZGRHZW9tZXRyeShnZW9tZXRyeSk7XG5cdFx0fVxuXHRcdHJldHVybiBnZW9tZXRyeTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmFkZEdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lLmFkZChnZW9tZXRyeS5zaGFwZSk7XG5cdFx0dGhpcy5zY2VuZS5hZGQoZ2VvbWV0cnkub3V0bGluZSk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZS5yZW1vdmUoZ2VvbWV0cnkuc2hhcGUpO1xuXHRcdHRoaXMuc2NlbmUucmVtb3ZlKGdlb21ldHJ5Lm91dGxpbmUpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuZGVzdHJveUdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHRkZWxldGUgZ2VvbWV0cnkuc2hhcGU7XG5cdFx0ZGVsZXRlIGdlb21ldHJ5Lm91dGxpbmU7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5jcmVhdGVMaW5lID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHZhciBnZW9tZXRyeSA9IHRoaXMubGluZVJlbmRlcmVyLmNyZWF0ZShvcHRpb25zKTtcblx0XHRpZihnZW9tZXRyeSAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy5hZGRMaW5lKGdlb21ldHJ5KTtcblx0XHR9XG5cdFx0cmV0dXJuIGdlb21ldHJ5O1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkTGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcblx0XHR0aGlzLnNjZW5lLmFkZChsaW5lKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucmVtb3ZlTGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcblx0XHR0aGlzLnNjZW5lLnJlbW92ZShsaW5lKTtcblx0fTtcblxuXHRXZWJHTFZpZXcuZGVzdHJveUxpbmUgPSBmdW5jdGlvbihsaW5lKSB7XG5cdFx0ZGVsZXRlIGxpbmU7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5jcmVhdGVNYXNrID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHZhciBtYXNrID0gdGhpcy5wb2x5Z29uUmVuZGVyZXIuY3JlYXRlKG9wdGlvbnMpO1xuXHRcdGlmKG1hc2sgIT09IG51bGwpIHtcblx0XHRcdHRoaXMuYWRkTWFzayhtYXNrKTtcblx0XHRcdHRoaXMubnVtTWFza3MrKztcblx0XHR9XG5cdFx0cmV0dXJuIG1hc2s7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRNYXNrID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lTWFzay5hZGQoZ2VvbWV0cnkuc2hhcGUpO1xuXHRcdHRoaXMuc2NlbmVNYXNrLmFkZChnZW9tZXRyeS5vdXRsaW5lKTtcblx0XHR0aGlzLm51bU1hc2tzKys7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVNYXNrID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lTWFzay5yZW1vdmUoZ2VvbWV0cnkuc2hhcGUpO1xuXHRcdHRoaXMuc2NlbmVNYXNrLnJlbW92ZShnZW9tZXRyeS5vdXRsaW5lKTtcblx0XHR0aGlzLm51bU1hc2tzLS07XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5kZXN0cm95TWFzayA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0ZGVsZXRlIGdlb21ldHJ5LnNoYXBlO1xuXHRcdGRlbGV0ZSBnZW9tZXRyeS5vdXRsaW5lO1xuXHR9O1xuXG5cdHdpbmRvdy5XZWJHTFZpZXcgPSBXZWJHTFZpZXc7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgaHR0cCA9IHt9O1xuXG5cdGh0dHAuZ2V0ID0gZnVuY3Rpb24odXJsLCBvcHRpb25zKSB7XG5cdFx0dmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xuXHRcdHZhciByZXNwb25zZVR5cGUgPSBvcHRpb25zLnJlc3BvbnNlVHlwZTtcblx0XHRpZihyZXNwb25zZVR5cGUgPT09ICdibG9iJykge1xuXHRcdFx0dmFyIGltYWdlID0gJChcIjxpbWcgLz5cIikuYXR0cignc3JjJywgdXJsKS5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2RhdGE6aW1hZ2VbMF19KTtcblx0XHRcdH0pO1xuXHRcdH1lbHNle1xuXHRcdFx0JC5hamF4KHVybCwgb3B0aW9ucylcblx0XHRcdFx0LnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSwgc3RhdHVzLCB4aHIpe1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2RhdGE6ZGF0YSwgc3RhdHVzOnN0YXR1cywgeGhyOnhocn0pO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuZXJyb3IoZnVuY3Rpb24oeGhyLCBzdGF0dXMsIGVycm9yKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3Qoe3hocjp4aHIsIHN0YXR1czpzdGF0dXMsIGVycm9yOmVycm9yfSk7XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0fTtcblxuXHR3aW5kb3cuaHR0cCA9IGh0dHA7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgQ0xVU1RFUl9QSVhFTF9TSVpFID0gNjQ7XG5cblx0dmFyIENsdXN0ZXJDb250cm9sbGVyID0gZnVuY3Rpb24od2ViR2xWaWV3KSB7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy52aWV3cyA9IFtdO1xuXHR9O1xuXG5cdENsdXN0ZXJDb250cm9sbGVyLnByb3RvdHlwZS5zZXRNYXAgPSBmdW5jdGlvbihtYXApIHtcblx0XHRpZihtYXApIHtcblx0XHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0XHRcdHRoaXMuX2FkZEV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0Q2x1c3RlckNvbnRyb2xsZXIucHJvdG90eXBlLmFkZFZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG5cdFx0dmFyIGluZGV4ID0gdGhpcy52aWV3cy5pbmRleE9mKHZpZXcpO1xuXHRcdGlmKGluZGV4IDwgMCkgdGhpcy52aWV3cy5wdXNoKHZpZXcpO1xuXHRcdHZhciBiID0gdGhpcy5ib3VuZHM7XG5cdFx0dmlldy5zZXRDbHVzdGVyUGl4ZWxTaXplKENMVVNURVJfUElYRUxfU0laRSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0Q2x1c3RlckNvbnRyb2xsZXIucHJvdG90eXBlLnJlbW92ZVZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG5cdFx0dmFyIGluZGV4ID0gdGhpcy52aWV3cy5pbmRleE9mKHZpZXcpO1xuXHRcdGlmKGluZGV4ID49IDApIHRoaXMudmlld3Muc3BsaWNlKGluZGV4LCAxKTtcblx0XHR2aWV3LmNsZWFyKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0Q2x1c3RlckNvbnRyb2xsZXIucHJvdG90eXBlLl9hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY2hhbmdlTGlzdGVuZXIgPSBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgXCJib3VuZHNfY2hhbmdlZFwiLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcblx0fTtcblxuXHRDbHVzdGVyQ29udHJvbGxlci5wcm90b3R5cGUuX3JlbW92ZUV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0Z29vZ2xlLm1hcHMuZXZlbnQucmVtb3ZlTGlzdGVuZXIodGhpcy5jaGFuZ2VMaXN0ZW5lcik7XG5cdH07XG5cblx0Q2x1c3RlckNvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXG5cdH07XG5cblx0d2luZG93LkNsdXN0ZXJDb250cm9sbGVyID0gQ2x1c3RlckNvbnRyb2xsZXI7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXG5cdHZhciBNRVJDQVRPUl9SQU5HRSA9IDI1NjtcblxuXHRmdW5jdGlvbiBjb252ZXJ0UG9pbnRUb1RpbGUobGF0TG5nLCB6b29tLCBwcm9qZWN0aW9uKSB7XG5cdFx0dmFyIHdvcmxkQ29vcmRpbmF0ZSA9IHByb2plY3Rpb24uZnJvbUxhdExuZ1RvUG9pbnQobGF0TG5nKTtcblx0XHR2YXIgcGl4ZWxDb29yZGluYXRlID0ge3g6IHdvcmxkQ29vcmRpbmF0ZS54ICogTWF0aC5wb3coMiwgem9vbSksIHk6IHdvcmxkQ29vcmRpbmF0ZS55ICogTWF0aC5wb3coMiwgem9vbSl9O1xuXHRcdHZhciB0aWxlQ29vcmRpbmF0ZSA9IHt4OiBNYXRoLmZsb29yKHBpeGVsQ29vcmRpbmF0ZS54IC8gTUVSQ0FUT1JfUkFOR0UpLCB5OiBNYXRoLmZsb29yKHBpeGVsQ29vcmRpbmF0ZS55IC8gTUVSQ0FUT1JfUkFOR0UpfTtcblx0XHRyZXR1cm4gdGlsZUNvb3JkaW5hdGU7XG5cdH1cblxuXHR2YXIgVGlsZUNvbnRyb2xsZXIgPSBmdW5jdGlvbih3ZWJHbFZpZXcpIHtcblx0XHR0aGlzLndlYkdsVmlldyA9IHdlYkdsVmlldztcblx0XHR0aGlzLmJvdW5kcyA9IG5ldyBSZWN0YW5nbGUoMCwgMCwgMCwgMCk7XG5cdFx0dGhpcy56b29tID0gMDtcblx0XHR0aGlzLm1pblpvb20gPSAwO1xuXHRcdHRoaXMubWF4Wm9vbSA9IDEwO1xuXHRcdHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuXHRcdHRoaXMudmlld3MgPSBbXTtcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuc2V0TWFwID0gZnVuY3Rpb24obWFwKSB7XG5cdFx0aWYobWFwKSB7XG5cdFx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0XHR0aGlzLl9hZGRFdmVudExpc3RlbmVycygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9yZW1vdmVFdmVudExpc3RlbmVycygpO1xuXHRcdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5hZGRWaWV3ID0gZnVuY3Rpb24odmlldykge1xuXHRcdHZhciBpbmRleCA9IHRoaXMudmlld3MuaW5kZXhPZih2aWV3KTtcblx0XHRpZihpbmRleCA8IDApIHRoaXMudmlld3MucHVzaCh2aWV3KTtcblx0XHR2YXIgYiA9IHRoaXMuYm91bmRzO1xuXHRcdHZpZXcuc2V0VGlsZVNpemUoTUVSQ0FUT1JfUkFOR0UpO1xuXHRcdHZpZXcuc2hvd1RpbGVzKGIudWx4LCBiLnVseSwgYi5scngsIGIubHJ5LCB0aGlzLnpvb20pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVWaWV3ID0gZnVuY3Rpb24odmlldykge1xuXHRcdHZhciBpbmRleCA9IHRoaXMudmlld3MuaW5kZXhPZih2aWV3KTtcblx0XHRpZihpbmRleCA+PSAwKSB0aGlzLnZpZXdzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0dmlldy5jbGVhcigpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5fYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNoYW5nZUxpc3RlbmVyID0gZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsIFwiYm91bmRzX2NoYW5nZWRcIiwgdGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLl9yZW1vdmVFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdGdvb2dsZS5tYXBzLmV2ZW50LnJlbW92ZUxpc3RlbmVyKHRoaXMuY2hhbmdlTGlzdGVuZXIpO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5oYXNDaGFuZ2VkWm9vbSA9IGZ1bmN0aW9uKHpvb20pIHtcblx0XHRyZXR1cm4gdGhpcy56b29tICE9IHpvb207XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLmhhc0NoYW5nZWRCb3VuZHMgPSBmdW5jdGlvbih2aXNpYmxlQm91bmRzKSB7XG5cdFx0dmFyIGN1cnJlbnRCb3VuZHMgPSB0aGlzLmJvdW5kcztcblx0XHRyZXR1cm4gY3VycmVudEJvdW5kcy51bHggIT0gdmlzaWJsZUJvdW5kcy51bHggfHwgXG5cdFx0XHRjdXJyZW50Qm91bmRzLnVseSAhPSB2aXNpYmxlQm91bmRzLnVseSB8fCBcblx0XHRcdGN1cnJlbnRCb3VuZHMubHJ4ICE9IHZpc2libGVCb3VuZHMubHJ4IHx8IFxuXHRcdFx0Y3VycmVudEJvdW5kcy5scnkgIT0gdmlzaWJsZUJvdW5kcy5scnk7XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtYXAgPSB0aGlzLm1hcCxcblx0XHRcdGJvdW5kcyA9IG1hcC5nZXRCb3VuZHMoKSxcblx0XHRcdGJvdW5kc05lTGF0TG5nID0gYm91bmRzLmdldE5vcnRoRWFzdCgpLFxuXHRcdFx0Ym91bmRzU3dMYXRMbmcgPSBib3VuZHMuZ2V0U291dGhXZXN0KCksXG5cdFx0XHRib3VuZHNOd0xhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoYm91bmRzTmVMYXRMbmcubGF0KCksIGJvdW5kc1N3TGF0TG5nLmxuZygpKSxcblx0XHRcdGJvdW5kc1NlTGF0TG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhib3VuZHNTd0xhdExuZy5sYXQoKSwgYm91bmRzTmVMYXRMbmcubG5nKCkpLFxuXHRcdFx0em9vbSA9IG1hcC5nZXRab29tKCksXG5cdFx0XHRwcm9qZWN0aW9uID0gbWFwLmdldFByb2plY3Rpb24oKSxcblx0XHRcdHRpbGVDb29yZGluYXRlTncgPSBjb252ZXJ0UG9pbnRUb1RpbGUoYm91bmRzTndMYXRMbmcsIHpvb20sIHByb2plY3Rpb24pLFxuXHRcdFx0dGlsZUNvb3JkaW5hdGVTZSA9IGNvbnZlcnRQb2ludFRvVGlsZShib3VuZHNTZUxhdExuZywgem9vbSwgcHJvamVjdGlvbiksXG5cdFx0XHR2aXNpYmxlQm91bmRzID0gbmV3IFJlY3RhbmdsZSh0aWxlQ29vcmRpbmF0ZU53LngsIHRpbGVDb29yZGluYXRlTncueSwgXG5cdFx0XHRcdHRpbGVDb29yZGluYXRlU2UueC10aWxlQ29vcmRpbmF0ZU53LngsIHRpbGVDb29yZGluYXRlU2UueS10aWxlQ29vcmRpbmF0ZU53LnkpO1xuXG5cdFx0em9vbSA9IE1hdGgubWF4KHRoaXMubWluWm9vbSwgem9vbSk7XG5cdFx0em9vbSA9IE1hdGgubWluKHRoaXMubWF4Wm9vbSwgem9vbSk7XG5cblx0XHR2YXIgY3VycmVudEJvdW5kcyA9IHRoaXMuYm91bmRzO1xuXHRcdHZhciB4ID0gTWF0aC5taW4oY3VycmVudEJvdW5kcy51bHgsIHZpc2libGVCb3VuZHMudWx4KSxcblx0XHRcdHkgPSBNYXRoLm1pbihjdXJyZW50Qm91bmRzLnVseSwgdmlzaWJsZUJvdW5kcy51bHkpLFxuXHRcdFx0d2lkdGggPSBNYXRoLm1heChjdXJyZW50Qm91bmRzLmxyeCwgdmlzaWJsZUJvdW5kcy5scngpIC0geCxcblx0XHRcdGhlaWdodCA9IE1hdGgubWF4KGN1cnJlbnRCb3VuZHMubHJ5LCB2aXNpYmxlQm91bmRzLmxyeSkgLSB5O1xuXHRcdHZhciByYW5nZSA9IG5ldyBSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG5cdFx0XG5cdFx0Ly8gSGlkZSBldmVyeXRoaW5nIGlmIHdlIGNoYW5nZWQgem9vbSBsZXZlbC5cblx0XHQvLyBUaGVuIHNldCB0aGUgcmFuZ2UgdG8gdXBkYXRlIG9ubHkgdGhlIHZpc2libGUgdGlsZXMuXG5cdFx0aWYodGhpcy5oYXNDaGFuZ2VkWm9vbSh6b29tKSkge1xuXHRcdFx0Ly8gTWFrZSBzdXJlIHRoYXQgYWxsIGN1cnJlbnRseSB2aXNpYmxlIHRpbGVzIHdpbGwgYmUgaGlkZGVuLlxuXHRcdFx0dGhpcy51cGRhdGVUaWxlcyhjdXJyZW50Qm91bmRzLCBjdXJyZW50Qm91bmRzLCBuZXcgUmVjdGFuZ2xlKC0xLCAtMSwgMCwgMCksIHRoaXMuem9vbSk7XG5cdFx0XHQvLyBUaGVuIG1ha2Ugc3VyZSB0aGF0IGFsbCB0aWxlcyB0aGF0IHNob3VsZCBiZSB2aXNpYmxlIHdpbGwgY2FsbCBzaG93VGlsZSBiZWxvdy5cblx0XHRcdGN1cnJlbnRCb3VuZHMgPSBuZXcgUmVjdGFuZ2xlKC0xLCAtMSwgMCwgMCk7XG5cdFx0XHQvLyBXZSBvbmx5IG5lZWQgdG8gdXBkYXRlIGFsbCB2aXNpYmxlIHRpbGVzIGJlbG93LlxuXHRcdFx0cmFuZ2UgPSB2aXNpYmxlQm91bmRzO1xuXHRcdH1cblxuXHRcdC8vIEl0ZXJhdGUgYWxsIHRoZSBsYXllcnMgdG8gdXBkYXRlIHdoaWNoIHRpbGVzIGFyZSB2aXNpYmxlLlxuXHRcdGlmKHRoaXMuaGFzQ2hhbmdlZEJvdW5kcyh2aXNpYmxlQm91bmRzKSkge1xuXHRcdFx0dGhpcy51cGRhdGVUaWxlcyhyYW5nZSwgY3VycmVudEJvdW5kcywgdmlzaWJsZUJvdW5kcywgem9vbSk7XG5cdFx0fVxuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS51cGRhdGVUaWxlcyA9IGZ1bmN0aW9uKHJhbmdlLCBjdXJyZW50Qm91bmRzLCB2aXNpYmxlQm91bmRzLCB6b29tKSB7XG5cdFx0dmFyIHZpZXdzID0gdGhpcy52aWV3cztcblx0XHRmb3IodmFyIGk9MDsgaTx2aWV3cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Zm9yKHZhciBjb2x1bW49cmFuZ2UudWx4OyBjb2x1bW48PXJhbmdlLmxyeDsgY29sdW1uKyspIHtcblx0XHRcdFx0Zm9yKHZhciByb3c9cmFuZ2UudWx5OyByb3c8PXJhbmdlLmxyeTsgcm93KyspIHtcblx0XHRcdFx0XHRpZih2aXNpYmxlQm91bmRzLmNvbnRhaW5zUG9pbnQoY29sdW1uLCByb3cpKSB7XG5cdFx0XHRcdFx0XHQvLyBPbmx5IHNob3dUaWxlIGlmIGl0J3Mgbm90IGFscmVhZHkgdmlzaWJsZVxuXHRcdFx0XHRcdFx0aWYoIWN1cnJlbnRCb3VuZHMuY29udGFpbnNQb2ludChjb2x1bW4sIHJvdykpXG5cdFx0XHRcdFx0XHRcdHZpZXdzW2ldLnNob3dUaWxlKGNvbHVtbiwgcm93LCB6b29tKTtcblx0XHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRcdC8vIEhpZGUgdGlsZSB0aGF0IGlzIGN1cnJlbnRseSB2aXNpYmxlXG5cdFx0XHRcdFx0XHRpZihjdXJyZW50Qm91bmRzLmNvbnRhaW5zUG9pbnQoY29sdW1uLCByb3cpKVxuXHRcdFx0XHRcdFx0XHR2aWV3c1tpXS5oaWRlVGlsZShjb2x1bW4sIHJvdywgem9vbSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdFx0fVxuXHRcdHRoaXMuem9vbSA9IHpvb207XG5cdFx0dGhpcy5ib3VuZHMgPSB2aXNpYmxlQm91bmRzO1xuXHR9O1xuXG5cdHdpbmRvdy5UaWxlQ29udHJvbGxlciA9IFRpbGVDb250cm9sbGVyO1xufSgpKTtcbiIsIihmdW5jdGlvbigpe1xuXHR2YXIgR2VvSlNPTkRhdGFTb3VyY2UgPSBmdW5jdGlvbih1cmwsIHByb2plY3Rpb24pe1xuXHRcdHRoaXMudXJsID0gdXJsO1xuXHRcdHRoaXMucHJvamVjdGlvbiA9IHByb2plY3Rpb247XG5cdFx0dGhpcy5maWxlRXh0ZW5zaW9uID0gXCJqc29uXCI7XG5cdFx0dGhpcy5yZXNwb25zZVR5cGUgPSBcImpzb25cIjtcblx0fTtcblxuXHRHZW9KU09ORGF0YVNvdXJjZS5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0dmFyIGZlYXR1cmVDb2xsZWN0aW9uID0ge3BvbHlnb25zOltdLCBwb2ludHM6W10sIGxpbmVzOltdfTtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIGV4dHJhY3RGZWF0dXJlcyA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHZhciBmZWF0dXJlID0gc2VsZi5fcGFyc2VGZWF0dXJlKGRhdGEpO1xuXHRcdFx0aWYoZmVhdHVyZS5wb2x5Z29ucy5sZW5ndGggPiAwKVxuXHRcdFx0XHRmZWF0dXJlQ29sbGVjdGlvbi5wb2x5Z29ucy5wdXNoKGZlYXR1cmUucG9seWdvbnMpO1xuXHRcdFx0aWYoZmVhdHVyZS5wb2ludHMubGVuZ3RoID4gMClcblx0XHRcdFx0ZmVhdHVyZUNvbGxlY3Rpb24ucG9pbnRzID0gZmVhdHVyZUNvbGxlY3Rpb24ucG9pbnRzLmNvbmNhdChmZWF0dXJlLnBvaW50cyk7XG5cdFx0XHRpZihmZWF0dXJlLmxpbmVzLmxlbmd0aCA+IDApXG5cdFx0XHRcdGZlYXR1cmVDb2xsZWN0aW9uLmxpbmVzLnB1c2goZmVhdHVyZS5saW5lcyk7XG5cdFx0fVxuXHRcdGlmKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVDb2xsZWN0aW9uXCIpIHtcblx0XHRcdFx0dmFyIGZlYXR1cmVzID0gZGF0YS5mZWF0dXJlcztcblx0XHRcdFx0Zm9yKHZhciBpPTA7IGk8ZmVhdHVyZXMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdFx0ZXh0cmFjdEZlYXR1cmVzKGZlYXR1cmVzW2ldKTtcblx0XHRcdH1lbHNlIGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVcIikge1xuXHRcdFx0XHRleHRyYWN0RmVhdHVyZXMoZGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmZWF0dXJlQ29sbGVjdGlvbjtcblx0fTtcblxuXHRHZW9KU09ORGF0YVNvdXJjZS5wcm90b3R5cGUuX3BhcnNlRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpIHtcblx0XHR2YXIgcG9seWdvbnMgPSBbXSwgcG9pbnRzID0gW10sIGxpbmVzID0gW107XG5cdFx0aWYoZmVhdHVyZS5nZW9tZXRyeS50eXBlID09IFwiUG9seWdvblwiKSB7XG5cdFx0XHRwb2x5Z29ucy5wdXNoKHRoaXMuX3BhcnNlQ29vcmRpbmF0ZXMoZmVhdHVyZS5nZW9tZXRyeS5jb29yZGluYXRlcykpO1xuXHRcdH1cblx0XHRlbHNlIGlmKGZlYXR1cmUuZ2VvbWV0cnkudHlwZSA9PSBcIk11bHRpUG9seWdvblwiKSB7XG5cdFx0XHR2YXIgY29vcmRpbmF0ZXMgPSBmZWF0dXJlLmdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8Y29vcmRpbmF0ZXMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdHBvbHlnb25zLnB1c2godGhpcy5fcGFyc2VDb29yZGluYXRlcyhjb29yZGluYXRlc1tpXSkpO1xuXHRcdH1cblx0XHRlbHNlIGlmKGZlYXR1cmUuZ2VvbWV0cnkudHlwZSA9PSBcIlBvaW50XCIpIHtcblx0XHRcdHZhciBjb29yZGluYXRlcyA9IGZlYXR1cmUuZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG5cdFx0XHR2YXIgbGF0TG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhjb29yZGluYXRlc1sxXSwgY29vcmRpbmF0ZXNbMF0pO1xuXHRcdFx0dmFyIHBvaW50ID0gdGhpcy5wcm9qZWN0aW9uLmZyb21MYXRMbmdUb1BvaW50KGxhdExuZyk7XG5cdFx0XHRwb2ludHMucHVzaCh7bGF0TG5nOiBsYXRMbmcsIHBvaW50OiBwb2ludH0pO1xuXHRcdH1cblx0XHRlbHNlIGlmKGZlYXR1cmUuZ2VvbWV0cnkudHlwZSA9PSBcIkxpbmVTdHJpbmdcIikge1xuXHRcdFx0bGluZXMucHVzaCh0aGlzLl9wYXJzZUNvb3JkaW5hdGVzKGZlYXR1cmUuZ2VvbWV0cnkuY29vcmRpbmF0ZXMpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHtwb2x5Z29uczpwb2x5Z29ucywgcG9pbnRzOnBvaW50cywgbGluZXM6bGluZXN9O1xuXHR9O1xuXG5cdEdlb0pTT05EYXRhU291cmNlLnByb3RvdHlwZS5fcGFyc2VDb29yZGluYXRlcyA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzKSB7XG5cdFx0dmFyIHBvbHlnb24gPSBbXTtcblx0XHRmb3IodmFyIGk9MDsgaTxjb29yZGluYXRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBvaW50cyA9IFtdO1xuXHRcdFx0Zm9yKHZhciBqPTA7IGo8Y29vcmRpbmF0ZXNbaV0ubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0dmFyIGxhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoY29vcmRpbmF0ZXNbaV1bal1bMV0sIGNvb3JkaW5hdGVzW2ldW2pdWzBdKTtcblx0XHRcdFx0dmFyIHBvaW50ID0gdGhpcy5wcm9qZWN0aW9uLmZyb21MYXRMbmdUb1BvaW50KGxhdExuZyk7XG5cdFx0XHRcdHBvaW50cy5wdXNoKFtwb2ludC54LCBwb2ludC55XSk7XG5cdFx0XHR9XG5cdFx0XHRwb2x5Z29uLnB1c2gocG9pbnRzKTtcblx0XHR9XG5cdFx0cmV0dXJuIHBvbHlnb247XG5cdH07XG5cblx0d2luZG93Lkdlb0pTT05EYXRhU291cmNlID0gR2VvSlNPTkRhdGFTb3VyY2U7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgSW1hZ2VEYXRhU291cmNlID0gZnVuY3Rpb24odXJsKXtcblx0XHR0aGlzLnVybCA9IHVybDtcblx0XHR0aGlzLmZpbGVFeHRlbnNpb24gPSBcInBuZ1wiO1xuXHRcdHRoaXMucmVzcG9uc2VUeXBlID0gXCJibG9iXCI7XG5cdH07XG5cblx0SW1hZ2VEYXRhU291cmNlLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHJldHVybiBkYXRhO1xuXHR9O1xuXG5cdHdpbmRvdy5JbWFnZURhdGFTb3VyY2UgPSBJbWFnZURhdGFTb3VyY2U7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHQvKipcblx0ICogU2l0ZXMgVHlwZWQgQXJyYXkgLSBEYXRhIFNvdXJjZVxuXHQgKiBGb3JtYXQ6IFVpbnQzMkFycmF5W2kqNF0gd2hlcmUgaSBpcyBudW1iZXIgb2Ygc2l0ZXNcblx0ICogYXJyYXlbMF0gPSBsYXRpdHVkZVxuXHQgKiBhcnJheVsxXSA9IGxvbmdpdHVkZVxuXHQgKiBhcnJheVsyXSA9IGNsdXN0ZXIgY291bnQuIGlmID4gMSwgdGhlbiBpdCdzIGEgY2x1c3Rlci4gaWYgPT0gMSwgdGhlbiBpdCdzIGEgcG9pbnQuXG5cdCAqIGFycmF5WzNdID0gc2l0ZSBpZFxuXHQgKi9cblx0dmFyIFNUQURhdGFTb3VyY2UgPSBmdW5jdGlvbih1cmwsIHByb2plY3Rpb24pe1xuXHRcdHRoaXMudXJsID0gdXJsO1xuXHRcdHRoaXMucHJvamVjdGlvbiA9IHByb2plY3Rpb247XG5cdFx0dGhpcy5maWxlRXh0ZW5zaW9uID0gXCJcIjtcblx0XHR0aGlzLnJlc3BvbnNlVHlwZSA9IFwiYXJyYXlidWZmZXJcIjtcblx0fTtcblxuXHRTVEFEYXRhU291cmNlLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHR2YXIgcHJvamVjdGlvbiA9IHRoaXMucHJvamVjdGlvbjtcblx0XHR2YXIgZGF0YSA9IG5ldyBVaW50MzJBcnJheShyZXNwb25zZS5kYXRhKTtcblx0XHR2YXIgbWFya2VycyA9IFtdO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrPTQpIHtcblx0XHRcdHZhciBsYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGRhdGFbaV0vMTAwMDAwMC4wLCBkYXRhW2krMV0vMTAwMDAwMC4wKTtcblx0XHRcdHZhciBwb2ludCA9IHByb2plY3Rpb24uZnJvbUxhdExuZ1RvUG9pbnQobGF0TG5nKTtcblx0XHRcdHZhciBjb3VudCA9IGRhdGFbaSsyXTtcblx0XHRcdHZhciBpZCAgPSBkYXRhW2krM107XG5cdFx0XHRtYXJrZXJzLnB1c2goe2lkOiBpZCwgY291bnQ6IGNvdW50LCBsYXRMbmc6IGxhdExuZywgcG9pbnQ6IHBvaW50fSk7XG5cdFx0fVxuXHRcdHJldHVybiBtYXJrZXJzO1xuXHR9O1xuXG5cdHdpbmRvdy5TVEFEYXRhU291cmNlID0gU1RBRGF0YVNvdXJjZTtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBUaWxlUHJvdmlkZXIgPSBmdW5jdGlvbihkYXRhU291cmNlLCAkaHR0cCwgJHEpIHtcblx0XHR0aGlzLmRhdGFTb3VyY2UgPSBkYXRhU291cmNlO1xuXHRcdHRoaXMuJGh0dHAgPSAkaHR0cDtcblx0XHR0aGlzLiRxID0gJHE7XG5cdFx0dGhpcy50aWxlcyA9IHt9O1xuXHR9O1xuXG5cdFRpbGVQcm92aWRlci5wcm90b3R5cGUuZ2V0VGlsZVVybCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHRyZXR1cm4gdGhpcy5kYXRhU291cmNlLnVybCtcIi9cIit6K1wiL1wiK3grXCIvXCIreStcIi5cIit0aGlzLmRhdGFTb3VyY2UuZmlsZUV4dGVuc2lvbjtcblx0fTtcblxuXHRUaWxlUHJvdmlkZXIucHJvdG90eXBlLmdldFRpbGUgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG5cdFx0dmFyIGRlZmVycmVkID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHZhciB1cmwgPSB0aGlzLmdldFRpbGVVcmwoeCwgeSwgeik7XG5cdFx0aWYodGhpcy50aWxlc1t1cmxdKXtcblx0XHRcdGRlZmVycmVkLnJlc29sdmUoe3VybDp1cmwsIGRhdGE6dGhpcy50aWxlc1t1cmxdfSk7XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLiRodHRwLmdldCh1cmwsIHtyZXNwb25zZVR5cGU6IHRoaXMuZGF0YVNvdXJjZS5yZXNwb25zZVR5cGV9KVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0c2VsZi50aWxlc1t1cmxdID0gc2VsZi5kYXRhU291cmNlLnBhcnNlKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe3VybDp1cmwsIGRhdGE6c2VsZi50aWxlc1t1cmxdfSk7XG5cdFx0XHRcdH0sIGZ1bmN0aW9uKHJlYXNvbil7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KHJlYXNvbik7XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0fTtcblxuXHR3aW5kb3cuVGlsZVByb3ZpZGVyID0gVGlsZVByb3ZpZGVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIEltYWdlVGlsZVZpZXcgPSBmdW5jdGlvbih0aWxlUHJvdmlkZXIsIHdlYkdsVmlldykge1xuXHRcdHRoaXMudGlsZVByb3ZpZGVyID0gdGlsZVByb3ZpZGVyO1xuXHRcdHRoaXMud2ViR2xWaWV3ID0gd2ViR2xWaWV3O1xuXHRcdHRoaXMudGlsZXMgPSB7fTtcblx0fTtcblxuXHRJbWFnZVRpbGVWaWV3LnByb3RvdHlwZS5zZXRUaWxlU2l6ZSA9IGZ1bmN0aW9uKHRpbGVTaXplKSB7XG5cdFx0dGhpcy50aWxlU2l6ZSA9IHRpbGVTaXplO1xuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLnNob3dUaWxlcyA9IGZ1bmN0aW9uKHVseCwgdWx5LCBscngsIGxyeSwgem9vbSkge1xuXHRcdGZvcih2YXIgY29sdW1uPXVseDsgY29sdW1uPD1scng7IGNvbHVtbisrKSB7XG5cdFx0XHRmb3IodmFyIHJvdz11bHk7IHJvdzw9bHJ5OyByb3crKykge1xuXHRcdFx0XHR0aGlzLnNob3dUaWxlKGNvbHVtbiwgcm93LCB6b29tKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLnNob3dUaWxlID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHZhciB1cmwgPSB0aGlzLnRpbGVQcm92aWRlci5nZXRUaWxlVXJsKHgsIHksIHopO1xuXHRcdGlmKHRoaXMudGlsZXNbdXJsXSkge1xuXHRcdFx0aWYoIXRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSkge1xuXHRcdFx0XHR2YXIgc2NhbGVGYWN0b3IgPSBNYXRoLnBvdygyLCB6KTtcblx0XHRcdFx0dmFyIHNwcml0ZVNpemUgPSB0aGlzLnRpbGVTaXplIC8gc2NhbGVGYWN0b3I7XG5cdFx0XHRcdHZhciBzcHJpdGVPcHRpb25zID0ge1xuXHRcdFx0XHRcdHBvc2l0aW9uOiB7eDp4KnNwcml0ZVNpemUsIHk6eSpzcHJpdGVTaXplLCB6Onp9LFxuXHRcdFx0XHRcdHdpZHRoOiBzcHJpdGVTaXplLFxuXHRcdFx0XHRcdGhlaWdodDogc3ByaXRlU2l6ZSxcblx0XHRcdFx0XHRpbWFnZTogdGhpcy50aWxlc1t1cmxdLmRhdGEsXG5cdFx0XHRcdFx0aW1hZ2VOYW1lOiB1cmxcblx0XHRcdFx0fTtcblx0XHRcdFx0dGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5ID0gdGhpcy53ZWJHbFZpZXcuYWRkU3ByaXRlKHNwcml0ZU9wdGlvbnMpO1xuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdFx0XHR9XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLnRpbGVQcm92aWRlci5nZXRUaWxlKHgsIHksIHopXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0gPSByZXNwb25zZTtcblx0XHRcdFx0XHR2YXIgc2NhbGVGYWN0b3IgPSBNYXRoLnBvdygyLCB6KTtcblx0XHRcdFx0XHR2YXIgc3ByaXRlU2l6ZSA9IHNlbGYudGlsZVNpemUgLyBzY2FsZUZhY3Rvcjtcblx0XHRcdFx0XHR2YXIgc3ByaXRlT3B0aW9ucyA9IHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiB7eDp4KnNwcml0ZVNpemUsIHk6eSpzcHJpdGVTaXplLCB6Onp9LFxuXHRcdFx0XHRcdFx0d2lkdGg6IHNwcml0ZVNpemUsXG5cdFx0XHRcdFx0XHRoZWlnaHQ6IHNwcml0ZVNpemUsXG5cdFx0XHRcdFx0XHRpbWFnZTogc2VsZi50aWxlc1t1cmxdLmRhdGEsXG5cdFx0XHRcdFx0XHRpbWFnZU5hbWU6IHVybFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0c2VsZi50aWxlc1t1cmxdLmdlb21ldHJ5ID0gc2VsZi53ZWJHbFZpZXcuYWRkU3ByaXRlKHNwcml0ZU9wdGlvbnMpO1xuXHRcdFx0XHRcdHNlbGYud2ViR2xWaWV3LmRyYXcoKTtcblx0XHRcdFx0fSwgZnVuY3Rpb24ocmVhc29uKXtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKHJlYXNvbik7XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0fTtcblxuXHRJbWFnZVRpbGVWaWV3LnByb3RvdHlwZS5oaWRlVGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgdXJsID0gdGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHRpZih0aGlzLnRpbGVzW3VybF0gJiYgdGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KSB7XG5cdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVTcHJpdGUodGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KTtcblx0XHRcdHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSA9IG51bGw7XG5cdFx0fVxuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG5cdFx0Zm9yKHZhciB1cmwgaW4gdGhpcy50aWxlcykge1xuXHRcdFx0aWYodGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KSB7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZVNwcml0ZSh0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdH07XG5cblx0d2luZG93LkltYWdlVGlsZVZpZXcgPSBJbWFnZVRpbGVWaWV3O1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIFNpdGVDbHVzdGVyVmlldyA9IGZ1bmN0aW9uKCl7XG5cblx0fTtcblxuXHR3aW5kb3cuU2l0ZUNsdXN0ZXJWaWV3ID0gU2l0ZUNsdXN0ZXJWaWV3O1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblxuXHRmdW5jdGlvbiBjb2xvclRvSGV4KGIpIHtcblx0XHR2YXIgaGV4Q2hhciA9IFtcIjBcIiwgXCIxXCIsIFwiMlwiLCBcIjNcIiwgXCI0XCIsIFwiNVwiLCBcIjZcIiwgXCI3XCIsXCI4XCIsIFwiOVwiLCBcImFcIiwgXCJiXCIsIFwiY1wiLCBcImRcIiwgXCJlXCIsIFwiZlwiXTtcblx0XHRyZXR1cm4gaGV4Q2hhclsoYiA+PiAyMCkgJiAweDBmXSArIGhleENoYXJbKGIgPj4gMTYpICYgMHgwZl0gKyBcblx0XHRcdGhleENoYXJbKGIgPj4gMTIpICYgMHgwZl0gKyBoZXhDaGFyWyhiID4+IDgpICYgMHgwZl0gKyBcblx0XHRcdGhleENoYXJbKGIgPj4gNCkgJiAweDBmXSArIGhleENoYXJbYiAmIDB4MGZdO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UmFuZG9tQ29sb3IoKSB7XG5cdFx0cmV0dXJuIChNYXRoLmZsb29yKDI1NS4wKk1hdGgucmFuZG9tKCkpICYgMHhGRikgPDwgMTYgXG5cdFx0XHR8IChNYXRoLmZsb29yKDI1NS4wKk1hdGgucmFuZG9tKCkpICYgMHhGRikgPDwgOCBcblx0XHRcdHwgKE1hdGguZmxvb3IoMjU1LjAqTWF0aC5yYW5kb20oKSkgJiAweEZGKTtcblx0fVxuXG5cdHZhciBWZWN0b3JUaWxlVmlldyA9IGZ1bmN0aW9uKHRpbGVQcm92aWRlciwgd2ViR2xWaWV3LCB1c2VSYW5kb21Db2xvcnMpIHtcblx0XHR0aGlzLnRpbGVQcm92aWRlciA9IHRpbGVQcm92aWRlcjtcblx0XHR0aGlzLndlYkdsVmlldyA9IHdlYkdsVmlldztcblx0XHR0aGlzLnRpbGVzID0ge307XG5cdFx0dGhpcy5zaG93blRpbGVzID0ge307XG5cblx0XHQvLyB1c2VkIGZvciBkZWJ1Z2dpbmdcblx0XHR0aGlzLnVzZVJhbmRvbUNvbG9ycyA9IHVzZVJhbmRvbUNvbG9ycztcblx0fTtcblxuXHRWZWN0b3JUaWxlVmlldy5wcm90b3R5cGUuc2V0VGlsZVNpemUgPSBmdW5jdGlvbih0aWxlU2l6ZSkge1xuXHRcdHRoaXMudGlsZVNpemUgPSB0aWxlU2l6ZTtcblx0fTtcblxuXHRWZWN0b3JUaWxlVmlldy5wcm90b3R5cGUuc2V0VGlsZVNpemUgPSBmdW5jdGlvbih0aWxlU2l6ZSkge1xuXHRcdHRoaXMudGlsZVNpemUgPSB0aWxlU2l6ZTtcblx0fTtcblxuXHRWZWN0b3JUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGVzID0gZnVuY3Rpb24odWx4LCB1bHksIGxyeCwgbHJ5LCB6b29tKSB7XG5cdFx0Zm9yKHZhciBjb2x1bW49dWx4OyBjb2x1bW48PWxyeDsgY29sdW1uKyspIHtcblx0XHRcdGZvcih2YXIgcm93PXVseTsgcm93PD1scnk7IHJvdysrKSB7XG5cdFx0XHRcdHRoaXMuc2hvd1RpbGUoY29sdW1uLCByb3csIHpvb20pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLnNob3dUaWxlID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHZhciB1cmwgPSB0aGlzLnRpbGVQcm92aWRlci5nZXRUaWxlVXJsKHgsIHksIHopO1xuXHRcdC8vIGNvbnNvbGUubG9nKFwiU2hvd2luZyB0aWxlOiBcIiArIHVybCk7XG5cdFx0aWYodGhpcy5zaG93blRpbGVzW3VybF0pIHJldHVybjtcblx0XHR0aGlzLnNob3duVGlsZXNbdXJsXSA9IHRydWU7XG5cblx0XHRpZih0aGlzLnRpbGVzW3VybF0pIHtcblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5wb2x5Z29uIHx8IHRoaXMudGlsZXNbdXJsXS5saW5lKVxuXHRcdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9seWdvbilcblx0XHRcdFx0XHR0aGlzLndlYkdsVmlldy5hZGRHZW9tZXRyeSh0aGlzLnRpbGVzW3VybF0ucG9seWdvbik7XG5cdFx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5saW5lKVxuXHRcdFx0XHRcdHRoaXMud2ViR2xWaWV3LmFkZExpbmUodGhpcy50aWxlc1t1cmxdLmxpbmUpO1xuXHRcdFx0ZWxzZSBpZih0aGlzLnRpbGVzW3VybF0uZGF0YSkgXG5cdFx0XHRcdHRoaXMuY3JlYXRlRmVhdHVyZXModGhpcy50aWxlc1t1cmxdLmRhdGEpO1xuXHRcdH1lbHNle1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZSh4LCB5LCB6KVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0c2VsZi50aWxlc1t1cmxdID0gcmVzcG9uc2U7XG5cdFx0XHRcdFx0aWYoc2VsZi5zaG93blRpbGVzW3VybF0pXG5cdFx0XHRcdFx0XHRzZWxmLmNyZWF0ZUZlYXR1cmVzKHNlbGYudGlsZXNbdXJsXS5kYXRhKTtcblx0XHRcdFx0fSwgZnVuY3Rpb24ocmVhc29uKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhyZWFzb24pO1xuXHRcdFx0XHR9KTtcblx0XHR9XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLmhpZGVUaWxlID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHZhciB1cmwgPSB0aGlzLnRpbGVQcm92aWRlci5nZXRUaWxlVXJsKHgsIHksIHopO1xuXHRcdC8vIGNvbnNvbGUubG9nKFwiSGlkaW5nIHRpbGU6IFwiICsgdXJsKTtcblx0XHR0aGlzLnNob3duVGlsZXNbdXJsXSA9IGZhbHNlO1xuXG5cdFx0aWYodGhpcy50aWxlc1t1cmxdKSB7XG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9seWdvbikge1xuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVHZW9tZXRyeSh0aGlzLnRpbGVzW3VybF0ucG9seWdvbik7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnRpbGVzW3VybF0ucG9seWdvbjtcblx0XHRcdFx0dGhpcy50aWxlc1t1cmxdLnBvbHlnb24gPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ubGluZSkge1xuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVMaW5lKHRoaXMudGlsZXNbdXJsXS5saW5lKTtcblx0XHRcdFx0ZGVsZXRlIHRoaXMudGlsZXNbdXJsXS5saW5lO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ubGluZSA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHRcdGZvcih2YXIgdXJsIGluIHRoaXMudGlsZXMpIHtcblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5wb2x5Z29uKSB7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZUdlb21ldHJ5KHRoaXMudGlsZXNbdXJsXS5wb2x5Z29uKTtcblx0XHRcdFx0ZGVsZXRlIHRoaXMudGlsZXNbdXJsXS5wb2x5Z29uO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ucG9seWdvbiA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5saW5lKSB7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZUxpbmUodGhpcy50aWxlc1t1cmxdLmxpbmUpO1xuXHRcdFx0XHRkZWxldGUgdGhpcy50aWxlc1t1cmxdLmxpbmU7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5saW5lID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5jcmVhdGVGZWF0dXJlcyA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG5cdFx0dmFyIGFkZGVkID0gZmFsc2U7XG5cblx0XHRpZihmZWF0dXJlcy5wb2x5Z29ucy5sZW5ndGggPiAwKSB7XG5cdFx0XHR2YXIgcG9seWdvbk9wdGlvbnMgPSB7fTtcblx0XHRcdHBvbHlnb25PcHRpb25zLmZlYXR1cmVzID0gZmVhdHVyZXMucG9seWdvbnM7XG5cdFx0XHRwb2x5Z29uT3B0aW9ucy5maWxsQ29sb3IgPSB0aGlzLnVzZVJhbmRvbUNvbG9ycyA/IGdldFJhbmRvbUNvbG9yKCkgOiBudWxsO1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLnBvbHlnb24gPSB0aGlzLndlYkdsVmlldy5jcmVhdGVHZW9tZXRyeShwb2x5Z29uT3B0aW9ucyk7XG5cdFx0XHRhZGRlZCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0aWYoZmVhdHVyZXMubGluZXMubGVuZ3RoID4gMCkge1xuXHRcdFx0dmFyIGxpbmVPcHRpb25zID0ge307XG5cdFx0XHRsaW5lT3B0aW9ucy5mZWF0dXJlcyA9IGZlYXR1cmVzLmxpbmVzO1xuXHRcdFx0bGluZU9wdGlvbnMuc3Ryb2tlQ29sb3IgPSB0aGlzLnVzZVJhbmRvbUNvbG9ycyA/IGdldFJhbmRvbUNvbG9yKCkgOiBudWxsO1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLmxpbmUgPSB0aGlzLndlYkdsVmlldy5jcmVhdGVMaW5lKGxpbmVPcHRpb25zKTtcblx0XHRcdGFkZGVkID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZihhZGRlZClcblx0XHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHR3aW5kb3cuVmVjdG9yVGlsZVZpZXcgPSBWZWN0b3JUaWxlVmlldztcbn0oKSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
