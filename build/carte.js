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
		}
		// there's nothing under the mouse
		else {
			// we lost our object. bye bye
			if(this.hoveredMarker !== null) {
				this.hoveredMarker.dispatchEvent({type: 'mouseout'});
				this.hoveredMarker = null;
			}
		}
	};

	window.PointRenderer = PointRenderer;
}());
(function(){
	var PolygonRenderer = function() {};

	PolygonRenderer.prototype = new ObjectRenderer();
	PolygonRenderer.prototype.constructor = ObjectRenderer;

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
		// add them to an array so we can draw/update them all later
		this.objectRenderers.push(this.pointRenderer);
		this.objectRenderers.push(this.polygonRenderer);
		this.objectRenderers.push(this.spriteRenderer);
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
		var geometry = this.polygonRenderer.create(options, this.scene);
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
		var featureCollection = [];
		if(data) {
			if(data.type == "FeatureCollection") {
				var features = data.features;
				for(var i=0; i<features.length; i++)
					featureCollection.push(this._parseFeature(features[i]));
			}else if(data.type == "Feature") {
				featureCollection.push(this._parseFeature(data));
			}
		}
		return featureCollection;
	};

	GeoJSONDataSource.prototype._parseFeature = function(feature) {
		var polygons = [];
		if(feature.geometry.type == "Polygon") {
			polygons.push(this._parsePolygon(feature.geometry.coordinates));
		}
		else if(feature.geometry.type == "MultiPolygon") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++)
				polygons.push(this._parsePolygon(coordinates[i]));
		}
		return polygons;
	};

	GeoJSONDataSource.prototype._parsePolygon = function(coordinates) {
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
					console.log(reason);
				});
		}
	};

	VectorTileView.prototype.hideTile = function(x, y, z) {
		var url = this.tileProvider.getTileUrl(x, y, z);
		// console.log("Hiding tile: " + url);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJnZW9tcy9yZWN0YW5nbGUuanMiLCJncmFwaGljcy9keW5hbWljX3Nwcml0ZXNoZWV0LmpzIiwiZ3JhcGhpY3Mvb2JqZWN0X3JlbmRlcmVyLmpzIiwiZ3JhcGhpY3MvcG9pbnRfcmVuZGVyZXIuanMiLCJncmFwaGljcy9wb2x5Z29uX3JlbmRlcmVyLmpzIiwiZ3JhcGhpY3Mvc3ByaXRlX3JlbmRlcmVyLmpzIiwiZ3JhcGhpY3Mvc3ByaXRlc2hlZXQuanMiLCJncmFwaGljcy93ZWJnbF92aWV3LmpzIiwidXRpbHMvaHR0cHJlcXVlc3RzLmpzIiwiZ2lzL2NvbnRyb2xsZXJzL3RpbGVfY29udHJvbGxlci5qcyIsImdpcy9kYXRhc291cmNlcy9nZW9qc29uX2RhdGFzb3VyY2UuanMiLCJnaXMvZGF0YXNvdXJjZXMvaW1hZ2VfZGF0YXNvdXJjZS5qcyIsImdpcy9kYXRhc291cmNlcy90aWxlX3Byb3ZpZGVyLmpzIiwiZ2lzL3ZpZXdzL2ltYWdlX3RpbGVfdmlldy5qcyIsImdpcy92aWV3cy92ZWN0b3JfdGlsZV92aWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJjYXJ0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGRlY2xhcmUgcGFja2FnZSBuYW1lc1xudmFyIGNhcnRlID0ge307IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBSZWN0YW5nbGUgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG5cdFx0dGhpcy54ID0geDtcblx0XHR0aGlzLnkgPSB5O1xuXHRcdHRoaXMud2lkdGggPSB3aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblx0XHR0aGlzLnVseCA9IHg7XG5cdFx0dGhpcy51bHkgPSB5O1xuXHRcdHRoaXMubHJ4ID0geCt3aWR0aDtcblx0XHR0aGlzLmxyeSA9IHkrd2lkdGg7XG5cdH07XG5cblx0UmVjdGFuZ2xlLnByb3RvdHlwZS5jb250YWluc1BvaW50ID0gZnVuY3Rpb24oeCwgeSkge1xuXHRcdHJldHVybiB0aGlzLnVseDw9eCAmJiB4PD10aGlzLmxyeCAmJiB0aGlzLnVseTw9eSAmJiB5PD10aGlzLmxyeTtcblx0fTtcblxuXHRSZWN0YW5nbGUucHJvdG90eXBlLmNvbnRhaW5zUmVjdCA9IGZ1bmN0aW9uKHJlY3QpIHtcblx0XHRyZXR1cm4gdGhpcy5jb250YWluc1BvaW50KHJlY3QueCwgcmVjdC55KSAmJiBcblx0XHRcdHRoaXMuY29udGFpbnNQb2ludChyZWN0LngrcmVjdC53aWR0aCwgcmVjdC55K3JlY3QuaGVpZ2h0KTtcblx0fTtcblxuXHRSZWN0YW5nbGUucHJvdG90eXBlLmNvbnRhaW5zRGltZW5zaW9ucyA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQpIHtcblx0XHRyZXR1cm4gdGhpcy53aWR0aCA+PSB3aWR0aCAmJiB0aGlzLmhlaWdodCA+PSBoZWlnaHQ7XG5cdH07XG5cblx0UmVjdGFuZ2xlLnByb3RvdHlwZS5nZXROb3JtYWxpemVkUmVjdCA9IGZ1bmN0aW9uKG1heFdpZHRoLCBtYXhIZWlnaHQpIHtcblx0XHR2YXIgeCA9IHRoaXMueCAvIG1heFdpZHRoLFxuXHRcdFx0eSA9IHRoaXMueSAvIG1heEhlaWdodCxcblx0XHRcdHdpZHRoID0gdGhpcy53aWR0aCAvIG1heFdpZHRoLFxuXHRcdFx0aGVpZ2h0ID0gdGhpcy5oZWlnaHQgLyBtYXhIZWlnaHQ7XG5cdFx0cmV0dXJuIG5ldyBSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG5cdH07XG5cblx0d2luZG93LlJlY3RhbmdsZSA9IFJlY3RhbmdsZTtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBTcHJpdGVOb2RlID0gZnVuY3Rpb24ocmVjdCkge1xuXHRcdHRoaXMucmVjdCA9IHJlY3Q7XG5cdFx0dGhpcy5uYW1lID0gXCJzcHJpdGUwXCI7XG5cdFx0dGhpcy5pbWFnZSA9IG51bGw7XG5cdFx0dGhpcy5jaGlsZCA9IFtdO1xuXHR9O1xuXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmNvbXB1dGVOb3JtYWwgPSBmdW5jdGlvbihtYXhXaWR0aCwgbWF4SGVpZ2h0KSB7XG5cdFx0dGhpcy5tYXhXaWR0aCA9IG1heFdpZHRoO1xuXHRcdHRoaXMubWF4SGVpZ2h0ID0gbWF4SGVpZ2h0O1xuXHRcdHRoaXMubm9ybWFsUmVjdCA9IHRoaXMucmVjdC5nZXROb3JtYWxpemVkUmVjdChtYXhXaWR0aCwgbWF4SGVpZ2h0KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQvKipcblx0ICogUGVyZm9ybSBtYXggcmVjdCBhbGdvcml0aG0gZm9yIGZpbmRpbmcgd2hlcmUgdG8gZml0IHRoZSBpbWFnZS5cblx0ICogU2FtcGxlIGltcGxlbWVudGF0aW9uIGZvciBsaWdodG1hcHM6IGh0dHA6Ly93d3cuYmxhY2twYXduLmNvbS90ZXh0cy9saWdodG1hcHMvXG5cdCAqL1xuXHRTcHJpdGVOb2RlLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbihuYW1lLCBpbWFnZSkge1xuXHRcdHZhciBuZXdOb2RlID0gbnVsbDtcblx0XHRpZih0aGlzLmltYWdlICE9PSBudWxsKSB7XG5cdFx0XHQvLyB0aGlzIGFscmVhZHkgY29udGFpbnMgYW4gaW1hZ2Ugc28gbGV0J3MgY2hlY2sgaXQncyBjaGlsZHJlblxuXHRcdFx0aWYodGhpcy5jaGlsZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdG5ld05vZGUgPSB0aGlzLmNoaWxkWzBdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHRcdGlmKG5ld05vZGUgIT09IG51bGwpIHJldHVybiBuZXdOb2RlO1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5jaGlsZFsxXS5pbnNlcnQobmFtZSwgaW1hZ2UpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdGhpcyBpcyBhIGxlYWYgbm9kZSBhbmQgYWxyZWFkeSBjb250YWlucyBhbiBpbWFnZSB0aGF0ICdqdXN0IGZpdHMnXG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYodGhpcy5yZWN0LmNvbnRhaW5zRGltZW5zaW9ucyhpbWFnZS53aWR0aCwgaW1hZ2UuaGVpZ2h0KSkge1xuXHRcdFx0XHRpZih0aGlzLnJlY3Qud2lkdGggPT0gaW1hZ2Uud2lkdGggJiYgdGhpcy5yZWN0LmhlaWdodCA9PSBpbWFnZS5oZWlnaHQpIHtcblx0XHRcdFx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdFx0XHRcdHRoaXMuaW1hZ2UgPSBpbWFnZTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHRoaXMuY2hpbGQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdG5ld05vZGUgPSB0aGlzLmNoaWxkWzBdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHRcdFx0aWYobmV3Tm9kZSAhPT0gbnVsbCkgcmV0dXJuIG5ld05vZGU7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRbMV0uaW5zZXJ0KG5hbWUsIGltYWdlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgcmVjdCA9IHRoaXMucmVjdDtcblx0XHRcdFx0XHR2YXIgZFcgPSB0aGlzLnJlY3Qud2lkdGggLSBpbWFnZS53aWR0aDtcblx0XHRcdFx0XHR2YXIgZEggPSB0aGlzLnJlY3QuaGVpZ2h0IC0gaW1hZ2UuaGVpZ2h0O1xuXHRcdFx0XHRcdGlmKGRXID4gZEgpIHtcblx0XHRcdFx0XHRcdC8vIHNwbGl0IHRoaXMgcmVjdGFuZ2xlIHZlcnRpY2FsbHkgaW50byB0d28sIGxlZnQgYW5kIHJpZ2h0XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzBdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngsIHJlY3QueSwgaW1hZ2Uud2lkdGgsIHJlY3QuaGVpZ2h0KSk7XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzFdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngraW1hZ2Uud2lkdGgsIHJlY3QueSwgZFcsIHJlY3QuaGVpZ2h0KSk7XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHQvLyBzcGxpdCB0aGlzIHJlY3RhbmdsZSBob3Jpem9udGFsbHkgaW50byB0d28sIG9uZSBhYm92ZSBhbm90aGVyIGJlbG93XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzBdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngsIHJlY3QueSwgcmVjdC53aWR0aCwgaW1hZ2UuaGVpZ2h0KSk7XG5cdFx0XHRcdFx0XHR0aGlzLmNoaWxkWzFdID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZShyZWN0LngsIHJlY3QueStpbWFnZS5oZWlnaHQsIHJlY3Qud2lkdGgsIGRIKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuY2hpbGRbMF0uY29tcHV0ZU5vcm1hbCh0aGlzLm1heFdpZHRoLCB0aGlzLm1heEhlaWdodCk7XG5cdFx0XHRcdFx0dGhpcy5jaGlsZFsxXS5jb21wdXRlTm9ybWFsKHRoaXMubWF4V2lkdGgsIHRoaXMubWF4SGVpZ2h0KTtcblx0XHRcdFx0XHQvLyB0aGlzIGltYWdlIHNob3VsZCBhdXRvbWF0aWNhbGx5IGZpdCB0aGUgZmlyc3Qgbm9kZVxuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNoaWxkWzBdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdC8vIHRoaXMgd2lsbCBub3QgZml0IHRoaXMgbm9kZVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHR9O1xuXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRpZih0aGlzLm5hbWUgPT0gbmFtZSkgcmV0dXJuIHRoaXM7XG5cdFx0aWYodGhpcy5jaGlsZC5sZW5ndGggPiAwKSB7XG5cdFx0XHR2YXIgbm9kZSA9IHRoaXMuY2hpbGRbMF0uZ2V0KG5hbWUpO1xuXHRcdFx0aWYobm9kZSAhPT0gbnVsbCkgcmV0dXJuIG5vZGU7XG5cdFx0XHRyZXR1cm4gdGhpcy5jaGlsZFsxXS5nZXQobmFtZSk7XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9O1xuXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHR2YXIgbm9kZSA9IHRoaXMuZ2V0KG5hbWUpO1xuXHRcdGlmKG5vZGUpIG5vZGUuY2xlYXIoKTtcblx0XHRyZXR1cm4gbm9kZTtcblx0fTtcblxuXHRTcHJpdGVOb2RlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMubmFtZSA9IFwiXCI7XG5cdFx0dGhpcy5pbWFnZSA9IG51bGw7XG5cdH07XG5cblx0dmFyIER5bmFtaWNTcHJpdGVTaGVldCA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQpIHtcblx0XHR0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuY2FudmFzLndpZHRoID0gd2lkdGg7XG5cdFx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcblx0XHR0aGlzLnRleHR1cmUgPSBuZXcgVEhSRUUuVGV4dHVyZSh0aGlzLmNhbnZhcyk7XG5cdFx0dGhpcy50ZXh0dXJlLm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XG5cdFx0dGhpcy50ZXh0dXJlLm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XG5cdFx0dGhpcy50ZXh0dXJlLmZsaXBZID0gZmFsc2U7XG5cblx0XHR0aGlzLnBub2RlID0gbmV3IFNwcml0ZU5vZGUobmV3IFJlY3RhbmdsZSgwLCAwLCB3aWR0aCwgaGVpZ2h0KSk7XG5cdFx0dGhpcy5wbm9kZS5jb21wdXRlTm9ybWFsKHdpZHRoLCBoZWlnaHQpO1xuXHR9O1xuXG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUgPSBuZXcgVEhSRUUuRXZlbnREaXNwYXRjaGVyKCk7XG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEeW5hbWljU3ByaXRlU2hlZXQ7XG5cblx0RHluYW1pY1Nwcml0ZVNoZWV0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucG5vZGUuZ2V0KG5hbWUpO1xuXHR9O1xuXG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24obmFtZSwgaW1hZ2UpIHtcblx0XHRpZihpbWFnZSA9PT0gdW5kZWZpbmVkIHx8IGltYWdlID09PSBudWxsKSByZXR1cm4gbnVsbDtcblx0XHRpZih0aGlzLmdldChuYW1lKSAhPT0gbnVsbCkgcmV0dXJuIG51bGw7XG5cdFx0dmFyIG5vZGUgPSB0aGlzLnBub2RlLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0aWYobm9kZSkge1xuXHRcdFx0dmFyIHJlY3QgPSBub2RlLnJlY3Q7XG5cdFx0XHR0aGlzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCByZWN0LngsIHJlY3QueSk7XG5cdFx0XHR0aGlzLnRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnc3ByaXRlX2FkZGVkJ30pO1xuXHRcdH1cblx0XHRyZXR1cm4gbm9kZTtcblx0fTtcblxuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHR2YXIgbm9kZSA9IHRoaXMucG5vZGUuZGVsZXRlKG5hbWUpO1xuXHRcdGlmKG5vZGUpIHtcblx0XHRcdHZhciByZWN0ID0gbm9kZS5yZWN0O1xuXHRcdFx0dGhpcy5jb250ZXh0LmNsZWFyUmVjdChyZWN0LngsIHJlY3QueSwgcmVjdC53aWR0aCwgcmVjdC5oZWlnaHQpO1xuXHRcdFx0dGhpcy50ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ3Nwcml0ZV9yZW1vdmVkJ30pO1xuXHRcdH1cblx0XHRyZXR1cm4gbm9kZTtcblx0fTtcblxuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihuYW1lLCB1cmwpIHtcblxuXHR9O1xuXG5cdHdpbmRvdy5EeW5hbWljU3ByaXRlU2hlZXQgPSBEeW5hbWljU3ByaXRlU2hlZXQ7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgT2JqZWN0UmVuZGVyZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7IFxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oKSB7XG5cblx0fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cblx0fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG9iamVjdCkge1xuXG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuXG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihvYmplY3QpIHtcblxuXHR9O1xuXG5cdHdpbmRvdy5PYmplY3RSZW5kZXJlciA9IE9iamVjdFJlbmRlcmVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIHZzaGFkZXIgPSAoZnVuY3Rpb24gKCkgey8qXG5cdFx0dW5pZm9ybSBmbG9hdCBwb2ludFNpemU7XG5cdFx0YXR0cmlidXRlIHZlYzQgdGlsZTtcblx0XHR2YXJ5aW5nIHZlYzQgdlRpbGU7XG5cdFx0dmFyeWluZyB2ZWMzIHZDb2xvcjtcblxuXHRcdHZvaWQgbWFpbigpIHtcblx0XHRcdHZlYzQgbXZQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7XG5cdFx0XHRnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBtdlBvc2l0aW9uO1xuXHRcdFx0Z2xfUG9pbnRTaXplID0gcG9pbnRTaXplO1xuXHRcdFx0dlRpbGUgPSB0aWxlO1xuXHRcdFx0dkNvbG9yID0gY29sb3I7XG5cdFx0fVxuXHQqL30pLnRvU3RyaW5nKCkubWF0Y2goL1teXSpcXC9cXCooW15dKilcXCpcXC9cXH0kLylbMV07XG5cblx0dmFyIGZzaGFkZXIgPSAoZnVuY3Rpb24gKCkgey8qXG5cdFx0dW5pZm9ybSBzYW1wbGVyMkQgdGV4MTtcblx0XHR1bmlmb3JtIHZlYzIgc3ByaXRlU2l6ZTtcblx0XHR2YXJ5aW5nIHZlYzQgdlRpbGU7XG5cdFx0dmFyeWluZyB2ZWMzIHZDb2xvcjtcblxuXHRcdHZvaWQgbWFpbigpIHtcblx0XHRcdHZlYzIgdGlsZVVWID0gdlRpbGUueHkgKyB2VGlsZS56dyAqIGdsX1BvaW50Q29vcmQ7XG5cdFx0XHRnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodGV4MSwgdGlsZVVWKSAqIHZlYzQodkNvbG9yLnJnYiwgMS4wKTtcblx0XHR9XG5cdCovfSkudG9TdHJpbmcoKS5tYXRjaCgvW15dKlxcL1xcKihbXl0qKVxcKlxcL1xcfSQvKVsxXTtcblxuXHR2YXIgTUFYX0NPVU5UID0gTWF0aC5wb3coMiwzMikgLSAxO1xuXHR2YXIgU1RBUlRfVkFMVUUgPSAtOTk5OTkuMDtcblxuXHR2YXIgTWFya2VyID0gZnVuY3Rpb24oKSB7fTtcblx0TWFya2VyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVEhSRUUuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cblx0dmFyIFBvaW50UmVuZGVyZXIgPSBmdW5jdGlvbih3ZWJHbFZpZXcpIHtcblx0XHR0aGlzLndlYkdsVmlldyA9IHdlYkdsVmlldztcblx0XHR0aGlzLnBvaW50U2l6ZSA9IDMyLjA7XG5cblx0XHR0aGlzLnJheWNhc3RlciA9IG5ldyBUSFJFRS5SYXljYXN0ZXIoKTtcblx0XHR0aGlzLm1vdXNlID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcblx0XHR0aGlzLm1hcmtlcnMgPSB7fTtcblx0XHR0aGlzLmhvdmVyZWRNYXJrZXIgPSBudWxsO1xuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1BWF9DT1VOVDtcblx0XHR0aGlzLm1heEluZGV4ID0gMDtcblx0XHR0aGlzLmluZGV4ID0gMDtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5wb3NpdGlvbnMgPSBuZXcgRmxvYXQzMkFycmF5KDEwMDAwMDAgKiAzKTtcblx0XHR0aGlzLnBvc2l0aW9ucy5maWxsKFNUQVJUX1ZBTFVFKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy5wb3NpdGlvbnMsIDMpO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLmNvbG9ycyA9IG5ldyBGbG9hdDMyQXJyYXkoMTAwMDAwMCAqIDMpO1xuXHRcdHRoaXMuY29sb3JzQXR0cmlidXRlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh0aGlzLmNvbG9ycywgMyk7XG5cdFx0dGhpcy5jb2xvcnNBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMudGlsZXMgPSBuZXcgRmxvYXQzMkFycmF5KDEwMDAwMDAgKiA0KTsgXG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy50aWxlcywgNCk7IFxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMuZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCB0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZSk7XG5cdFx0dGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ2NvbG9yJywgdGhpcy5jb2xvcnNBdHRyaWJ1dGUpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCd0aWxlJywgdGhpcy50aWxlc0F0dHJpYnV0ZSk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gbmV3IER5bmFtaWNTcHJpdGVTaGVldCgyNTYsIDI1Nik7XG5cdFx0dGhpcy5tYXRlcmlhbCA9IG5ldyBUSFJFRS5TaGFkZXJNYXRlcmlhbCgge1xuXHRcdFx0dW5pZm9ybXM6IHtcblx0XHRcdFx0dGV4MTogeyB0eXBlOiBcInRcIiwgdmFsdWU6IHRoaXMuc3ByaXRlU2hlZXQudGV4dHVyZSB9LFxuXHRcdFx0XHRwb2ludFNpemU6IHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLnBvaW50U2l6ZSB9XG5cdFx0XHR9LFxuXHRcdFx0dmVydGV4Q29sb3JzOiBUSFJFRS5WZXJ0ZXhDb2xvcnMsXG5cdFx0XHR2ZXJ0ZXhTaGFkZXI6IHZzaGFkZXIsXG5cdFx0XHRmcmFnbWVudFNoYWRlcjogZnNoYWRlcixcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxuXHRcdFx0ZGVwdGhXcml0ZTogZmFsc2UsXG5cdFx0XHRkZXB0aFRlc3Q6IGZhbHNlXG5cdFx0fSk7XG5cblx0XHR0aGlzLnNjZW5lT2JqZWN0ID0gbmV3IFRIUkVFLlBvaW50cyh0aGlzLmdlb21ldHJ5LCB0aGlzLm1hdGVyaWFsKTtcblx0XHR0aGlzLnJheWNhc3RPYmplY3RzID0gW3RoaXMuc2NlbmVPYmplY3RdO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcnMoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5oYW5kbGVEb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmhhbmRsZURvY3VtZW50TW91c2VDbGljay5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdHRoaXMudXBkYXRlKGV2ZW50KTtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVEb2N1bWVudE1vdXNlQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdHRoaXMudXBkYXRlKGV2ZW50KTtcblx0XHRpZih0aGlzLmhvdmVyZWRNYXJrZXIpIFxuXHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6IFwiY2xpY2tcIn0pO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLl9jcmVhdGVNYXJrZXIgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdHZhciBtYXJrZXIgPSBuZXcgTWFya2VyKCk7XG5cdFx0bWFya2VyLmluZGV4ID0gaW5kZXg7XG5cdFx0dGhpcy5tYXJrZXJzW2luZGV4XSA9IG1hcmtlcjtcblx0XHRyZXR1cm4gbWFya2VyO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgYXJyYXlJbmRleCA9IHRoaXMuaW5kZXggKiAzO1xuXHRcdHdoaWxlKGFycmF5SW5kZXggPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGggJiYgdGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleF0gIT09IFNUQVJUX1ZBTFVFKVxuXHRcdFx0YXJyYXlJbmRleCA9ICsrdGhpcy5pbmRleCozO1xuXG5cdFx0aWYoYXJyYXlJbmRleCA+PSB0aGlzLnBvc2l0aW9ucy5sZW5ndGgpe1xuXHRcdFx0Ly8hVE9ETzogRXhwYW5kIHBvaW50cyBidWZmZXJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1BvaW50UmVuZGVyZXJdIFJ1biBvdXQgb2YgcG9pbnRzISEhXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdG9wdGlvbnMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uIHx8IHt4OjAsIHk6MCwgejowfTtcblx0XHRvcHRpb25zLmNvbG9yID0gb3B0aW9ucy5jb2xvciB8fCB7cjoxLCBnOjEsIGI6MX07XG5cblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMF0gPSBvcHRpb25zLnBvc2l0aW9uLng7XG5cdFx0dGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleCArIDFdID0gb3B0aW9ucy5wb3NpdGlvbi55O1xuXHRcdHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXggKyAyXSA9IG9wdGlvbnMucG9zaXRpb24uejtcblxuXHRcdHRoaXMuY29sb3JzW2FycmF5SW5kZXggKyAwXSA9IG9wdGlvbnMuY29sb3Iucjtcblx0XHR0aGlzLmNvbG9yc1thcnJheUluZGV4ICsgMV0gPSBvcHRpb25zLmNvbG9yLmc7XG5cdFx0dGhpcy5jb2xvcnNbYXJyYXlJbmRleCArIDJdID0gb3B0aW9ucy5jb2xvci5iO1xuXG5cdFx0dmFyIHNwcml0ZSA9IHRoaXMuc3ByaXRlU2hlZXQuZ2V0KG9wdGlvbnMuaW1hZ2VOYW1lKTtcblx0XHRpZighc3ByaXRlKSB7XG5cdFx0XHRzcHJpdGUgPSB0aGlzLnNwcml0ZVNoZWV0LmFkZChvcHRpb25zLmltYWdlTmFtZSwgb3B0aW9ucy5pbWFnZSk7XG5cdFx0XHRpZighc3ByaXRlKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1BvaW50UmVuZGVyZXJdIFNwcml0ZVNoZWV0IGFscmVhZHkgZnVsbC5cIik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhciBzcHJpdGVSZWN0ID0gc3ByaXRlICE9PSBudWxsID8gc3ByaXRlLm5vcm1hbFJlY3QgOiB7eDowLCB5OjAsIHdpZHRoOjAsIGhlaWdodDowfTtcblx0XHR0aGlzLnRpbGVzW3RoaXMuaW5kZXgqNCArIDBdID0gc3ByaXRlUmVjdC54O1xuXHRcdHRoaXMudGlsZXNbdGhpcy5pbmRleCo0ICsgMV0gPSBzcHJpdGVSZWN0Lnk7XG5cdFx0dGhpcy50aWxlc1t0aGlzLmluZGV4KjQgKyAyXSA9IHNwcml0ZVJlY3Qud2lkdGg7XG5cdFx0dGhpcy50aWxlc1t0aGlzLmluZGV4KjQgKyAzXSA9IHNwcml0ZVJlY3QuaGVpZ2h0O1xuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1hdGgubWluKHRoaXMubWluSW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdHRoaXMubWF4SW5kZXggPSBNYXRoLm1heCh0aGlzLm1heEluZGV4LCB0aGlzLmluZGV4KTtcblx0XHR2YXIgbWFya2VyID0gdGhpcy5tYXJrZXJzW3RoaXMuaW5kZXhdIHx8IHRoaXMuX2NyZWF0ZU1hcmtlcih0aGlzLmluZGV4KTtcblx0XHR0aGlzLmluZGV4Kys7XG5cdFx0cmV0dXJuIG1hcmtlcjtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHR2YXIgYXJyYXlJbmRleCA9IG1hcmtlci5pbmRleCAqIDM7XG5cdFx0dGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleCArIDBdID0gU1RBUlRfVkFMVUU7XG5cdFx0dGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleCArIDFdID0gU1RBUlRfVkFMVUU7XG5cdFx0dGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleCArIDJdID0gU1RBUlRfVkFMVUU7XG5cblx0XHR0aGlzLm1pbkluZGV4ID0gTWF0aC5taW4odGhpcy5taW5JbmRleCwgbWFya2VyLmluZGV4KTtcblx0XHR0aGlzLm1heEluZGV4ID0gTWF0aC5tYXgodGhpcy5tYXhJbmRleCwgbWFya2VyLmluZGV4KTtcblxuXHRcdGlmKHRoaXMuaW5kZXggPiBtYXJrZXIuaW5kZXgpIHRoaXMuaW5kZXggPSBtYXJrZXIuaW5kZXg7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIG9ubHkgdXBkYXRlIHBvc2l0aW9ucyB0aGF0IGNoYW5nZWQgYnkgcGFzc2luZyBhIHJhbmdlXG5cdFx0dGhpcy5taW5JbmRleCA9ICh0aGlzLm1pbkluZGV4ID09IE1BWF9DT1VOVCkgPyAwIDogdGhpcy5taW5JbmRleDtcblx0XHR2YXIgbmVlZHNVcGRhdGUgPSB0aGlzLm1heEluZGV4ICE9IHRoaXMubWluSW5kZXg7XG5cblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5vZmZzZXQgPSB0aGlzLm1pbkluZGV4KjM7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCozKzMpLSh0aGlzLm1pbkluZGV4KjMpO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHR0aGlzLmNvbG9yc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5vZmZzZXQgPSB0aGlzLm1pbkluZGV4KjM7XG5cdFx0dGhpcy5jb2xvcnNBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCozKzMpLSh0aGlzLm1pbkluZGV4KjMpO1xuXHRcdHRoaXMuY29sb3JzQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqNDtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqNCs0KS0odGhpcy5taW5JbmRleCo0KTtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHRpZihuZWVkc1VwZGF0ZSkge1xuXHRcdFx0dGhpcy5nZW9tZXRyeS5jb21wdXRlQm91bmRpbmdCb3goKTtcblx0XHRcdHRoaXMuZ2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nU3BoZXJlKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1BWF9DT1VOVDtcblx0XHR0aGlzLm1heEluZGV4ID0gMDtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdHRoaXMubW91c2UueCA9IChldmVudC5jbGllbnRYIC8gdGhpcy53ZWJHbFZpZXcud2lkdGgpICogMiAtIDE7XG5cdFx0dGhpcy5tb3VzZS55ID0gLShldmVudC5jbGllbnRZIC8gdGhpcy53ZWJHbFZpZXcuaGVpZ2h0KSAqIDIgKyAxO1xuXG5cdFx0Ly8gY2hlY2sgaWYgd2UgaGl0IGFueSBvZiB0aGUgcG9pbnRzIGluIHRoZSBwYXJ0aWNsZSBzeXN0ZW1cblx0XHR0aGlzLnJheWNhc3Rlci5wYXJhbXMuUG9pbnRzLnRocmVzaG9sZCA9IDE2KjEvTWF0aC5wb3coMiwgdGhpcy53ZWJHbFZpZXcuc2NhbGUpO1xuXHRcdHRoaXMucmF5Y2FzdGVyLnNldEZyb21DYW1lcmEodGhpcy5tb3VzZSwgdGhpcy53ZWJHbFZpZXcuY2FtZXJhKTtcblx0XHR2YXIgaW50ZXJzZWN0aW9ucyA9IHRoaXMucmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHModGhpcy5yYXljYXN0T2JqZWN0cyk7XG5cdFx0aW50ZXJzZWN0aW9uID0gKGludGVyc2VjdGlvbnMubGVuZ3RoKSA+IDAgPyBpbnRlcnNlY3Rpb25zWzBdIDogbnVsbDtcblxuXHRcdC8vIHdlIGhpdCBzb21ldGhpbmdcblx0XHRpZihpbnRlcnNlY3Rpb24pIHtcblx0XHRcdC8vIGZpcnN0IHRpbWUgdG8gaG92ZXIgc29tZXRoaW5nXG5cdFx0XHRpZih0aGlzLmhvdmVyZWRNYXJrZXIgPT09IG51bGwpIHtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyID0gdGhpcy5tYXJrZXJzW2ludGVyc2VjdGlvbi5pbmRleF07XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlci5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnbW91c2VvdmVyJ30pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gd2UncmUgYWxyZWFkeSBob3ZlcmluZyBzb21ldGhpbmcgdGhlbiBzb21ldGhpbmcgZ290IGluIHRoZSB3YXlcblx0XHRcdGVsc2UgaWYodGhpcy5ob3ZlcmVkTWFya2VyLmluZGV4ICE9IGludGVyc2VjdGlvbi5pbmRleCkge1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ21vdXNlb3V0J30pO1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIgPSB0aGlzLm1hcmtlcnNbaW50ZXJzZWN0aW9uLmluZGV4XTtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdtb3VzZW92ZXInfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIHRoZXJlJ3Mgbm90aGluZyB1bmRlciB0aGUgbW91c2Vcblx0XHRlbHNlIHtcblx0XHRcdC8vIHdlIGxvc3Qgb3VyIG9iamVjdC4gYnllIGJ5ZVxuXHRcdFx0aWYodGhpcy5ob3ZlcmVkTWFya2VyICE9PSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlci5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnbW91c2VvdXQnfSk7XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlciA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdHdpbmRvdy5Qb2ludFJlbmRlcmVyID0gUG9pbnRSZW5kZXJlcjtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBQb2x5Z29uUmVuZGVyZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5cdFBvbHlnb25SZW5kZXJlci5wcm90b3R5cGUgPSBuZXcgT2JqZWN0UmVuZGVyZXIoKTtcblx0UG9seWdvblJlbmRlcmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE9iamVjdFJlbmRlcmVyO1xuXG5cdFBvbHlnb25SZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdHZhciBmZWF0dXJlcyA9IG9wdGlvbnMuZmVhdHVyZXMgfHwgW107XG5cdFx0dmFyIGZpbGxDb2xvciA9IChvcHRpb25zLmZpbGxDb2xvciAhPT0gbnVsbCAmJiBvcHRpb25zLmZpbGxDb2xvciAhPT0gdW5kZWZpbmVkKSA/IG9wdGlvbnMuZmlsbENvbG9yIDogMHgwMDAwRkY7XG5cdFx0dmFyIHN0cm9rZUNvbG9yID0gKG9wdGlvbnMuc3Ryb2tlQ29sb3IgIT09IG51bGwgJiYgb3B0aW9ucy5zdHJva2VDb2xvciAhPT0gdW5kZWZpbmVkKSA/IG9wdGlvbnMuc3Ryb2tlQ29sb3IgOiAweEZGRkZGRjtcblxuXHRcdGlmKGZlYXR1cmVzID09PSBudWxsIHx8IGZlYXR1cmVzLmxlbmd0aCA9PT0gMClcblx0XHRcdHJldHVybiBudWxsO1xuXG5cdFx0dmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XG5cdFx0dmFyIG91dGxpbmUgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcblx0XHR2YXIgdmVydGV4T2Zmc2V0ID0gZ2VvbWV0cnkudmVydGljZXMubGVuZ3RoO1xuXHRcdHZhciBudW1Qb2x5Z29ucyA9IDA7XG5cblx0XHRmb3IodmFyIGk9MDsgaTxmZWF0dXJlcy5sZW5ndGg7IGkrKyl7XG5cdFx0XHR2YXIgZmVhdHVyZSA9IGZlYXR1cmVzW2ldO1xuXHRcdFx0aWYoZmVhdHVyZS5sZW5ndGggPT09IDApIGNvbnRpbnVlO1xuXG5cdFx0XHQvLyBpdGVyYXRlIGV2ZXJ5IGZlYXR1cmUgd2hpY2ggc2hvdWxkIGNvbnRhaW4gYSBsaXN0IG9mIFxuXHRcdFx0Ly8gW2FycmF5IG9mIHBvbHlnb25zIFtvdXRlciBsb29wXSwgW2lubmVyIGxvb3AgMV0sIC4uLiwgW2lubmVyIGxvb3Agbl1dXG5cdFx0XHRmb3IodmFyIGo9MDsgajxmZWF0dXJlLmxlbmd0aDsgaisrKXtcblx0XHRcdFx0dmFyIHBvbHlnb24gID0gZmVhdHVyZVtqXTtcblx0XHRcdFx0Zm9yKHZhciBwPTA7IHA8cG9seWdvbi5sZW5ndGg7IHArKykge1xuXHRcdFx0XHRcdHZhciBsb29wID0gcG9seWdvbltwXTtcblx0XHRcdFx0XHR2YXIgcG9pbnRzID0gW10sIGhvbGVJbmRpY2VzID0gW10sIGhvbGVJbmRleCA9IDA7XG5cblx0XHRcdFx0XHRmb3IodmFyIGw9MDsgbDxsb29wLmxlbmd0aDsgbCsrKSB7XG5cdFx0XHRcdFx0XHR2YXIgY29vcmRpbmF0ZSA9IGxvb3BbbF07XG5cdFx0XHRcdFx0XHR2YXIgcG9pbnQgPSB7eDogY29vcmRpbmF0ZVswXSwgeTogY29vcmRpbmF0ZVsxXX07XG5cdFx0XHRcdFx0XHRwb2ludHMucHVzaChwb2ludC54KTtcblx0XHRcdFx0XHRcdHBvaW50cy5wdXNoKHBvaW50LnkpO1xuXG5cdFx0XHRcdFx0XHR2YXIgdmVydGV4ID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQueCwgcG9pbnQueSwgMTAwMSk7XG5cdFx0XHRcdFx0XHRnZW9tZXRyeS52ZXJ0aWNlcy5wdXNoKHZlcnRleCk7XG5cblx0XHRcdFx0XHRcdHZhciB2ZXJ0ZXgxID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQueCwgcG9pbnQueSwgMSk7XG5cdFx0XHRcdFx0XHRvdXRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MSk7XG5cblx0XHRcdFx0XHRcdHZhciBjb29yZDAsIHBvaW50MCwgdmVydGV4MDtcblx0XHRcdFx0XHRcdGlmKGwgPT0gbG9vcC5sZW5ndGgtMSkge1xuXHRcdFx0XHRcdFx0XHRjb29yZDAgPSBsb29wWzBdO1xuXHRcdFx0XHRcdFx0XHRwb2ludDAgPSB7eDogY29vcmQwWzBdLCB5OiBjb29yZDBbMV19O1xuXHRcdFx0XHRcdFx0XHR2ZXJ0ZXgwID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQwLngsIHBvaW50MC55LCAxKTtcblx0XHRcdFx0XHRcdFx0b3V0bGluZS52ZXJ0aWNlcy5wdXNoKHZlcnRleDApO1xuXHRcdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRcdGNvb3JkMCA9IGxvb3BbbCsxXTtcblx0XHRcdFx0XHRcdFx0cG9pbnQwID0ge3g6IGNvb3JkMFswXSwgeTogY29vcmQwWzFdfTtcblx0XHRcdFx0XHRcdFx0dmVydGV4MCA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50MC54LCBwb2ludDAueSwgMSk7XG5cdFx0XHRcdFx0XHRcdG91dGxpbmUudmVydGljZXMucHVzaCh2ZXJ0ZXgwKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZihwPjApIGhvbGVJbmRpY2VzLnB1c2goaG9sZUluZGV4KTtcblx0XHRcdFx0XHRob2xlSW5kZXggKz0gbG9vcC5sZW5ndGg7XG5cblx0XHRcdFx0XHR2YXIgdHJpcyA9IGVhcmN1dChwb2ludHMsIG51bGwsIDIpO1xuXHRcdFx0XHRcdGZvcih2YXIgaz0wOyBrPHRyaXMubGVuZ3RoOyBrKz0zKSB7XG5cdFx0XHRcdFx0XHQvLyAyLTEtMCBtZWFucyBmYWNlIHVwXG5cdFx0XHRcdFx0XHR2YXIgZmFjZSA9IG5ldyBUSFJFRS5GYWNlMyhcblx0XHRcdFx0XHRcdFx0dHJpc1trKzJdICsgdmVydGV4T2Zmc2V0LCBcblx0XHRcdFx0XHRcdFx0dHJpc1trKzFdICsgdmVydGV4T2Zmc2V0LCBcblx0XHRcdFx0XHRcdFx0dHJpc1trKzBdICsgdmVydGV4T2Zmc2V0XG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0Z2VvbWV0cnkuZmFjZXMucHVzaChmYWNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmVydGV4T2Zmc2V0ID0gZ2VvbWV0cnkudmVydGljZXMubGVuZ3RoO1xuXHRcdFx0XHRcdG51bVBvbHlnb25zKys7XG5cdFx0XHRcdH1cdFxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBjb3ZlcmFnZVBvbHlnb24gPSBuZXcgVEhSRUUuTWVzaChnZW9tZXRyeSwgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdGNvbG9yOiBmaWxsQ29sb3IsXG5cdFx0XHRvcGFjaXR5OiAwLjI1LCBcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxuXHRcdFx0ZGVwdGhXcml0ZTogZmFsc2UsXG5cdFx0XHRkZXB0aFRlc3Q6IGZhbHNlXG5cdFx0fSkpO1xuXG5cdFx0dmFyIG91dGxpbmVQb2x5Z29uID0gbmV3IFRIUkVFLkxpbmVTZWdtZW50cyhvdXRsaW5lLCBuZXcgVEhSRUUuTGluZUJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0Y29sb3I6IHN0cm9rZUNvbG9yLFxuXHRcdFx0bGluZXdpZHRoOiAyLFxuXHRcdFx0b3BhY2l0eTogMC4yNSwgXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pKTtcblxuXHRcdHJldHVybiB7c2hhcGU6IGNvdmVyYWdlUG9seWdvbiwgb3V0bGluZTogb3V0bGluZVBvbHlnb259O1xuXHR9O1xuXG5cdHdpbmRvdy5Qb2x5Z29uUmVuZGVyZXIgPSBQb2x5Z29uUmVuZGVyZXI7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgdnNoYWRlciA9IChmdW5jdGlvbiAoKSB7Lypcblx0XHRhdHRyaWJ1dGUgdmVjNCB0aWxlO1xuXHRcdHZhcnlpbmcgdmVjMiB2VXY7XG5cdFx0dmFyeWluZyB2ZWM0IHZUaWxlO1xuXHRcdHZvaWQgbWFpbigpIHtcblx0XHRcdHZlYzQgbXZQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7XG5cdFx0XHRnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBtdlBvc2l0aW9uO1xuXHRcdFx0dlV2ID0gdXY7XG5cdFx0XHR2VGlsZSA9IHRpbGU7XG5cdFx0fVxuXHQqL30pLnRvU3RyaW5nKCkubWF0Y2goL1teXSpcXC9cXCooW15dKilcXCpcXC9cXH0kLylbMV07XG5cblx0dmFyIGZzaGFkZXIgPSAoZnVuY3Rpb24gKCkgey8qXG5cdFx0dW5pZm9ybSBzYW1wbGVyMkQgdGV4MTtcblx0XHR1bmlmb3JtIGZsb2F0IGFscGhhO1xuXHRcdHZhcnlpbmcgdmVjMiB2VXY7XG5cdFx0dmFyeWluZyB2ZWM0IHZUaWxlO1xuXHRcdHZvaWQgbWFpbigpIHtcblx0XHRcdHZlYzIgdXYgPSB2VGlsZS54eSArIHZUaWxlLnp3ICogdlV2O1xuXHRcdFx0Z2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHRleDEsIHV2KSAqIHZlYzQoMSwgMSwgMSwgYWxwaGEpO1xuXHRcdH1cblx0Ki99KS50b1N0cmluZygpLm1hdGNoKC9bXl0qXFwvXFwqKFteXSopXFwqXFwvXFx9JC8pWzFdO1xuXG5cdHZhciBNQVhfQ09VTlQgPSBNYXRoLnBvdygyLDMyKSAtIDE7XG5cdHZhciBTVEFSVF9WQUxVRSA9IC05OTk5OS4wO1xuXG5cdHZhciBQT1NJVElPTl9JTlRFUlZBTCA9IDMqNDsgLy8gMyBkaW1lbnNpb25zIHBlciB2ZXJ0ZXgsIDQgdmVydGV4IHBlciBzcHJpdGVcblx0dmFyIElOREVYX0lOVEVSVkFMID0gMyoyOyAvLyAzIGluZGV4IHBlciB0cmksIDIgdHJpIHBlciBzcHJpdGVcblx0dmFyIFVWX0lOVEVSVkFMID0gMio0OyAvLyAyIHV2IHBlciB2ZXJ0ZXgsIDQgdmVydGV4IHBlciBzcHJpdGVcblx0dmFyIFRJTEVfSU5URVJWQUwgPSA0KjQ7IC8vIG9mZnNldCh4LHkpICsgc2l6ZSh3aWR0aCwgaGVpZ3QpIHBlciB2ZXJ0ZXgsIDQgdmVydGV4IHBlciBzcHJpdGVcblxuXHR2YXIgU3ByaXRlUmVuZGVyZXIgPSBmdW5jdGlvbigpe1xuXHRcdHRoaXMubWluSW5kZXggPSBNQVhfQ09VTlQ7XG5cdFx0dGhpcy5tYXhJbmRleCA9IDA7XG5cdFx0dGhpcy5pbmRleCA9IDA7XG5cdFx0dGhpcy5zcHJpdGVzID0gW107XG5cdFx0dGhpcy5vcGFjaXR5ID0gMC44O1xuXHR9O1xuXG5cdFNwcml0ZVJlbmRlcmVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5wb3NpdGlvbnMgPSBuZXcgRmxvYXQzMkFycmF5KDEwMjQqUE9TSVRJT05fSU5URVJWQUwpOyBcblx0XHR0aGlzLnBvc2l0aW9ucy5maWxsKFNUQVJUX1ZBTFVFKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy5wb3NpdGlvbnMsIDMpO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLmluZGljZXMgPSBuZXcgVWludDE2QXJyYXkoMTAyNCpJTkRFWF9JTlRFUlZBTCk7IFxuXHRcdHRoaXMuaW5kaWNlc0F0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy5pbmRpY2VzLCAxKTtcblx0XHR0aGlzLmluZGljZXNBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMudXYgPSBuZXcgRmxvYXQzMkFycmF5KDEwMjQqVVZfSU5URVJWQUwpOyBcblx0XHR0aGlzLnV2QXR0cmlidXRlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh0aGlzLnV2LCAyKTsgXG5cdFx0dGhpcy51dkF0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy50aWxlcyA9IG5ldyBGbG9hdDMyQXJyYXkoMTAyNCpUSUxFX0lOVEVSVkFMKTsgXG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy50aWxlcywgNCk7IFxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMuZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcblx0XHR0aGlzLmdlb21ldHJ5LnNldEluZGV4KHRoaXMuaW5kaWNlc0F0dHJpYnV0ZSk7XG5cdFx0dGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgdGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCd1dicsIHRoaXMudXZBdHRyaWJ1dGUpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCd0aWxlJywgdGhpcy50aWxlc0F0dHJpYnV0ZSk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gbmV3IER5bmFtaWNTcHJpdGVTaGVldCg0MDk2LCA0MDk2KTtcblx0XHR0aGlzLm1hdGVyaWFsID0gbmV3IFRIUkVFLlNoYWRlck1hdGVyaWFsKCB7XG5cdFx0XHR1bmlmb3Jtczoge1xuXHRcdFx0XHR0ZXgxOiB7IHR5cGU6IFwidFwiLCB2YWx1ZTogdGhpcy5zcHJpdGVTaGVldC50ZXh0dXJlIH0sXG5cdFx0XHRcdGFscGhhOiB7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5vcGFjaXR5IH1cblx0XHRcdH0sXG5cdFx0XHR2ZXJ0ZXhTaGFkZXI6IHZzaGFkZXIsXG5cdFx0XHRmcmFnbWVudFNoYWRlcjogZnNoYWRlclxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zY2VuZU9iamVjdCA9IG5ldyBUSFJFRS5NZXNoKHRoaXMuZ2VvbWV0cnksIHRoaXMubWF0ZXJpYWwpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0U3ByaXRlUmVuZGVyZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgcG9zaXRpb25JbmRleCA9IHRoaXMuaW5kZXgqUE9TSVRJT05fSU5URVJWQUw7XG5cdFx0d2hpbGUocG9zaXRpb25JbmRleCA8IHRoaXMucG9zaXRpb25zLmxlbmd0aCAmJiB0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4XSAhPT0gU1RBUlRfVkFMVUUpXG5cdFx0XHRwb3NpdGlvbkluZGV4ID0gKyt0aGlzLmluZGV4KlBPU0lUSU9OX0lOVEVSVkFMO1xuXG5cdFx0aWYocG9zaXRpb25JbmRleCA+PSB0aGlzLnBvc2l0aW9ucy5sZW5ndGgpe1xuXHRcdFx0Ly8hVE9ETzogRXhwYW5kIHBvaW50cyBidWZmZXJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1Nwcml0ZVJlbmRlcmVyXSBSdW4gb3V0IG9mIHBvaW50cyEhIVwiKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgaW1hZ2UgPSBvcHRpb25zLmltYWdlO1xuXHRcdHZhciBpbWFnZU5hbWUgPSBvcHRpb25zLmltYWdlTmFtZTtcblx0XHR2YXIgc3ByaXRlID0gdGhpcy5zcHJpdGVTaGVldC5nZXQoaW1hZ2VOYW1lKTtcblx0XHRpZighc3ByaXRlKSB7XG5cdFx0XHRzcHJpdGUgPSB0aGlzLnNwcml0ZVNoZWV0LmFkZChpbWFnZU5hbWUsIGltYWdlKTtcblx0XHRcdGlmKCFzcHJpdGUpIHtcblx0XHRcdFx0Ly8hVE9ETzogQ3JlYXRlIGEgbmV3IHNwcml0ZSBzaGVldCBpZiB0aGlzIG9uZSBnZXRzIGZ1bGxcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbU3ByaXRlUmVuZGVyZXJdIFNwcml0ZVNoZWV0IGFscmVhZHkgZnVsbC5cIik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0b3B0aW9ucy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24gfHwge3g6MCwgeTowLCB6OjB9O1xuXHRcdG9wdGlvbnMud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDI1Njtcblx0XHRvcHRpb25zLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDI1Njtcblx0XHRvcHRpb25zLmltYWdlTmFtZSA9IG9wdGlvbnMuaWNvbiB8fCBcInJlZC1kb3RcIjtcblxuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyAwXSA9IG9wdGlvbnMucG9zaXRpb24ueDtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgMV0gPSBvcHRpb25zLnBvc2l0aW9uLnk7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDJdID0gb3B0aW9ucy5wb3NpdGlvbi56O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyAzXSA9IG9wdGlvbnMucG9zaXRpb24ueCArIG9wdGlvbnMud2lkdGg7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDRdID0gb3B0aW9ucy5wb3NpdGlvbi55O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA1XSA9IG9wdGlvbnMucG9zaXRpb24uejtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgNl0gPSBvcHRpb25zLnBvc2l0aW9uLng7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDddID0gb3B0aW9ucy5wb3NpdGlvbi55ICsgb3B0aW9ucy5oZWlnaHQ7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDhdID0gb3B0aW9ucy5wb3NpdGlvbi56O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA5XSA9IG9wdGlvbnMucG9zaXRpb24ueCArIG9wdGlvbnMud2lkdGg7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArMTBdID0gb3B0aW9ucy5wb3NpdGlvbi55ICsgb3B0aW9ucy5oZWlnaHQ7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArMTFdID0gb3B0aW9ucy5wb3NpdGlvbi56O1xuXG5cdFx0dmFyIGFycmF5SW5kZXggPSB0aGlzLmluZGV4KklOREVYX0lOVEVSVkFMO1xuXHRcdHRoaXMuaW5kaWNlc1thcnJheUluZGV4ICsgMF0gPSB0aGlzLmluZGV4KjQgKyAwO1xuXHRcdHRoaXMuaW5kaWNlc1thcnJheUluZGV4ICsgMV0gPSB0aGlzLmluZGV4KjQgKyAyO1xuXHRcdHRoaXMuaW5kaWNlc1thcnJheUluZGV4ICsgMl0gPSB0aGlzLmluZGV4KjQgKyAxO1xuXHRcdHRoaXMuaW5kaWNlc1thcnJheUluZGV4ICsgM10gPSB0aGlzLmluZGV4KjQgKyAxO1xuXHRcdHRoaXMuaW5kaWNlc1thcnJheUluZGV4ICsgNF0gPSB0aGlzLmluZGV4KjQgKyAyO1xuXHRcdHRoaXMuaW5kaWNlc1thcnJheUluZGV4ICsgNV0gPSB0aGlzLmluZGV4KjQgKyAzO1xuXG5cdFx0dmFyIHV2SW5kZXggPSB0aGlzLmluZGV4KlVWX0lOVEVSVkFMO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDBdID0gMDtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyAxXSA9IDA7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgMl0gPSAxO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDNdID0gMDtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyA0XSA9IDA7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgNV0gPSAxO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDZdID0gMTtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyA3XSA9IDE7XG5cblx0XHR2YXIgdCA9IHRoaXMuaW5kZXgqVElMRV9JTlRFUlZBTDtcblx0XHR0aGlzLnRpbGVzW3QrMF0gPSB0aGlzLnRpbGVzW3QrNF0gPSB0aGlzLnRpbGVzW3QrOF0gPSB0aGlzLnRpbGVzW3QrMTJdID0gc3ByaXRlLm5vcm1hbFJlY3QueDtcblx0XHR0aGlzLnRpbGVzW3QrMV0gPSB0aGlzLnRpbGVzW3QrNV0gPSB0aGlzLnRpbGVzW3QrOV0gPSB0aGlzLnRpbGVzW3QrMTNdID0gc3ByaXRlLm5vcm1hbFJlY3QueTtcblx0XHR0aGlzLnRpbGVzW3QrMl0gPSB0aGlzLnRpbGVzW3QrNl0gPSB0aGlzLnRpbGVzW3QrMTBdID0gdGhpcy50aWxlc1t0KzE0XSA9IHNwcml0ZS5ub3JtYWxSZWN0LndpZHRoO1xuXHRcdHRoaXMudGlsZXNbdCszXSA9IHRoaXMudGlsZXNbdCs3XSA9IHRoaXMudGlsZXNbdCsxMV0gPSB0aGlzLnRpbGVzW3QrMTVdID0gc3ByaXRlLm5vcm1hbFJlY3QuaGVpZ2h0O1xuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1hdGgubWluKHRoaXMubWluSW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdHRoaXMubWF4SW5kZXggPSBNYXRoLm1heCh0aGlzLm1heEluZGV4LCB0aGlzLmluZGV4KTtcblx0XHRyZXR1cm4ge2luZGV4OiB0aGlzLmluZGV4KyssIG5hbWU6IGltYWdlTmFtZX07XG5cdH07XG5cblx0U3ByaXRlUmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHNwcml0ZSkge1xuXHRcdHZhciBwb3NpdGlvbkluZGV4ID0gc3ByaXRlLmluZGV4KlBPU0lUSU9OX0lOVEVSVkFMO1xuXHRcdGZvcih2YXIgaT0wOyBpPFBPU0lUSU9OX0lOVEVSVkFMOyBpKyspIHtcblx0XHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyBpXSA9IFNUQVJUX1ZBTFVFO1xuXHRcdH1cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlbW92ZShzcHJpdGUubmFtZSk7XG5cblx0XHR0aGlzLm1pbkluZGV4ID0gTWF0aC5taW4odGhpcy5taW5JbmRleCwgc3ByaXRlLmluZGV4KTtcblx0XHR0aGlzLm1heEluZGV4ID0gTWF0aC5tYXgodGhpcy5tYXhJbmRleCwgc3ByaXRlLmluZGV4KTtcblxuXHRcdGlmKHRoaXMuaW5kZXggPiBzcHJpdGUuaW5kZXgpIHRoaXMuaW5kZXggPSBzcHJpdGUuaW5kZXg7XG5cdH07XG5cblx0U3ByaXRlUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbigpIHtcblx0XHQvLyBvbmx5IHVwZGF0ZSBwb3NpdGlvbnMgdGhhdCBjaGFuZ2VkIGJ5IHBhc3NpbmcgYSByYW5nZVxuXHRcdHRoaXMubWluSW5kZXggPSAodGhpcy5taW5JbmRleCA9PSBNQVhfQ09VTlQpID8gMCA6IHRoaXMubWluSW5kZXg7XG5cdFx0dmFyIG5lZWRzVXBkYXRlID0gdGhpcy5tYXhJbmRleCAhPSB0aGlzLm1pbkluZGV4O1xuXG5cdFx0dmFyIHAgPSBQT1NJVElPTl9JTlRFUlZBTDtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5vZmZzZXQgPSB0aGlzLm1pbkluZGV4KnA7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCpwK3ApLSh0aGlzLm1pbkluZGV4KnApO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHR2YXIgaSA9IElOREVYX0lOVEVSVkFMO1xuXHRcdHRoaXMuaW5kaWNlc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5vZmZzZXQgPSB0aGlzLm1pbkluZGV4Kmk7XG5cdFx0dGhpcy5pbmRpY2VzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqaStpKS0odGhpcy5taW5JbmRleCppKTtcblx0XHR0aGlzLmluZGljZXNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHZhciB1ID0gVVZfSU5URVJWQUw7XG5cdFx0dGhpcy51dkF0dHJpYnV0ZS51cGRhdGVSYW5nZS5vZmZzZXQgPSB0aGlzLm1pbkluZGV4KnU7XG5cdFx0dGhpcy51dkF0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KnUrdSktKHRoaXMubWluSW5kZXgqdSk7XG5cdFx0dGhpcy51dkF0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0dmFyIHQgPSBUSUxFX0lOVEVSVkFMO1xuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCp0O1xuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCp0K3QpLSh0aGlzLm1pbkluZGV4KnQpO1xuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdGlmKG5lZWRzVXBkYXRlKSB7XG5cdFx0XHR0aGlzLmdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXHRcdFx0dGhpcy5nZW9tZXRyeS5jb21wdXRlQm91bmRpbmdTcGhlcmUoKTtcblx0XHR9XG5cblx0XHR0aGlzLm1pbkluZGV4ID0gTUFYX0NPVU5UO1xuXHRcdHRoaXMubWF4SW5kZXggPSAwO1xuXHR9O1xuXG5cdHdpbmRvdy5TcHJpdGVSZW5kZXJlciA9IFNwcml0ZVJlbmRlcmVyO1xufSgpKTtcbiIsIihmdW5jdGlvbigpe1xuXHR2YXIgU3ByaXRlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdHRoaXMubmFtZSA9IGRhdGEubmFtZTtcblx0XHR2YXIgeCA9IGRhdGEueCxcblx0XHRcdHkgPSBkYXRhLnksXG5cdFx0XHR3aWR0aCA9IGRhdGEud2lkdGgsXG5cdFx0XHRoZWlnaHQgPSBkYXRhLmhlaWdodDtcblx0XHR0aGlzLnJlY3QgPSBuZXcgUmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuXHR9O1xuXG5cdFNwcml0ZS5wcm90b3R5cGUuY29tcHV0ZU5vcm1hbCA9IGZ1bmN0aW9uKG1heFdpZHRoLCBtYXhIZWlnaHQpIHtcblx0XHR0aGlzLm5vcm1hbFJlY3QgPSB0aGlzLnJlY3QuZ2V0Tm9ybWFsaXplZFJlY3QobWF4V2lkdGgsIG1heEhlaWdodCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0dmFyIFNwcml0ZVNoZWV0ID0gZnVuY3Rpb24odGV4dHVyZSwgc3ByaXRlcykge1xuXHRcdHRoaXMudGV4dHVyZSA9IHRleHR1cmU7XG5cdFx0dGhpcy5zcHJpdGVzID0ge307XG5cblx0XHRmb3IodmFyIGk9MDsgaTxzcHJpdGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLnNwcml0ZXNbc3ByaXRlc1tpXS5uYW1lXSA9IG5ldyBTcHJpdGUoc3ByaXRlc1tpXSlcblx0XHRcdFx0LmNvbXB1dGVOb3JtYWwodGV4dHVyZS5pbWFnZS53aWR0aCwgdGV4dHVyZS5pbWFnZS5oZWlnaHQpO1xuXHRcdH1cblx0fTtcblxuXHRTcHJpdGVTaGVldC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oc3ByaXRlTmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnNwcml0ZXNbc3ByaXRlTmFtZV07XG5cdH07XG5cblx0d2luZG93LlNwcml0ZVNoZWV0ID0gU3ByaXRlU2hlZXQ7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgQ1NTX1RSQU5TRk9STSA9IChmdW5jdGlvbigpIHtcblx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0dmFyIHByb3BzID0gW1xuXHRcdFx0J3RyYW5zZm9ybScsXG5cdFx0XHQnV2Via2l0VHJhbnNmb3JtJyxcblx0XHRcdCdNb3pUcmFuc2Zvcm0nLFxuXHRcdFx0J09UcmFuc2Zvcm0nLFxuXHRcdFx0J21zVHJhbnNmb3JtJ1xuXHRcdF07XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHByb3AgPSBwcm9wc1tpXTtcblx0XHRcdGlmIChkaXYuc3R5bGVbcHJvcF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyZXR1cm4gcHJvcDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHByb3BzWzBdO1xuXHR9KSgpO1xuXG5cdHZhciBXZWJHTFZpZXcgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5PcnRob2dyYXBoaWNDYW1lcmEoMCwgMjU1LCAwLCAyNTUsIC0zMDAwLCAzMDAwKTtcblx0XHR0aGlzLmNhbWVyYS5wb3NpdGlvbi56ID0gMTAwMDtcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG5cdFx0dGhpcy5zY2VuZU1hc2sgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoe1xuXHRcdFx0YWxwaGE6IHRydWUsXG5cdFx0XHRhbnRpYWxpYXNpbmc6IHRydWUsXG5cdFx0XHRjbGVhckNvbG9yOiAweDAwMDAwMCxcblx0XHRcdGNsZWFyQWxwaGE6IDBcblxuXHRcdH0pO1xuXHRcdHRoaXMucmVuZGVyZXIuc2V0UGl4ZWxSYXRpbyh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyk7XG5cdFx0dGhpcy5yZW5kZXJlci5hdXRvQ2xlYXIgPSBmYWxzZTtcblx0XHR0aGlzLmNvbnRleHQgPSB0aGlzLnJlbmRlcmVyLmNvbnRleHQ7XG5cdFx0dGhpcy5hbmltYXRpb25GcmFtZSA9IG51bGw7XG5cdFx0dGhpcy5vYmplY3RSZW5kZXJlcnMgPSBbXTtcblx0XHR0aGlzLm51bU1hc2tzID0gMDtcblxuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbWFwID0gdGhpcy5tYXA7XG5cdFx0XHR2YXIgYm91bmRzID0gbWFwLmdldEJvdW5kcygpO1xuXHRcdFx0dmFyIHRvcExlZnQgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxuXHRcdFx0XHRib3VuZHMuZ2V0Tm9ydGhFYXN0KCkubGF0KCksXG5cdFx0XHRcdGJvdW5kcy5nZXRTb3V0aFdlc3QoKS5sbmcoKVxuXHRcdFx0KTtcblxuXHRcdFx0Ly8gVHJhbnNsYXRlIHRoZSB3ZWJnbCBjYW52YXMgYmFzZWQgb24gbWFwcydzIGJvdW5kc1xuXHRcdFx0dmFyIGNhbnZhcyA9IHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudDtcblx0XHRcdHZhciBwb2ludCA9IHRoaXMuZ2V0UHJvamVjdGlvbigpLmZyb21MYXRMbmdUb0RpdlBpeGVsKHRvcExlZnQpO1xuXHRcdFx0Y2FudmFzLnN0eWxlW0NTU19UUkFOU0ZPUk1dID0gJ3RyYW5zbGF0ZSgnICsgTWF0aC5yb3VuZChwb2ludC54KSArICdweCwnICsgTWF0aC5yb3VuZChwb2ludC55KSArICdweCknO1xuXG5cdFx0XHQvLyBSZXNpemUgdGhlIHJlbmRlcmVyIC8gY2FudmFzIGJhc2VkIG9uIHNpemUgb2YgdGhlIG1hcFxuXHRcdFx0dmFyIGRpdiA9IG1hcC5nZXREaXYoKSwgXG5cdFx0XHRcdHdpZHRoID0gZGl2LmNsaWVudFdpZHRoLCBcblx0XHRcdFx0aGVpZ2h0ID0gZGl2LmNsaWVudEhlaWdodDtcblxuXHRcdFx0aWYgKHdpZHRoICE9PSB0aGlzLndpZHRoIHx8IGhlaWdodCAhPT0gdGhpcy5oZWlnaHQpe1xuXHRcdFx0XHR0aGlzLndpZHRoID0gd2lkdGg7XG5cdFx0XHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdFx0XHR0aGlzLnJlbmRlcmVyLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFVwZGF0ZSBjYW1lcmEgYmFzZWQgb24gbWFwIHpvb20gYW5kIHBvc2l0aW9uXG5cdFx0XHR2YXIgem9vbSA9IG1hcC5nZXRab29tKCk7XG5cdFx0XHR2YXIgc2NhbGUgPSBNYXRoLnBvdygyLCB6b29tKTtcblx0XHRcdHZhciBvZmZzZXQgPSBtYXAuZ2V0UHJvamVjdGlvbigpLmZyb21MYXRMbmdUb1BvaW50KHRvcExlZnQpO1xuXG5cdFx0XHR0aGlzLmNhbWVyYS5wb3NpdGlvbi54ID0gb2Zmc2V0Lng7XG5cdFx0XHR0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gb2Zmc2V0Lnk7XG5cblx0XHRcdHRoaXMuc2NhbGUgPSB6b29tO1xuXHRcdFx0dGhpcy5jYW1lcmEuc2NhbGUueCA9IHRoaXMud2lkdGggLyAyNTYgLyBzY2FsZTtcblx0XHRcdHRoaXMuY2FtZXJhLnNjYWxlLnkgPSB0aGlzLmhlaWdodCAvIDI1NiAvIHNjYWxlO1xuXHRcdH07XG5cblx0XHR0aGlzLmRyYXcgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0aW9uRnJhbWUpO1xuXHRcdFx0dGhpcy5hbmltYXRpb25GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmRlZmVycmVkUmVuZGVyLmJpbmQodGhpcykpO1xuXHRcdH07XG5cblx0XHR0aGlzLmRlZmVycmVkUmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXG5cdFx0XHR2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dCwgcmVuZGVyZXIgPSB0aGlzLnJlbmRlcmVyO1xuXHRcdFx0dmFyIG1hc2tFbmFibGVkID0gdGhpcy5udW1NYXNrcyA+IDA7XG5cblx0XHRcdGlmKG1hc2tFbmFibGVkKSB7XG5cdFx0XHRcdGNvbnRleHQuY29sb3JNYXNrKCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSApO1xuXHRcdFx0XHRjb250ZXh0LmRlcHRoTWFzayggZmFsc2UgKTtcblxuXHRcdFx0XHRjb250ZXh0LmVuYWJsZShjb250ZXh0LlNURU5DSUxfVEVTVCk7XG5cdFx0XHRcdGNvbnRleHQuc3RlbmNpbE9wKGNvbnRleHQuUkVQTEFDRSwgY29udGV4dC5SRVBMQUNFLCBjb250ZXh0LlJFUExBQ0UpO1xuXHRcdFx0XHRjb250ZXh0LnN0ZW5jaWxGdW5jKGNvbnRleHQuQUxXQVlTLCAwLCAweGZmZmZmZmZmKTtcblx0XHRcdFx0Y29udGV4dC5jbGVhclN0ZW5jaWwoMSk7XG5cblx0XHRcdFx0dGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5zY2VuZU1hc2ssIHRoaXMuY2FtZXJhLCBudWxsLCB0cnVlKTtcblxuXHRcdFx0XHRjb250ZXh0LmNvbG9yTWFzayh0cnVlLCB0cnVlLCB0cnVlLCB0cnVlKTtcblx0XHRcdFx0Y29udGV4dC5kZXB0aE1hc2sodHJ1ZSApO1xuXG5cdFx0XHRcdGNvbnRleHQuc3RlbmNpbEZ1bmMoY29udGV4dC5FUVVBTCwgMCwgMHhmZmZmZmZmZik7ICAvLyBkcmF3IGlmID09IDBcblx0XHRcdFx0Y29udGV4dC5zdGVuY2lsT3AoY29udGV4dC5LRUVQLCBjb250ZXh0LktFRVAsIGNvbnRleHQuS0VFUCk7XG5cdFx0XHR9XG5cblx0XHRcdGZvcih2YXIgaT0wOyBpPHRoaXMub2JqZWN0UmVuZGVyZXJzLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHR0aGlzLm9iamVjdFJlbmRlcmVyc1tpXS5kcmF3KCk7XG5cblx0XHRcdHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuc2NlbmUsIHRoaXMuY2FtZXJhLCBudWxsLCAhbWFza0VuYWJsZWQpO1xuXG5cdFx0XHRpZihtYXNrRW5hYmxlZCkge1xuXHRcdFx0XHRjb250ZXh0LmRpc2FibGUoY29udGV4dC5TVEVOQ0lMX1RFU1QpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdyZW5kZXInfSk7XG5cdFx0fTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlID0gXy5leHRlbmQobmV3IGdvb2dsZS5tYXBzLk92ZXJsYXlWaWV3KCksIG5ldyBUSFJFRS5FdmVudERpc3BhdGNoZXIoKSk7XG5cdFdlYkdMVmlldy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBXZWJHTFZpZXc7XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5vbkFkZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZ2V0UGFuZXMoKS5vdmVybGF5TGF5ZXIuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnYWRkZWRfdG9fZG9tJ30pO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUub25SZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgY2FudmFzID0gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50O1xuXHRcdHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5jYW52YXMpO1xuXHRcdHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdyZW1vdmVkX2Zyb21fZG9tJ30pO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIVRPRE86IFJlbW92ZSBkZXBlbmRlbmN5IG9mIFBvaW50UmVuZGVyZXIgZnJvbSBXZWJHTFZpZXdcblx0XHR0aGlzLnBvaW50UmVuZGVyZXIgPSBuZXcgUG9pbnRSZW5kZXJlcih0aGlzKS5pbml0KCk7XG5cdFx0dGhpcy5zY2VuZS5hZGQodGhpcy5wb2ludFJlbmRlcmVyLnNjZW5lT2JqZWN0KTtcblx0XHR0aGlzLnNwcml0ZVJlbmRlcmVyID0gbmV3IFNwcml0ZVJlbmRlcmVyKCkuaW5pdCgpO1xuXHRcdHRoaXMuc2NlbmUuYWRkKHRoaXMuc3ByaXRlUmVuZGVyZXIuc2NlbmVPYmplY3QpO1xuXHRcdHRoaXMucG9seWdvblJlbmRlcmVyID0gbmV3IFBvbHlnb25SZW5kZXJlcigpLmluaXQoKTtcblx0XHQvLyBhZGQgdGhlbSB0byBhbiBhcnJheSBzbyB3ZSBjYW4gZHJhdy91cGRhdGUgdGhlbSBhbGwgbGF0ZXJcblx0XHR0aGlzLm9iamVjdFJlbmRlcmVycy5wdXNoKHRoaXMucG9pbnRSZW5kZXJlcik7XG5cdFx0dGhpcy5vYmplY3RSZW5kZXJlcnMucHVzaCh0aGlzLnBvbHlnb25SZW5kZXJlcik7XG5cdFx0dGhpcy5vYmplY3RSZW5kZXJlcnMucHVzaCh0aGlzLnNwcml0ZVJlbmRlcmVyKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jaGFuZ2VIYW5kbGVyID0gZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsICdib3VuZHNfY2hhbmdlZCcsIHRoaXMuZHJhdy5iaW5kKHRoaXMpKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0Z29vZ2xlLm1hcHMuZXZlbnQucmVtb3ZlTGlzdGVuZXIodGhpcy5jaGFuZ2VIYW5kbGVyKTtcblx0XHR0aGlzLmNoYW5nZUhhbmRsZXIgPSBudWxsO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkT2JqZWN0ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lLmFkZChnZW9tZXRyeSk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVPYmplY3QgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdHRoaXMuc2NlbmUucmVtb3ZlKGdlb21ldHJ5KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmFkZFBvaW50ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLnBvaW50UmVuZGVyZXIuYWRkKG9wdGlvbnMpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlUG9pbnQgPSBmdW5jdGlvbihwb2ludCkge1xuXHRcdHRoaXMucG9pbnRSZW5kZXJlci5yZW1vdmUocG9pbnQpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkU3ByaXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLnNwcml0ZVJlbmRlcmVyLmFkZChvcHRpb25zKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLnJlbW92ZVNwcml0ZSA9IGZ1bmN0aW9uKHNwcml0ZSkge1xuXHRcdHRoaXMuc3ByaXRlUmVuZGVyZXIucmVtb3ZlKHNwcml0ZSk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5jcmVhdGVHZW9tZXRyeSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgZ2VvbWV0cnkgPSB0aGlzLnBvbHlnb25SZW5kZXJlci5jcmVhdGUob3B0aW9ucywgdGhpcy5zY2VuZSk7XG5cdFx0aWYoZ2VvbWV0cnkgIT09IG51bGwpIHtcblx0XHRcdHRoaXMuYWRkR2VvbWV0cnkoZ2VvbWV0cnkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZ2VvbWV0cnk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZS5hZGQoZ2VvbWV0cnkuc2hhcGUpO1xuXHRcdHRoaXMuc2NlbmUuYWRkKGdlb21ldHJ5Lm91dGxpbmUpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlR2VvbWV0cnkgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdHRoaXMuc2NlbmUucmVtb3ZlKGdlb21ldHJ5LnNoYXBlKTtcblx0XHR0aGlzLnNjZW5lLnJlbW92ZShnZW9tZXRyeS5vdXRsaW5lKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmRlc3Ryb3lHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0ZGVsZXRlIGdlb21ldHJ5LnNoYXBlO1xuXHRcdGRlbGV0ZSBnZW9tZXRyeS5vdXRsaW5lO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuY3JlYXRlTWFzayA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgbWFzayA9IHRoaXMucG9seWdvblJlbmRlcmVyLmNyZWF0ZShvcHRpb25zKTtcblx0XHRpZihtYXNrICE9PSBudWxsKSB7XG5cdFx0XHR0aGlzLmFkZE1hc2sobWFzayk7XG5cdFx0XHR0aGlzLm51bU1hc2tzKys7XG5cdFx0fVxuXHRcdHJldHVybiBtYXNrO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkTWFzayA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZU1hc2suYWRkKGdlb21ldHJ5LnNoYXBlKTtcblx0XHR0aGlzLnNjZW5lTWFzay5hZGQoZ2VvbWV0cnkub3V0bGluZSk7XG5cdFx0dGhpcy5udW1NYXNrcysrO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlTWFzayA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZU1hc2sucmVtb3ZlKGdlb21ldHJ5LnNoYXBlKTtcblx0XHR0aGlzLnNjZW5lTWFzay5yZW1vdmUoZ2VvbWV0cnkub3V0bGluZSk7XG5cdFx0dGhpcy5udW1NYXNrcy0tO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuZGVzdHJveU1hc2sgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdGRlbGV0ZSBnZW9tZXRyeS5zaGFwZTtcblx0XHRkZWxldGUgZ2VvbWV0cnkub3V0bGluZTtcblx0fTtcblxuXHR3aW5kb3cuV2ViR0xWaWV3ID0gV2ViR0xWaWV3O1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIGh0dHAgPSB7fTtcblxuXHRodHRwLmdldCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuXHRcdHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcblx0XHR2YXIgcmVzcG9uc2VUeXBlID0gb3B0aW9ucy5yZXNwb25zZVR5cGU7XG5cdFx0aWYocmVzcG9uc2VUeXBlID09PSAnYmxvYicpIHtcblx0XHRcdHZhciBpbWFnZSA9ICQoXCI8aW1nIC8+XCIpLmF0dHIoJ3NyYycsIHVybCkub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtkYXRhOmltYWdlWzBdfSk7XG5cdFx0XHR9KTtcblx0XHR9ZWxzZXtcblx0XHRcdCQuYWpheCh1cmwsIG9wdGlvbnMpXG5cdFx0XHRcdC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywgeGhyKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtkYXRhOmRhdGEsIHN0YXR1czpzdGF0dXMsIHhocjp4aHJ9KTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmVycm9yKGZ1bmN0aW9uKHhociwgc3RhdHVzLCBlcnJvcil7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KHt4aHI6eGhyLCBzdGF0dXM6c3RhdHVzLCBlcnJvcjplcnJvcn0pO1xuXHRcdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdH07XG5cblx0d2luZG93Lmh0dHAgPSBodHRwO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblxuXHR2YXIgTUVSQ0FUT1JfUkFOR0UgPSAyNTY7XG5cblx0ZnVuY3Rpb24gY29udmVydFBvaW50VG9UaWxlKGxhdExuZywgem9vbSwgcHJvamVjdGlvbikge1xuXHRcdHZhciB3b3JsZENvb3JkaW5hdGUgPSBwcm9qZWN0aW9uLmZyb21MYXRMbmdUb1BvaW50KGxhdExuZyk7XG5cdFx0dmFyIHBpeGVsQ29vcmRpbmF0ZSA9IHt4OiB3b3JsZENvb3JkaW5hdGUueCAqIE1hdGgucG93KDIsIHpvb20pLCB5OiB3b3JsZENvb3JkaW5hdGUueSAqIE1hdGgucG93KDIsIHpvb20pfTtcblx0XHR2YXIgdGlsZUNvb3JkaW5hdGUgPSB7eDogTWF0aC5mbG9vcihwaXhlbENvb3JkaW5hdGUueCAvIE1FUkNBVE9SX1JBTkdFKSwgeTogTWF0aC5mbG9vcihwaXhlbENvb3JkaW5hdGUueSAvIE1FUkNBVE9SX1JBTkdFKX07XG5cdFx0cmV0dXJuIHRpbGVDb29yZGluYXRlO1xuXHR9XG5cblx0dmFyIFRpbGVDb250cm9sbGVyID0gZnVuY3Rpb24od2ViR2xWaWV3KSB7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy5ib3VuZHMgPSBuZXcgUmVjdGFuZ2xlKDAsIDAsIDAsIDApO1xuXHRcdHRoaXMuem9vbSA9IDA7XG5cdFx0dGhpcy5taW5ab29tID0gMDtcblx0XHR0aGlzLm1heFpvb20gPSAxMDtcblx0XHR0aGlzLmVuYWJsZWQgPSBmYWxzZTtcblx0XHR0aGlzLnZpZXdzID0gW107XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLnNldE1hcCA9IGZ1bmN0aW9uKG1hcCkge1xuXHRcdGlmKG1hcCkge1xuXHRcdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdFx0dGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuYWRkVmlldyA9IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgaW5kZXggPSB0aGlzLnZpZXdzLmluZGV4T2Yodmlldyk7XG5cdFx0aWYoaW5kZXggPCAwKSB0aGlzLnZpZXdzLnB1c2godmlldyk7XG5cdFx0dmFyIGIgPSB0aGlzLmJvdW5kcztcblx0XHR2aWV3LnNldFRpbGVTaXplKE1FUkNBVE9SX1JBTkdFKTtcblx0XHR2aWV3LnNob3dUaWxlcyhiLnVseCwgYi51bHksIGIubHJ4LCBiLmxyeSwgdGhpcy56b29tKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUucmVtb3ZlVmlldyA9IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgaW5kZXggPSB0aGlzLnZpZXdzLmluZGV4T2Yodmlldyk7XG5cdFx0aWYoaW5kZXggPj0gMCkgdGhpcy52aWV3cy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdHZpZXcuY2xlYXIoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuX2FkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jaGFuZ2VMaXN0ZW5lciA9IGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCBcImJvdW5kc19jaGFuZ2VkXCIsIHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHRnb29nbGUubWFwcy5ldmVudC5yZW1vdmVMaXN0ZW5lcih0aGlzLmNoYW5nZUxpc3RlbmVyKTtcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuaGFzQ2hhbmdlZFpvb20gPSBmdW5jdGlvbih6b29tKSB7XG5cdFx0cmV0dXJuIHRoaXMuem9vbSAhPSB6b29tO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5oYXNDaGFuZ2VkQm91bmRzID0gZnVuY3Rpb24odmlzaWJsZUJvdW5kcykge1xuXHRcdHZhciBjdXJyZW50Qm91bmRzID0gdGhpcy5ib3VuZHM7XG5cdFx0cmV0dXJuIGN1cnJlbnRCb3VuZHMudWx4ICE9IHZpc2libGVCb3VuZHMudWx4IHx8IFxuXHRcdFx0Y3VycmVudEJvdW5kcy51bHkgIT0gdmlzaWJsZUJvdW5kcy51bHkgfHwgXG5cdFx0XHRjdXJyZW50Qm91bmRzLmxyeCAhPSB2aXNpYmxlQm91bmRzLmxyeCB8fCBcblx0XHRcdGN1cnJlbnRCb3VuZHMubHJ5ICE9IHZpc2libGVCb3VuZHMubHJ5O1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbWFwID0gdGhpcy5tYXAsXG5cdFx0XHRib3VuZHMgPSBtYXAuZ2V0Qm91bmRzKCksXG5cdFx0XHRib3VuZHNOZUxhdExuZyA9IGJvdW5kcy5nZXROb3J0aEVhc3QoKSxcblx0XHRcdGJvdW5kc1N3TGF0TG5nID0gYm91bmRzLmdldFNvdXRoV2VzdCgpLFxuXHRcdFx0Ym91bmRzTndMYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGJvdW5kc05lTGF0TG5nLmxhdCgpLCBib3VuZHNTd0xhdExuZy5sbmcoKSksXG5cdFx0XHRib3VuZHNTZUxhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoYm91bmRzU3dMYXRMbmcubGF0KCksIGJvdW5kc05lTGF0TG5nLmxuZygpKSxcblx0XHRcdHpvb20gPSBtYXAuZ2V0Wm9vbSgpLFxuXHRcdFx0cHJvamVjdGlvbiA9IG1hcC5nZXRQcm9qZWN0aW9uKCksXG5cdFx0XHR0aWxlQ29vcmRpbmF0ZU53ID0gY29udmVydFBvaW50VG9UaWxlKGJvdW5kc053TGF0TG5nLCB6b29tLCBwcm9qZWN0aW9uKSxcblx0XHRcdHRpbGVDb29yZGluYXRlU2UgPSBjb252ZXJ0UG9pbnRUb1RpbGUoYm91bmRzU2VMYXRMbmcsIHpvb20sIHByb2plY3Rpb24pLFxuXHRcdFx0dmlzaWJsZUJvdW5kcyA9IG5ldyBSZWN0YW5nbGUodGlsZUNvb3JkaW5hdGVOdy54LCB0aWxlQ29vcmRpbmF0ZU53LnksIFxuXHRcdFx0XHR0aWxlQ29vcmRpbmF0ZVNlLngtdGlsZUNvb3JkaW5hdGVOdy54LCB0aWxlQ29vcmRpbmF0ZVNlLnktdGlsZUNvb3JkaW5hdGVOdy55KTtcblxuXHRcdHpvb20gPSBNYXRoLm1heCh0aGlzLm1pblpvb20sIHpvb20pO1xuXHRcdHpvb20gPSBNYXRoLm1pbih0aGlzLm1heFpvb20sIHpvb20pO1xuXG5cdFx0dmFyIGN1cnJlbnRCb3VuZHMgPSB0aGlzLmJvdW5kcztcblx0XHR2YXIgeCA9IE1hdGgubWluKGN1cnJlbnRCb3VuZHMudWx4LCB2aXNpYmxlQm91bmRzLnVseCksXG5cdFx0XHR5ID0gTWF0aC5taW4oY3VycmVudEJvdW5kcy51bHksIHZpc2libGVCb3VuZHMudWx5KSxcblx0XHRcdHdpZHRoID0gTWF0aC5tYXgoY3VycmVudEJvdW5kcy5scngsIHZpc2libGVCb3VuZHMubHJ4KSAtIHgsXG5cdFx0XHRoZWlnaHQgPSBNYXRoLm1heChjdXJyZW50Qm91bmRzLmxyeSwgdmlzaWJsZUJvdW5kcy5scnkpIC0geTtcblx0XHR2YXIgcmFuZ2UgPSBuZXcgUmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuXHRcdFxuXHRcdC8vIEhpZGUgZXZlcnl0aGluZyBpZiB3ZSBjaGFuZ2VkIHpvb20gbGV2ZWwuXG5cdFx0Ly8gVGhlbiBzZXQgdGhlIHJhbmdlIHRvIHVwZGF0ZSBvbmx5IHRoZSB2aXNpYmxlIHRpbGVzLlxuXHRcdGlmKHRoaXMuaGFzQ2hhbmdlZFpvb20oem9vbSkpIHtcblx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGFsbCBjdXJyZW50bHkgdmlzaWJsZSB0aWxlcyB3aWxsIGJlIGhpZGRlbi5cblx0XHRcdHRoaXMudXBkYXRlVGlsZXMoY3VycmVudEJvdW5kcywgY3VycmVudEJvdW5kcywgbmV3IFJlY3RhbmdsZSgtMSwgLTEsIDAsIDApLCB0aGlzLnpvb20pO1xuXHRcdFx0Ly8gVGhlbiBtYWtlIHN1cmUgdGhhdCBhbGwgdGlsZXMgdGhhdCBzaG91bGQgYmUgdmlzaWJsZSB3aWxsIGNhbGwgc2hvd1RpbGUgYmVsb3cuXG5cdFx0XHRjdXJyZW50Qm91bmRzID0gbmV3IFJlY3RhbmdsZSgtMSwgLTEsIDAsIDApO1xuXHRcdFx0Ly8gV2Ugb25seSBuZWVkIHRvIHVwZGF0ZSBhbGwgdmlzaWJsZSB0aWxlcyBiZWxvdy5cblx0XHRcdHJhbmdlID0gdmlzaWJsZUJvdW5kcztcblx0XHR9XG5cblx0XHQvLyBJdGVyYXRlIGFsbCB0aGUgbGF5ZXJzIHRvIHVwZGF0ZSB3aGljaCB0aWxlcyBhcmUgdmlzaWJsZS5cblx0XHRpZih0aGlzLmhhc0NoYW5nZWRCb3VuZHModmlzaWJsZUJvdW5kcykpIHtcblx0XHRcdHRoaXMudXBkYXRlVGlsZXMocmFuZ2UsIGN1cnJlbnRCb3VuZHMsIHZpc2libGVCb3VuZHMsIHpvb20pO1xuXHRcdH1cblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlVGlsZXMgPSBmdW5jdGlvbihyYW5nZSwgY3VycmVudEJvdW5kcywgdmlzaWJsZUJvdW5kcywgem9vbSkge1xuXHRcdHZhciB2aWV3cyA9IHRoaXMudmlld3M7XG5cdFx0Zm9yKHZhciBpPTA7IGk8dmlld3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdGZvcih2YXIgY29sdW1uPXJhbmdlLnVseDsgY29sdW1uPD1yYW5nZS5scng7IGNvbHVtbisrKSB7XG5cdFx0XHRcdGZvcih2YXIgcm93PXJhbmdlLnVseTsgcm93PD1yYW5nZS5scnk7IHJvdysrKSB7XG5cdFx0XHRcdFx0aWYodmlzaWJsZUJvdW5kcy5jb250YWluc1BvaW50KGNvbHVtbiwgcm93KSkge1xuXHRcdFx0XHRcdFx0Ly8gT25seSBzaG93VGlsZSBpZiBpdCdzIG5vdCBhbHJlYWR5IHZpc2libGVcblx0XHRcdFx0XHRcdGlmKCFjdXJyZW50Qm91bmRzLmNvbnRhaW5zUG9pbnQoY29sdW1uLCByb3cpKVxuXHRcdFx0XHRcdFx0XHR2aWV3c1tpXS5zaG93VGlsZShjb2x1bW4sIHJvdywgem9vbSk7XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHQvLyBIaWRlIHRpbGUgdGhhdCBpcyBjdXJyZW50bHkgdmlzaWJsZVxuXHRcdFx0XHRcdFx0aWYoY3VycmVudEJvdW5kcy5jb250YWluc1BvaW50KGNvbHVtbiwgcm93KSlcblx0XHRcdFx0XHRcdFx0dmlld3NbaV0uaGlkZVRpbGUoY29sdW1uLCByb3csIHpvb20pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHRcdH1cblx0XHR0aGlzLnpvb20gPSB6b29tO1xuXHRcdHRoaXMuYm91bmRzID0gdmlzaWJsZUJvdW5kcztcblx0fTtcblxuXHR3aW5kb3cuVGlsZUNvbnRyb2xsZXIgPSBUaWxlQ29udHJvbGxlcjtcbn0oKSk7XG4iLCIoZnVuY3Rpb24oKXtcblx0dmFyIEdlb0pTT05EYXRhU291cmNlID0gZnVuY3Rpb24odXJsLCBwcm9qZWN0aW9uKXtcblx0XHR0aGlzLnVybCA9IHVybDtcblx0XHR0aGlzLnByb2plY3Rpb24gPSBwcm9qZWN0aW9uO1xuXHRcdHRoaXMuZmlsZUV4dGVuc2lvbiA9IFwianNvblwiO1xuXHRcdHRoaXMucmVzcG9uc2VUeXBlID0gXCJqc29uXCI7XG5cdH07XG5cblx0R2VvSlNPTkRhdGFTb3VyY2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdHZhciBmZWF0dXJlQ29sbGVjdGlvbiA9IFtdO1xuXHRcdGlmKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVDb2xsZWN0aW9uXCIpIHtcblx0XHRcdFx0dmFyIGZlYXR1cmVzID0gZGF0YS5mZWF0dXJlcztcblx0XHRcdFx0Zm9yKHZhciBpPTA7IGk8ZmVhdHVyZXMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdFx0ZmVhdHVyZUNvbGxlY3Rpb24ucHVzaCh0aGlzLl9wYXJzZUZlYXR1cmUoZmVhdHVyZXNbaV0pKTtcblx0XHRcdH1lbHNlIGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVcIikge1xuXHRcdFx0XHRmZWF0dXJlQ29sbGVjdGlvbi5wdXNoKHRoaXMuX3BhcnNlRmVhdHVyZShkYXRhKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmZWF0dXJlQ29sbGVjdGlvbjtcblx0fTtcblxuXHRHZW9KU09ORGF0YVNvdXJjZS5wcm90b3R5cGUuX3BhcnNlRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpIHtcblx0XHR2YXIgcG9seWdvbnMgPSBbXTtcblx0XHRpZihmZWF0dXJlLmdlb21ldHJ5LnR5cGUgPT0gXCJQb2x5Z29uXCIpIHtcblx0XHRcdHBvbHlnb25zLnB1c2godGhpcy5fcGFyc2VQb2x5Z29uKGZlYXR1cmUuZ2VvbWV0cnkuY29vcmRpbmF0ZXMpKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihmZWF0dXJlLmdlb21ldHJ5LnR5cGUgPT0gXCJNdWx0aVBvbHlnb25cIikge1xuXHRcdFx0dmFyIGNvb3JkaW5hdGVzID0gZmVhdHVyZS5nZW9tZXRyeS5jb29yZGluYXRlcztcblx0XHRcdGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHRwb2x5Z29ucy5wdXNoKHRoaXMuX3BhcnNlUG9seWdvbihjb29yZGluYXRlc1tpXSkpO1xuXHRcdH1cblx0XHRyZXR1cm4gcG9seWdvbnM7XG5cdH07XG5cblx0R2VvSlNPTkRhdGFTb3VyY2UucHJvdG90eXBlLl9wYXJzZVBvbHlnb24gPSBmdW5jdGlvbihjb29yZGluYXRlcykge1xuXHRcdHZhciBwb2x5Z29uID0gW107XG5cdFx0Zm9yKHZhciBpPTA7IGk8Y29vcmRpbmF0ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwb2ludHMgPSBbXTtcblx0XHRcdGZvcih2YXIgaj0wOyBqPGNvb3JkaW5hdGVzW2ldLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdHZhciBsYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGNvb3JkaW5hdGVzW2ldW2pdWzFdLCBjb29yZGluYXRlc1tpXVtqXVswXSk7XG5cdFx0XHRcdHZhciBwb2ludCA9IHRoaXMucHJvamVjdGlvbi5mcm9tTGF0TG5nVG9Qb2ludChsYXRMbmcpO1xuXHRcdFx0XHRwb2ludHMucHVzaChbcG9pbnQueCwgcG9pbnQueV0pO1xuXHRcdFx0fVxuXHRcdFx0cG9seWdvbi5wdXNoKHBvaW50cyk7XG5cdFx0fVxuXHRcdHJldHVybiBwb2x5Z29uO1xuXHR9O1xuXG5cdHdpbmRvdy5HZW9KU09ORGF0YVNvdXJjZSA9IEdlb0pTT05EYXRhU291cmNlO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIEltYWdlRGF0YVNvdXJjZSA9IGZ1bmN0aW9uKHVybCl7XG5cdFx0dGhpcy51cmwgPSB1cmw7XG5cdFx0dGhpcy5maWxlRXh0ZW5zaW9uID0gXCJwbmdcIjtcblx0XHR0aGlzLnJlc3BvbnNlVHlwZSA9IFwiYmxvYlwiO1xuXHR9O1xuXG5cdEltYWdlRGF0YVNvdXJjZS5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihkYXRhKXtcblx0XHRyZXR1cm4gZGF0YTtcblx0fTtcblxuXHR3aW5kb3cuSW1hZ2VEYXRhU291cmNlID0gSW1hZ2VEYXRhU291cmNlO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIFRpbGVQcm92aWRlciA9IGZ1bmN0aW9uKGRhdGFTb3VyY2UsICRodHRwLCAkcSkge1xuXHRcdHRoaXMuZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2U7XG5cdFx0dGhpcy4kaHR0cCA9ICRodHRwO1xuXHRcdHRoaXMuJHEgPSAkcTtcblx0XHR0aGlzLnRpbGVzID0ge307XG5cdH07XG5cblx0VGlsZVByb3ZpZGVyLnByb3RvdHlwZS5nZXRUaWxlVXJsID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHJldHVybiB0aGlzLmRhdGFTb3VyY2UudXJsK1wiL1wiK3orXCIvXCIreCtcIi9cIit5K1wiLlwiK3RoaXMuZGF0YVNvdXJjZS5maWxlRXh0ZW5zaW9uO1xuXHR9O1xuXG5cdFRpbGVQcm92aWRlci5wcm90b3R5cGUuZ2V0VGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgZGVmZXJyZWQgPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dmFyIHVybCA9IHRoaXMuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHRpZih0aGlzLnRpbGVzW3VybF0pe1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7dXJsOnVybCwgZGF0YTp0aGlzLnRpbGVzW3VybF19KTtcblx0XHR9ZWxzZXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuJGh0dHAuZ2V0KHVybCwge3Jlc3BvbnNlVHlwZTogdGhpcy5kYXRhU291cmNlLnJlc3BvbnNlVHlwZX0pXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0gPSBzZWxmLmRhdGFTb3VyY2UucGFyc2UocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7dXJsOnVybCwgZGF0YTpzZWxmLnRpbGVzW3VybF19KTtcblx0XHRcdFx0fSwgZnVuY3Rpb24ocmVhc29uKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHR9O1xuXG5cdHdpbmRvdy5UaWxlUHJvdmlkZXIgPSBUaWxlUHJvdmlkZXI7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgSW1hZ2VUaWxlVmlldyA9IGZ1bmN0aW9uKHRpbGVQcm92aWRlciwgd2ViR2xWaWV3KSB7XG5cdFx0dGhpcy50aWxlUHJvdmlkZXIgPSB0aWxlUHJvdmlkZXI7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy50aWxlcyA9IHt9O1xuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLnNldFRpbGVTaXplID0gZnVuY3Rpb24odGlsZVNpemUpIHtcblx0XHR0aGlzLnRpbGVTaXplID0gdGlsZVNpemU7XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGVzID0gZnVuY3Rpb24odWx4LCB1bHksIGxyeCwgbHJ5LCB6b29tKSB7XG5cdFx0Zm9yKHZhciBjb2x1bW49dWx4OyBjb2x1bW48PWxyeDsgY29sdW1uKyspIHtcblx0XHRcdGZvcih2YXIgcm93PXVseTsgcm93PD1scnk7IHJvdysrKSB7XG5cdFx0XHRcdHRoaXMuc2hvd1RpbGUoY29sdW1uLCByb3csIHpvb20pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGUgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG5cdFx0dmFyIHVybCA9IHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGVVcmwoeCwgeSwgeik7XG5cdFx0aWYodGhpcy50aWxlc1t1cmxdKSB7XG5cdFx0XHRpZighdGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KSB7XG5cdFx0XHRcdHZhciBzY2FsZUZhY3RvciA9IE1hdGgucG93KDIsIHopO1xuXHRcdFx0XHR2YXIgc3ByaXRlU2l6ZSA9IHRoaXMudGlsZVNpemUgLyBzY2FsZUZhY3Rvcjtcblx0XHRcdFx0dmFyIHNwcml0ZU9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0cG9zaXRpb246IHt4Ongqc3ByaXRlU2l6ZSwgeTp5KnNwcml0ZVNpemUsIHo6en0sXG5cdFx0XHRcdFx0d2lkdGg6IHNwcml0ZVNpemUsXG5cdFx0XHRcdFx0aGVpZ2h0OiBzcHJpdGVTaXplLFxuXHRcdFx0XHRcdGltYWdlOiB0aGlzLnRpbGVzW3VybF0uZGF0YSxcblx0XHRcdFx0XHRpbWFnZU5hbWU6IHVybFxuXHRcdFx0XHR9O1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSB0aGlzLndlYkdsVmlldy5hZGRTcHJpdGUoc3ByaXRlT3B0aW9ucyk7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0XHRcdH1cblx0XHR9ZWxzZXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGUoeCwgeSwgeilcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdHNlbGYudGlsZXNbdXJsXSA9IHJlc3BvbnNlO1xuXHRcdFx0XHRcdHZhciBzY2FsZUZhY3RvciA9IE1hdGgucG93KDIsIHopO1xuXHRcdFx0XHRcdHZhciBzcHJpdGVTaXplID0gc2VsZi50aWxlU2l6ZSAvIHNjYWxlRmFjdG9yO1xuXHRcdFx0XHRcdHZhciBzcHJpdGVPcHRpb25zID0ge1xuXHRcdFx0XHRcdFx0cG9zaXRpb246IHt4Ongqc3ByaXRlU2l6ZSwgeTp5KnNwcml0ZVNpemUsIHo6en0sXG5cdFx0XHRcdFx0XHR3aWR0aDogc3ByaXRlU2l6ZSxcblx0XHRcdFx0XHRcdGhlaWdodDogc3ByaXRlU2l6ZSxcblx0XHRcdFx0XHRcdGltYWdlOiBzZWxmLnRpbGVzW3VybF0uZGF0YSxcblx0XHRcdFx0XHRcdGltYWdlTmFtZTogdXJsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSBzZWxmLndlYkdsVmlldy5hZGRTcHJpdGUoc3ByaXRlT3B0aW9ucyk7XG5cdFx0XHRcdFx0c2VsZi53ZWJHbFZpZXcuZHJhdygpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihyZWFzb24pe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2cocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLmhpZGVUaWxlID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHZhciB1cmwgPSB0aGlzLnRpbGVQcm92aWRlci5nZXRUaWxlVXJsKHgsIHksIHopO1xuXHRcdGlmKHRoaXMudGlsZXNbdXJsXSAmJiB0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpIHtcblx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZVNwcml0ZSh0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpO1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5ID0gbnVsbDtcblx0XHR9XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0XHRmb3IodmFyIHVybCBpbiB0aGlzLnRpbGVzKSB7XG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpIHtcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcucmVtb3ZlU3ByaXRlKHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSk7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHR3aW5kb3cuSW1hZ2VUaWxlVmlldyA9IEltYWdlVGlsZVZpZXc7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXG5cdGZ1bmN0aW9uIGNvbG9yVG9IZXgoYikge1xuXHRcdHZhciBoZXhDaGFyID0gW1wiMFwiLCBcIjFcIiwgXCIyXCIsIFwiM1wiLCBcIjRcIiwgXCI1XCIsIFwiNlwiLCBcIjdcIixcIjhcIiwgXCI5XCIsIFwiYVwiLCBcImJcIiwgXCJjXCIsIFwiZFwiLCBcImVcIiwgXCJmXCJdO1xuXHRcdHJldHVybiBoZXhDaGFyWyhiID4+IDIwKSAmIDB4MGZdICsgaGV4Q2hhclsoYiA+PiAxNikgJiAweDBmXSArIFxuXHRcdFx0aGV4Q2hhclsoYiA+PiAxMikgJiAweDBmXSArIGhleENoYXJbKGIgPj4gOCkgJiAweDBmXSArIFxuXHRcdFx0aGV4Q2hhclsoYiA+PiA0KSAmIDB4MGZdICsgaGV4Q2hhcltiICYgMHgwZl07XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRSYW5kb21Db2xvcigpIHtcblx0XHRyZXR1cm4gKE1hdGguZmxvb3IoMjU1LjAqTWF0aC5yYW5kb20oKSkgJiAweEZGKSA8PCAxNiBcblx0XHRcdHwgKE1hdGguZmxvb3IoMjU1LjAqTWF0aC5yYW5kb20oKSkgJiAweEZGKSA8PCA4IFxuXHRcdFx0fCAoTWF0aC5mbG9vcigyNTUuMCpNYXRoLnJhbmRvbSgpKSAmIDB4RkYpO1xuXHR9XG5cblx0dmFyIFZlY3RvclRpbGVWaWV3ID0gZnVuY3Rpb24odGlsZVByb3ZpZGVyLCB3ZWJHbFZpZXcsIHVzZVJhbmRvbUNvbG9ycykge1xuXHRcdHRoaXMudGlsZVByb3ZpZGVyID0gdGlsZVByb3ZpZGVyO1xuXHRcdHRoaXMud2ViR2xWaWV3ID0gd2ViR2xWaWV3O1xuXHRcdHRoaXMudGlsZXMgPSB7fTtcblx0XHR0aGlzLnNob3duVGlsZXMgPSB7fTtcblxuXHRcdC8vIHVzZWQgZm9yIGRlYnVnZ2luZ1xuXHRcdHRoaXMudXNlUmFuZG9tQ29sb3JzID0gdXNlUmFuZG9tQ29sb3JzO1xuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5zZXRUaWxlU2l6ZSA9IGZ1bmN0aW9uKHRpbGVTaXplKSB7XG5cdFx0dGhpcy50aWxlU2l6ZSA9IHRpbGVTaXplO1xuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5zZXRUaWxlU2l6ZSA9IGZ1bmN0aW9uKHRpbGVTaXplKSB7XG5cdFx0dGhpcy50aWxlU2l6ZSA9IHRpbGVTaXplO1xuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5zaG93VGlsZXMgPSBmdW5jdGlvbih1bHgsIHVseSwgbHJ4LCBscnksIHpvb20pIHtcblx0XHRmb3IodmFyIGNvbHVtbj11bHg7IGNvbHVtbjw9bHJ4OyBjb2x1bW4rKykge1xuXHRcdFx0Zm9yKHZhciByb3c9dWx5OyByb3c8PWxyeTsgcm93KyspIHtcblx0XHRcdFx0dGhpcy5zaG93VGlsZShjb2x1bW4sIHJvdywgem9vbSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHRWZWN0b3JUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGUgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG5cdFx0dmFyIHVybCA9IHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGVVcmwoeCwgeSwgeik7XG5cdFx0Ly8gY29uc29sZS5sb2coXCJTaG93aW5nIHRpbGU6IFwiICsgdXJsKTtcblx0XHRpZih0aGlzLnNob3duVGlsZXNbdXJsXSkgcmV0dXJuO1xuXHRcdHRoaXMuc2hvd25UaWxlc1t1cmxdID0gdHJ1ZTtcblxuXHRcdGlmKHRoaXMudGlsZXNbdXJsXSkge1xuXHRcdFx0aWYodGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KSB7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LmFkZEdlb21ldHJ5KHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHRoaXMudGlsZXNbdXJsXS5kYXRhKSB7XG5cdFx0XHRcdHZhciBvcHRpb25zID0ge307XG5cdFx0XHRcdG9wdGlvbnMuZmVhdHVyZXMgPSB0aGlzLnRpbGVzW3VybF0uZGF0YTtcblx0XHRcdFx0b3B0aW9ucy5maWxsQ29sb3IgPSB0aGlzLnVzZVJhbmRvbUNvbG9ycyA/IGdldFJhbmRvbUNvbG9yKCkgOiBudWxsO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSB0aGlzLndlYkdsVmlldy5jcmVhdGVHZW9tZXRyeShvcHRpb25zKTtcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHRcdFx0fVxuXHRcdH1lbHNle1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZSh4LCB5LCB6KVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0c2VsZi50aWxlc1t1cmxdID0gcmVzcG9uc2U7XG5cdFx0XHRcdFx0aWYoc2VsZi5zaG93blRpbGVzW3VybF0pIHtcblx0XHRcdFx0XHRcdHZhciBvcHRpb25zID0ge307XG5cdFx0XHRcdFx0XHRvcHRpb25zLmZlYXR1cmVzID0gc2VsZi50aWxlc1t1cmxdLmRhdGE7XG5cdFx0XHRcdFx0XHRvcHRpb25zLmZpbGxDb2xvciA9IHNlbGYudXNlUmFuZG9tQ29sb3JzID8gZ2V0UmFuZG9tQ29sb3IoKSA6IG51bGw7XG5cdFx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSBzZWxmLndlYkdsVmlldy5jcmVhdGVHZW9tZXRyeShvcHRpb25zKTtcblx0XHRcdFx0XHRcdHNlbGYud2ViR2xWaWV3LmRyYXcoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZ1bmN0aW9uKHJlYXNvbil7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2cocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5oaWRlVGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgdXJsID0gdGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHQvLyBjb25zb2xlLmxvZyhcIkhpZGluZyB0aWxlOiBcIiArIHVybCk7XG5cdFx0dGhpcy5zaG93blRpbGVzW3VybF0gPSBmYWxzZTtcblxuXHRcdGlmKHRoaXMudGlsZXNbdXJsXSAmJiB0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpIHtcblx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZUdlb21ldHJ5KHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSk7XG5cdFx0XHRkZWxldGUgdGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5O1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5ID0gbnVsbDtcblx0XHR9XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG5cdFx0Zm9yKHZhciB1cmwgaW4gdGhpcy50aWxlcykge1xuXHRcdFx0aWYodGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KVxuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVHZW9tZXRyeSh0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpO1xuXHRcdH1cblx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdH07XG5cblx0d2luZG93LlZlY3RvclRpbGVWaWV3ID0gVmVjdG9yVGlsZVZpZXc7XG59KCkpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
