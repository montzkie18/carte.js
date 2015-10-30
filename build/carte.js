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

	var WebGLView = function(map) {
		this._map = map;
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
		this.renderer.domElement.style["pointer-events"] = 'none';
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
			projection = map.getProjection(),
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
			var coordinates = feature.geometry.coordinates;
			var polygon = [];
			for(var i=0; i<coordinates.length; i++) {
				var linearRing = coordinates[i];
				polygon.push(this._parseCoordinates(linearRing));
			}
			polygons.push(polygon);
		}
		else if(feature.geometry.type == "MultiPolygon") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++) {
				var polygonCoordinates = coordinates[i];
				var polygon = [];
				for(var j=0; j<polygonCoordinates.length; j++) {
					var linearRing = polygonCoordinates[j];
					polygon.push(this._parseCoordinates(linearRing));
				}
				polygons.push(polygon);
			}
		}
		else if(feature.geometry.type == "LineString") {
			lines.push(this._parseCoordinates(feature.geometry.coordinates));
		}
		else if(feature.geometry.type == "MultiLineString") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++) {
				var lineString = coordinates[i];
				lines.push(this._parseCoordinates(lineString));
			}
		}
		else if(feature.geometry.type == "Point") {
			var coordinates = feature.geometry.coordinates;
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

	var VectorTileView = function(tileProvider, webGlView, iconImage, useRandomColors) {
		this.tileProvider = tileProvider;
		this.webGlView = webGlView;
		this.iconImage = iconImage;
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
			polygonOptions.fillColor = this.useRandomColors ? getRandomColor() : null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJnZW9tcy9yZWN0YW5nbGUuanMiLCJncmFwaGljcy9keW5hbWljX3Nwcml0ZXNoZWV0LmpzIiwiZ3JhcGhpY3MvbGluZV9yZW5kZXJlci5qcyIsImdyYXBoaWNzL29iamVjdF9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3BvaW50X3JlbmRlcmVyLmpzIiwiZ3JhcGhpY3MvcG9seWdvbl9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3Nwcml0ZV9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3Nwcml0ZXNoZWV0LmpzIiwiZ3JhcGhpY3Mvd2ViZ2xfdmlldy5qcyIsInV0aWxzL2h0dHByZXF1ZXN0cy5qcyIsImdpcy9jb250cm9sbGVycy9jbHVzdGVyX2NvbnRyb2xsZXIuanMiLCJnaXMvY29udHJvbGxlcnMvdGlsZV9jb250cm9sbGVyLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL2dlb2pzb25fZGF0YXNvdXJjZS5qcyIsImdpcy9kYXRhc291cmNlcy9pbWFnZV9kYXRhc291cmNlLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL3N0YV9kYXRhc291cmNlLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL3RpbGVfcHJvdmlkZXIuanMiLCJnaXMvdmlld3MvaW1hZ2VfdGlsZV92aWV3LmpzIiwiZ2lzL3ZpZXdzL3NpdGVfY2x1c3Rlcl92aWV3LmpzIiwiZ2lzL3ZpZXdzL3ZlY3Rvcl90aWxlX3ZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImNhcnRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gZGVjbGFyZSBwYWNrYWdlIG5hbWVzXG52YXIgY2FydGUgPSB7fTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIFJlY3RhbmdsZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcblx0XHR0aGlzLnggPSB4O1xuXHRcdHRoaXMueSA9IHk7XG5cdFx0dGhpcy53aWR0aCA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdHRoaXMudWx4ID0geDtcblx0XHR0aGlzLnVseSA9IHk7XG5cdFx0dGhpcy5scnggPSB4K3dpZHRoO1xuXHRcdHRoaXMubHJ5ID0geSt3aWR0aDtcblx0fTtcblxuXHRSZWN0YW5nbGUucHJvdG90eXBlLmNvbnRhaW5zUG9pbnQgPSBmdW5jdGlvbih4LCB5KSB7XG5cdFx0cmV0dXJuIHRoaXMudWx4PD14ICYmIHg8PXRoaXMubHJ4ICYmIHRoaXMudWx5PD15ICYmIHk8PXRoaXMubHJ5O1xuXHR9O1xuXG5cdFJlY3RhbmdsZS5wcm90b3R5cGUuY29udGFpbnNSZWN0ID0gZnVuY3Rpb24ocmVjdCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnRhaW5zUG9pbnQocmVjdC54LCByZWN0LnkpICYmIFxuXHRcdFx0dGhpcy5jb250YWluc1BvaW50KHJlY3QueCtyZWN0LndpZHRoLCByZWN0LnkrcmVjdC5oZWlnaHQpO1xuXHR9O1xuXG5cdFJlY3RhbmdsZS5wcm90b3R5cGUuY29udGFpbnNEaW1lbnNpb25zID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCkge1xuXHRcdHJldHVybiB0aGlzLndpZHRoID49IHdpZHRoICYmIHRoaXMuaGVpZ2h0ID49IGhlaWdodDtcblx0fTtcblxuXHRSZWN0YW5nbGUucHJvdG90eXBlLmdldE5vcm1hbGl6ZWRSZWN0ID0gZnVuY3Rpb24obWF4V2lkdGgsIG1heEhlaWdodCkge1xuXHRcdHZhciB4ID0gdGhpcy54IC8gbWF4V2lkdGgsXG5cdFx0XHR5ID0gdGhpcy55IC8gbWF4SGVpZ2h0LFxuXHRcdFx0d2lkdGggPSB0aGlzLndpZHRoIC8gbWF4V2lkdGgsXG5cdFx0XHRoZWlnaHQgPSB0aGlzLmhlaWdodCAvIG1heEhlaWdodDtcblx0XHRyZXR1cm4gbmV3IFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcblx0fTtcblxuXHR3aW5kb3cuUmVjdGFuZ2xlID0gUmVjdGFuZ2xlO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIFNwcml0ZU5vZGUgPSBmdW5jdGlvbihyZWN0KSB7XG5cdFx0dGhpcy5yZWN0ID0gcmVjdDtcblx0XHR0aGlzLm5hbWUgPSBcInNwcml0ZTBcIjtcblx0XHR0aGlzLmltYWdlID0gbnVsbDtcblx0XHR0aGlzLmNoaWxkID0gW107XG5cdH07XG5cblx0U3ByaXRlTm9kZS5wcm90b3R5cGUuY29tcHV0ZU5vcm1hbCA9IGZ1bmN0aW9uKG1heFdpZHRoLCBtYXhIZWlnaHQpIHtcblx0XHR0aGlzLm1heFdpZHRoID0gbWF4V2lkdGg7XG5cdFx0dGhpcy5tYXhIZWlnaHQgPSBtYXhIZWlnaHQ7XG5cdFx0dGhpcy5ub3JtYWxSZWN0ID0gdGhpcy5yZWN0LmdldE5vcm1hbGl6ZWRSZWN0KG1heFdpZHRoLCBtYXhIZWlnaHQpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIG1heCByZWN0IGFsZ29yaXRobSBmb3IgZmluZGluZyB3aGVyZSB0byBmaXQgdGhlIGltYWdlLlxuXHQgKiBTYW1wbGUgaW1wbGVtZW50YXRpb24gZm9yIGxpZ2h0bWFwczogaHR0cDovL3d3dy5ibGFja3Bhd24uY29tL3RleHRzL2xpZ2h0bWFwcy9cblx0ICovXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uKG5hbWUsIGltYWdlKSB7XG5cdFx0dmFyIG5ld05vZGUgPSBudWxsO1xuXHRcdGlmKHRoaXMuaW1hZ2UgIT09IG51bGwpIHtcblx0XHRcdC8vIHRoaXMgYWxyZWFkeSBjb250YWlucyBhbiBpbWFnZSBzbyBsZXQncyBjaGVjayBpdCdzIGNoaWxkcmVuXG5cdFx0XHRpZih0aGlzLmNoaWxkLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0bmV3Tm9kZSA9IHRoaXMuY2hpbGRbMF0uaW5zZXJ0KG5hbWUsIGltYWdlKTtcblx0XHRcdFx0aWYobmV3Tm9kZSAhPT0gbnVsbCkgcmV0dXJuIG5ld05vZGU7XG5cdFx0XHRcdHJldHVybiB0aGlzLmNoaWxkWzFdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHR9XG5cdFx0XHQvLyB0aGlzIGlzIGEgbGVhZiBub2RlIGFuZCBhbHJlYWR5IGNvbnRhaW5zIGFuIGltYWdlIHRoYXQgJ2p1c3QgZml0cydcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZih0aGlzLnJlY3QuY29udGFpbnNEaW1lbnNpb25zKGltYWdlLndpZHRoLCBpbWFnZS5oZWlnaHQpKSB7XG5cdFx0XHRcdGlmKHRoaXMucmVjdC53aWR0aCA9PSBpbWFnZS53aWR0aCAmJiB0aGlzLnJlY3QuaGVpZ2h0ID09IGltYWdlLmhlaWdodCkge1xuXHRcdFx0XHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0XHRcdFx0dGhpcy5pbWFnZSA9IGltYWdlO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYodGhpcy5jaGlsZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0bmV3Tm9kZSA9IHRoaXMuY2hpbGRbMF0uaW5zZXJ0KG5hbWUsIGltYWdlKTtcblx0XHRcdFx0XHRpZihuZXdOb2RlICE9PSBudWxsKSByZXR1cm4gbmV3Tm9kZTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jaGlsZFsxXS5pbnNlcnQobmFtZSwgaW1hZ2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciByZWN0ID0gdGhpcy5yZWN0O1xuXHRcdFx0XHRcdHZhciBkVyA9IHRoaXMucmVjdC53aWR0aCAtIGltYWdlLndpZHRoO1xuXHRcdFx0XHRcdHZhciBkSCA9IHRoaXMucmVjdC5oZWlnaHQgLSBpbWFnZS5oZWlnaHQ7XG5cdFx0XHRcdFx0aWYoZFcgPiBkSCkge1xuXHRcdFx0XHRcdFx0Ly8gc3BsaXQgdGhpcyByZWN0YW5nbGUgdmVydGljYWxseSBpbnRvIHR3bywgbGVmdCBhbmQgcmlnaHRcblx0XHRcdFx0XHRcdHRoaXMuY2hpbGRbMF0gPSBuZXcgU3ByaXRlTm9kZShuZXcgUmVjdGFuZ2xlKHJlY3QueCwgcmVjdC55LCBpbWFnZS53aWR0aCwgcmVjdC5oZWlnaHQpKTtcblx0XHRcdFx0XHRcdHRoaXMuY2hpbGRbMV0gPSBuZXcgU3ByaXRlTm9kZShuZXcgUmVjdGFuZ2xlKHJlY3QueCtpbWFnZS53aWR0aCwgcmVjdC55LCBkVywgcmVjdC5oZWlnaHQpKTtcblx0XHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRcdC8vIHNwbGl0IHRoaXMgcmVjdGFuZ2xlIGhvcml6b250YWxseSBpbnRvIHR3bywgb25lIGFib3ZlIGFub3RoZXIgYmVsb3dcblx0XHRcdFx0XHRcdHRoaXMuY2hpbGRbMF0gPSBuZXcgU3ByaXRlTm9kZShuZXcgUmVjdGFuZ2xlKHJlY3QueCwgcmVjdC55LCByZWN0LndpZHRoLCBpbWFnZS5oZWlnaHQpKTtcblx0XHRcdFx0XHRcdHRoaXMuY2hpbGRbMV0gPSBuZXcgU3ByaXRlTm9kZShuZXcgUmVjdGFuZ2xlKHJlY3QueCwgcmVjdC55K2ltYWdlLmhlaWdodCwgcmVjdC53aWR0aCwgZEgpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5jaGlsZFswXS5jb21wdXRlTm9ybWFsKHRoaXMubWF4V2lkdGgsIHRoaXMubWF4SGVpZ2h0KTtcblx0XHRcdFx0XHR0aGlzLmNoaWxkWzFdLmNvbXB1dGVOb3JtYWwodGhpcy5tYXhXaWR0aCwgdGhpcy5tYXhIZWlnaHQpO1xuXHRcdFx0XHRcdC8vIHRoaXMgaW1hZ2Ugc2hvdWxkIGF1dG9tYXRpY2FsbHkgZml0IHRoZSBmaXJzdCBub2RlXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRbMF0uaW5zZXJ0KG5hbWUsIGltYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Ly8gdGhpcyB3aWxsIG5vdCBmaXQgdGhpcyBub2RlXG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH07XG5cblx0U3ByaXRlTm9kZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuXHRcdGlmKHRoaXMubmFtZSA9PSBuYW1lKSByZXR1cm4gdGhpcztcblx0XHRpZih0aGlzLmNoaWxkLmxlbmd0aCA+IDApIHtcblx0XHRcdHZhciBub2RlID0gdGhpcy5jaGlsZFswXS5nZXQobmFtZSk7XG5cdFx0XHRpZihub2RlICE9PSBudWxsKSByZXR1cm4gbm9kZTtcblx0XHRcdHJldHVybiB0aGlzLmNoaWxkWzFdLmdldChuYW1lKTtcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH07XG5cblx0U3ByaXRlTm9kZS5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24obmFtZSkge1xuXHRcdHZhciBub2RlID0gdGhpcy5nZXQobmFtZSk7XG5cdFx0aWYobm9kZSkgbm9kZS5jbGVhcigpO1xuXHRcdHJldHVybiBub2RlO1xuXHR9O1xuXG5cdFNwcml0ZU5vZGUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5uYW1lID0gXCJcIjtcblx0XHR0aGlzLmltYWdlID0gbnVsbDtcblx0fTtcblxuXHR2YXIgRHluYW1pY1Nwcml0ZVNoZWV0ID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCkge1xuXHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jYW52YXMud2lkdGggPSB3aWR0aDtcblx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHR0aGlzLmNvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFxuXHRcdHRoaXMudGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKHRoaXMuY2FudmFzKTtcblx0XHR0aGlzLnRleHR1cmUubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcblx0XHR0aGlzLnRleHR1cmUubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcblx0XHR0aGlzLnRleHR1cmUuZmxpcFkgPSBmYWxzZTtcblxuXHRcdHRoaXMucG5vZGUgPSBuZXcgU3ByaXRlTm9kZShuZXcgUmVjdGFuZ2xlKDAsIDAsIHdpZHRoLCBoZWlnaHQpKTtcblx0XHR0aGlzLnBub2RlLmNvbXB1dGVOb3JtYWwod2lkdGgsIGhlaWdodCk7XG5cdH07XG5cblx0RHluYW1pY1Nwcml0ZVNoZWV0LnByb3RvdHlwZSA9IG5ldyBUSFJFRS5FdmVudERpc3BhdGNoZXIoKTtcblx0RHluYW1pY1Nwcml0ZVNoZWV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IER5bmFtaWNTcHJpdGVTaGVldDtcblxuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5wbm9kZS5nZXQobmFtZSk7XG5cdH07XG5cblx0RHluYW1pY1Nwcml0ZVNoZWV0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihuYW1lLCBpbWFnZSkge1xuXHRcdGlmKGltYWdlID09PSB1bmRlZmluZWQgfHwgaW1hZ2UgPT09IG51bGwpIHJldHVybiBudWxsO1xuXHRcdGlmKHRoaXMuZ2V0KG5hbWUpICE9PSBudWxsKSByZXR1cm4gbnVsbDtcblx0XHR2YXIgbm9kZSA9IHRoaXMucG5vZGUuaW5zZXJ0KG5hbWUsIGltYWdlKTtcblx0XHRpZihub2RlKSB7XG5cdFx0XHR2YXIgcmVjdCA9IG5vZGUucmVjdDtcblx0XHRcdHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIHJlY3QueCwgcmVjdC55KTtcblx0XHRcdHRoaXMudGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdzcHJpdGVfYWRkZWQnfSk7XG5cdFx0fVxuXHRcdHJldHVybiBub2RlO1xuXHR9O1xuXG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24obmFtZSkge1xuXHRcdHZhciBub2RlID0gdGhpcy5wbm9kZS5kZWxldGUobmFtZSk7XG5cdFx0aWYobm9kZSkge1xuXHRcdFx0dmFyIHJlY3QgPSBub2RlLnJlY3Q7XG5cdFx0XHR0aGlzLmNvbnRleHQuY2xlYXJSZWN0KHJlY3QueCwgcmVjdC55LCByZWN0LndpZHRoLCByZWN0LmhlaWdodCk7XG5cdFx0XHR0aGlzLnRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnc3ByaXRlX3JlbW92ZWQnfSk7XG5cdFx0fVxuXHRcdHJldHVybiBub2RlO1xuXHR9O1xuXG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKG5hbWUsIHVybCkge1xuXG5cdH07XG5cblx0d2luZG93LkR5bmFtaWNTcHJpdGVTaGVldCA9IER5bmFtaWNTcHJpdGVTaGVldDtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBMaW5lUmVuZGVyZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5cdExpbmVSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcblxuXHRMaW5lUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH07XG5cblx0TGluZVJlbmRlcmVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH07XG5cblx0TGluZVJlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0dmFyIGZlYXR1cmVzID0gb3B0aW9ucy5mZWF0dXJlcyB8fCBbXTtcblx0XHR2YXIgc3Ryb2tlQ29sb3IgPSAob3B0aW9ucy5zdHJva2VDb2xvciAhPT0gbnVsbCAmJiBvcHRpb25zLnN0cm9rZUNvbG9yICE9PSB1bmRlZmluZWQpID8gb3B0aW9ucy5zdHJva2VDb2xvciA6IDB4RkZGRkZGO1xuXG5cdFx0aWYoZmVhdHVyZXMgPT09IG51bGwgfHwgZmVhdHVyZXMubGVuZ3RoID09PSAwKVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cblx0XHR2YXIgbGluZSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xuXG5cdFx0Ly8gaXRlcmF0ZSBldmVyeSBsaW5lIHdoaWNoIHNob3VsZCBjb250YWluIHRoZSBmb2xsb3dpbmcgYXJyYXk6XG5cdFx0Ly8gW2xpbmVzdHJpbmcgb3IgYXJyYXkgb2YgcG9pbnRzXVxuXHRcdGZvcih2YXIgaT0wOyBpPGZlYXR1cmVzLmxlbmd0aDsgaSsrKXtcblx0XHRcdHZhciBwb2x5Z29uICA9IGZlYXR1cmVzW2ldO1xuXHRcdFx0Zm9yKHZhciBqPTA7IGo8cG9seWdvbi5sZW5ndGg7IGorKykge1xuXHRcdFx0XHR2YXIgY29vcmRpbmF0ZSA9IHBvbHlnb25bal07XG5cdFx0XHRcdHZhciBwb2ludCA9IHt4OiBjb29yZGluYXRlWzBdLCB5OiBjb29yZGluYXRlWzFdfTtcblxuXHRcdFx0XHR2YXIgdmVydGV4MSA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50LngsIHBvaW50LnksIDEpO1xuXHRcdFx0XHRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MSk7XG5cblx0XHRcdFx0dmFyIGNvb3JkMCwgcG9pbnQwLCB2ZXJ0ZXgwO1xuXHRcdFx0XHRpZihqID09IHBvbHlnb24ubGVuZ3RoLTEpIHtcblx0XHRcdFx0XHRjb29yZDAgPSBwb2x5Z29uWzBdO1xuXHRcdFx0XHRcdHBvaW50MCA9IHt4OiBjb29yZDBbMF0sIHk6IGNvb3JkMFsxXX07XG5cdFx0XHRcdFx0dmVydGV4MCA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50MC54LCBwb2ludDAueSwgMSk7XG5cdFx0XHRcdFx0bGluZS52ZXJ0aWNlcy5wdXNoKHZlcnRleDApO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRjb29yZDAgPSBwb2x5Z29uW2orMV07XG5cdFx0XHRcdFx0cG9pbnQwID0ge3g6IGNvb3JkMFswXSwgeTogY29vcmQwWzFdfTtcblx0XHRcdFx0XHR2ZXJ0ZXgwID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQwLngsIHBvaW50MC55LCAxKTtcblx0XHRcdFx0XHRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cdFxuXHRcdH1cblxuXHRcdHZhciBsaW5lUG9seWdvbiA9IG5ldyBUSFJFRS5MaW5lU2VnbWVudHMobGluZSwgbmV3IFRIUkVFLkxpbmVCYXNpY01hdGVyaWFsKHtcblx0XHRcdGNvbG9yOiBzdHJva2VDb2xvcixcblx0XHRcdGxpbmV3aWR0aDogMixcblx0XHRcdG9wYWNpdHk6IDAuMjUsIFxuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXG5cdFx0XHRkZXB0aFdyaXRlOiBmYWxzZSxcblx0XHRcdGRlcHRoVGVzdDogZmFsc2Vcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4gbGluZVBvbHlnb247XG5cdH07XG5cblx0d2luZG93LkxpbmVSZW5kZXJlciA9IExpbmVSZW5kZXJlcjtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBPYmplY3RSZW5kZXJlciA9IGZ1bmN0aW9uKCkge307XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHsgXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbigpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cblx0fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24ob2JqZWN0KSB7XG5cblx0fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24ob2JqZWN0KSB7XG5cblx0fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuXG5cdH07XG5cblx0d2luZG93Lk9iamVjdFJlbmRlcmVyID0gT2JqZWN0UmVuZGVyZXI7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgdnNoYWRlciA9IFwiXCIgK1xuXHRcdFwidW5pZm9ybSBmbG9hdCBwb2ludFNpemU7XCIgK1xuXHRcdFwiYXR0cmlidXRlIHZlYzQgdGlsZTtcIiArXG5cdFx0XCJ2YXJ5aW5nIHZlYzQgdlRpbGU7XCIgK1xuXHRcdFwidmFyeWluZyB2ZWMzIHZDb2xvcjtcIiArXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIgK1xuXHRcdFwiXHR2ZWM0IG12UG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KHBvc2l0aW9uLCAxLjApO1wiICtcblx0XHRcIlx0Z2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcIiArXG5cdFx0XCJcdGdsX1BvaW50U2l6ZSA9IHBvaW50U2l6ZTtcIiArXG5cdFx0XCJcdHZUaWxlID0gdGlsZTtcIiArXG5cdFx0XCJcdHZDb2xvciA9IGNvbG9yO1wiICtcblx0XHRcIn1cIjtcblxuXHR2YXIgZnNoYWRlciA9IFwiXCIgK1xuXHRcdFwidW5pZm9ybSBzYW1wbGVyMkQgdGV4MTtcIiArXG5cdFx0XCJ1bmlmb3JtIHZlYzIgc3ByaXRlU2l6ZTtcIiArXG5cdFx0XCJ2YXJ5aW5nIHZlYzQgdlRpbGU7XCIgK1xuXHRcdFwidmFyeWluZyB2ZWMzIHZDb2xvcjtcIiArXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIgK1xuXHRcdFwiXHR2ZWMyIHRpbGVVViA9IHZUaWxlLnh5ICsgdlRpbGUuencgKiBnbF9Qb2ludENvb3JkO1wiICtcblx0XHRcIlx0Z2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHRleDEsIHRpbGVVVikgKiB2ZWM0KHZDb2xvci5yZ2IsIDEuMCk7XCIgK1xuXHRcdFwifVwiO1xuXG5cdHZhciBNQVhfQ09VTlQgPSBNYXRoLnBvdygyLDMyKSAtIDE7XG5cdHZhciBTVEFSVF9WQUxVRSA9IC05OTk5OS4wO1xuXG5cdHZhciBNYXJrZXIgPSBmdW5jdGlvbigpIHt9O1xuXHRNYXJrZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShUSFJFRS5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuXHR2YXIgUG9pbnRSZW5kZXJlciA9IGZ1bmN0aW9uKHdlYkdsVmlldykge1xuXHRcdHRoaXMud2ViR2xWaWV3ID0gd2ViR2xWaWV3O1xuXHRcdHRoaXMucG9pbnRTaXplID0gMzIuMDtcblxuXHRcdHRoaXMucmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuXHRcdHRoaXMubW91c2UgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuXHRcdHRoaXMubWFya2VycyA9IHt9O1xuXHRcdHRoaXMuaG92ZXJlZE1hcmtlciA9IG51bGw7XG5cblx0XHR0aGlzLm1pbkluZGV4ID0gTUFYX0NPVU5UO1xuXHRcdHRoaXMubWF4SW5kZXggPSAwO1xuXHRcdHRoaXMuaW5kZXggPSAwO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnBvc2l0aW9ucyA9IG5ldyBGbG9hdDMyQXJyYXkoMTAwMDAwMCAqIDMpO1xuXHRcdHRoaXMucG9zaXRpb25zLmZpbGwoU1RBUlRfVkFMVUUpO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh0aGlzLnBvc2l0aW9ucywgMyk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMuY29sb3JzID0gbmV3IEZsb2F0MzJBcnJheSgxMDAwMDAwICogMyk7XG5cdFx0dGhpcy5jb2xvcnNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMuY29sb3JzLCAzKTtcblx0XHR0aGlzLmNvbG9yc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy50aWxlcyA9IG5ldyBGbG9hdDMyQXJyYXkoMTAwMDAwMCAqIDQpOyBcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh0aGlzLnRpbGVzLCA0KTsgXG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy5nZW9tZXRyeSA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIHRoaXMucG9zaXRpb25zQXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgnY29sb3InLCB0aGlzLmNvbG9yc0F0dHJpYnV0ZSk7XG5cdFx0dGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ3RpbGUnLCB0aGlzLnRpbGVzQXR0cmlidXRlKTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgRHluYW1pY1Nwcml0ZVNoZWV0KDI1NiwgMjU2KTtcblx0XHR0aGlzLm1hdGVyaWFsID0gbmV3IFRIUkVFLlNoYWRlck1hdGVyaWFsKCB7XG5cdFx0XHR1bmlmb3Jtczoge1xuXHRcdFx0XHR0ZXgxOiB7IHR5cGU6IFwidFwiLCB2YWx1ZTogdGhpcy5zcHJpdGVTaGVldC50ZXh0dXJlIH0sXG5cdFx0XHRcdHBvaW50U2l6ZTogeyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMucG9pbnRTaXplIH1cblx0XHRcdH0sXG5cdFx0XHR2ZXJ0ZXhDb2xvcnM6IFRIUkVFLlZlcnRleENvbG9ycyxcblx0XHRcdHZlcnRleFNoYWRlcjogdnNoYWRlcixcblx0XHRcdGZyYWdtZW50U2hhZGVyOiBmc2hhZGVyLFxuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXG5cdFx0XHRkZXB0aFdyaXRlOiBmYWxzZSxcblx0XHRcdGRlcHRoVGVzdDogZmFsc2Vcblx0XHR9KTtcblxuXHRcdHRoaXMuc2NlbmVPYmplY3QgPSBuZXcgVEhSRUUuUG9pbnRzKHRoaXMuZ2VvbWV0cnksIHRoaXMubWF0ZXJpYWwpO1xuXHRcdHRoaXMucmF5Y2FzdE9iamVjdHMgPSBbdGhpcy5zY2VuZU9iamVjdF07XG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbWFwID0gdGhpcy53ZWJHbFZpZXcuZ2V0TWFwKCk7XG5cdFx0Z29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIobWFwLCAnbW91c2Vtb3ZlJywgdGhpcy5oYW5kbGVEb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpKTtcblx0XHRnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXAsICdjbGljaycsIHRoaXMuaGFuZGxlRG9jdW1lbnRNb3VzZUNsaWNrLmJpbmQodGhpcykpO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLmhhbmRsZURvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHR0aGlzLnVwZGF0ZShldmVudCk7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlRG9jdW1lbnRNb3VzZUNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHR0aGlzLnVwZGF0ZShldmVudCk7XG5cdFx0aWYodGhpcy5ob3ZlcmVkTWFya2VyKSBcblx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlci5kaXNwYXRjaEV2ZW50KHt0eXBlOiBcImNsaWNrXCJ9KTtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5fY3JlYXRlTWFya2VyID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHR2YXIgbWFya2VyID0gbmV3IE1hcmtlcigpO1xuXHRcdG1hcmtlci5pbmRleCA9IGluZGV4O1xuXHRcdHRoaXMubWFya2Vyc1tpbmRleF0gPSBtYXJrZXI7XG5cdFx0cmV0dXJuIG1hcmtlcjtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIGFycmF5SW5kZXggPSB0aGlzLmluZGV4ICogMztcblx0XHR3aGlsZShhcnJheUluZGV4IDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoICYmIHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXhdICE9PSBTVEFSVF9WQUxVRSlcblx0XHRcdGFycmF5SW5kZXggPSArK3RoaXMuaW5kZXgqMztcblxuXHRcdGlmKGFycmF5SW5kZXggPj0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoKXtcblx0XHRcdC8vIVRPRE86IEV4cGFuZCBwb2ludHMgYnVmZmVyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltQb2ludFJlbmRlcmVyXSBSdW4gb3V0IG9mIHBvaW50cyEhIVwiKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHRvcHRpb25zLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbiB8fCB7eDowLCB5OjAsIHo6MH07XG5cdFx0b3B0aW9ucy5jb2xvciA9IG9wdGlvbnMuY29sb3IgfHwge3I6MSwgZzoxLCBiOjF9O1xuXG5cdFx0dGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleCArIDBdID0gb3B0aW9ucy5wb3NpdGlvbi54O1xuXHRcdHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXggKyAxXSA9IG9wdGlvbnMucG9zaXRpb24ueTtcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMl0gPSBvcHRpb25zLnBvc2l0aW9uLno7XG5cblx0XHR0aGlzLmNvbG9yc1thcnJheUluZGV4ICsgMF0gPSBvcHRpb25zLmNvbG9yLnI7XG5cdFx0dGhpcy5jb2xvcnNbYXJyYXlJbmRleCArIDFdID0gb3B0aW9ucy5jb2xvci5nO1xuXHRcdHRoaXMuY29sb3JzW2FycmF5SW5kZXggKyAyXSA9IG9wdGlvbnMuY29sb3IuYjtcblxuXHRcdHZhciBzcHJpdGUgPSB0aGlzLnNwcml0ZVNoZWV0LmdldChvcHRpb25zLmltYWdlTmFtZSk7XG5cdFx0aWYoIXNwcml0ZSkge1xuXHRcdFx0c3ByaXRlID0gdGhpcy5zcHJpdGVTaGVldC5hZGQob3B0aW9ucy5pbWFnZU5hbWUsIG9wdGlvbnMuaW1hZ2UpO1xuXHRcdFx0aWYoIXNwcml0ZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltQb2ludFJlbmRlcmVyXSBTcHJpdGVTaGVldCBhbHJlYWR5IGZ1bGwuXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgc3ByaXRlUmVjdCA9IHNwcml0ZSAhPT0gbnVsbCA/IHNwcml0ZS5ub3JtYWxSZWN0IDoge3g6MCwgeTowLCB3aWR0aDowLCBoZWlnaHQ6MH07XG5cdFx0dGhpcy50aWxlc1t0aGlzLmluZGV4KjQgKyAwXSA9IHNwcml0ZVJlY3QueDtcblx0XHR0aGlzLnRpbGVzW3RoaXMuaW5kZXgqNCArIDFdID0gc3ByaXRlUmVjdC55O1xuXHRcdHRoaXMudGlsZXNbdGhpcy5pbmRleCo0ICsgMl0gPSBzcHJpdGVSZWN0LndpZHRoO1xuXHRcdHRoaXMudGlsZXNbdGhpcy5pbmRleCo0ICsgM10gPSBzcHJpdGVSZWN0LmhlaWdodDtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNYXRoLm1pbih0aGlzLm1pbkluZGV4LCB0aGlzLmluZGV4KTtcblx0XHR0aGlzLm1heEluZGV4ID0gTWF0aC5tYXgodGhpcy5tYXhJbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0dmFyIG1hcmtlciA9IHRoaXMubWFya2Vyc1t0aGlzLmluZGV4XSB8fCB0aGlzLl9jcmVhdGVNYXJrZXIodGhpcy5pbmRleCk7XG5cdFx0bWFya2VyLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdHRoaXMuaW5kZXgrKztcblx0XHRyZXR1cm4gbWFya2VyO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdHZhciBhcnJheUluZGV4ID0gbWFya2VyLmluZGV4ICogMztcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMF0gPSBTVEFSVF9WQUxVRTtcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMV0gPSBTVEFSVF9WQUxVRTtcblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMl0gPSBTVEFSVF9WQUxVRTtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNYXRoLm1pbih0aGlzLm1pbkluZGV4LCBtYXJrZXIuaW5kZXgpO1xuXHRcdHRoaXMubWF4SW5kZXggPSBNYXRoLm1heCh0aGlzLm1heEluZGV4LCBtYXJrZXIuaW5kZXgpO1xuXG5cdFx0aWYodGhpcy5pbmRleCA+IG1hcmtlci5pbmRleCkgdGhpcy5pbmRleCA9IG1hcmtlci5pbmRleDtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oKSB7XG5cdFx0Ly8gb25seSB1cGRhdGUgcG9zaXRpb25zIHRoYXQgY2hhbmdlZCBieSBwYXNzaW5nIGEgcmFuZ2Vcblx0XHR0aGlzLm1pbkluZGV4ID0gKHRoaXMubWluSW5kZXggPT0gTUFYX0NPVU5UKSA/IDAgOiB0aGlzLm1pbkluZGV4O1xuXHRcdHZhciBuZWVkc1VwZGF0ZSA9IHRoaXMubWF4SW5kZXggIT0gdGhpcy5taW5JbmRleDtcblxuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqMztcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KjMrMyktKHRoaXMubWluSW5kZXgqMyk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHRoaXMuY29sb3JzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqMztcblx0XHR0aGlzLmNvbG9yc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KjMrMyktKHRoaXMubWluSW5kZXgqMyk7XG5cdFx0dGhpcy5jb2xvcnNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCo0O1xuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCo0KzQpLSh0aGlzLm1pbkluZGV4KjQpO1xuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdGlmKG5lZWRzVXBkYXRlKSB7XG5cdFx0XHR0aGlzLmdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXHRcdFx0dGhpcy5nZW9tZXRyeS5jb21wdXRlQm91bmRpbmdTcGhlcmUoKTtcblx0XHR9XG5cblx0XHR0aGlzLm1pbkluZGV4ID0gTUFYX0NPVU5UO1xuXHRcdHRoaXMubWF4SW5kZXggPSAwO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0aWYoZXZlbnQuY2xpZW50WCAhPT0gdW5kZWZpbmVkICYmIGV2ZW50LmNsaWVudFkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5tb3VzZS54ID0gKGV2ZW50LmNsaWVudFggLyB0aGlzLndlYkdsVmlldy53aWR0aCkgKiAyIC0gMTtcblx0XHRcdHRoaXMubW91c2UueSA9IC0oZXZlbnQuY2xpZW50WSAvIHRoaXMud2ViR2xWaWV3LmhlaWdodCkgKiAyICsgMTtcblx0XHR9ZWxzZSBpZihldmVudC5waXhlbCkge1xuXHRcdFx0dGhpcy5tb3VzZS54ID0gKGV2ZW50LnBpeGVsLnggLyB0aGlzLndlYkdsVmlldy53aWR0aCkgKiAyIC0gMTtcblx0XHRcdHRoaXMubW91c2UueSA9IC0oZXZlbnQucGl4ZWwueSAvIHRoaXMud2ViR2xWaWV3LmhlaWdodCkgKiAyICsgMTtcblx0XHR9XG5cblx0XHQvLyBjaGVjayBpZiB3ZSBoaXQgYW55IG9mIHRoZSBwb2ludHMgaW4gdGhlIHBhcnRpY2xlIHN5c3RlbVxuXHRcdHRoaXMucmF5Y2FzdGVyLnBhcmFtcy5Qb2ludHMudGhyZXNob2xkID0gMTYqMS9NYXRoLnBvdygyLCB0aGlzLndlYkdsVmlldy5zY2FsZSk7XG5cdFx0dGhpcy5yYXljYXN0ZXIuc2V0RnJvbUNhbWVyYSh0aGlzLm1vdXNlLCB0aGlzLndlYkdsVmlldy5jYW1lcmEpO1xuXHRcdHZhciBpbnRlcnNlY3Rpb25zID0gdGhpcy5yYXljYXN0ZXIuaW50ZXJzZWN0T2JqZWN0cyh0aGlzLnJheWNhc3RPYmplY3RzKTtcblx0XHRpbnRlcnNlY3Rpb24gPSAoaW50ZXJzZWN0aW9ucy5sZW5ndGgpID4gMCA/IGludGVyc2VjdGlvbnNbMF0gOiBudWxsO1xuXG5cdFx0Ly8gd2UgaGl0IHNvbWV0aGluZ1xuXHRcdGlmKGludGVyc2VjdGlvbikge1xuXHRcdFx0Ly8gZmlyc3QgdGltZSB0byBob3ZlciBzb21ldGhpbmdcblx0XHRcdGlmKHRoaXMuaG92ZXJlZE1hcmtlciA9PT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIgPSB0aGlzLm1hcmtlcnNbaW50ZXJzZWN0aW9uLmluZGV4XTtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdtb3VzZW92ZXInfSk7XG5cdFx0XHR9XG5cdFx0XHQvLyB3ZSdyZSBhbHJlYWR5IGhvdmVyaW5nIHNvbWV0aGluZyB0aGVuIHNvbWV0aGluZyBnb3QgaW4gdGhlIHdheVxuXHRcdFx0ZWxzZSBpZih0aGlzLmhvdmVyZWRNYXJrZXIuaW5kZXggIT0gaW50ZXJzZWN0aW9uLmluZGV4KSB7XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlci5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnbW91c2VvdXQnfSk7XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlciA9IHRoaXMubWFya2Vyc1tpbnRlcnNlY3Rpb24uaW5kZXhdO1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ21vdXNlb3Zlcid9KTtcblx0XHRcdH1cblx0XHRcdGlmKHRoaXMud2ViR2xWaWV3ICYmIHRoaXMud2ViR2xWaWV3Lm1hcClcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcubWFwLnNldE9wdGlvbnMoe2RyYWdnYWJsZUN1cnNvcjoncG9pbnRlcid9KTtcblx0XHR9XG5cdFx0Ly8gdGhlcmUncyBub3RoaW5nIHVuZGVyIHRoZSBtb3VzZVxuXHRcdGVsc2Uge1xuXHRcdFx0Ly8gd2UgbG9zdCBvdXIgb2JqZWN0LiBieWUgYnllXG5cdFx0XHRpZih0aGlzLmhvdmVyZWRNYXJrZXIgIT09IG51bGwpIHtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdtb3VzZW91dCd9KTtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyID0gbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmKHRoaXMud2ViR2xWaWV3ICYmIHRoaXMud2ViR2xWaWV3Lm1hcClcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcubWFwLnNldE9wdGlvbnMoe2RyYWdnYWJsZUN1cnNvcjpudWxsfSk7XG5cdFx0fVxuXHR9O1xuXG5cdHdpbmRvdy5Qb2ludFJlbmRlcmVyID0gUG9pbnRSZW5kZXJlcjtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBQb2x5Z29uUmVuZGVyZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5cdFBvbHlnb25SZW5kZXJlci5wcm90b3R5cGUgPSBuZXcgT2JqZWN0UmVuZGVyZXIoKTtcblx0UG9seWdvblJlbmRlcmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBvbHlnb25SZW5kZXJlcjtcblxuXHRQb2x5Z29uUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHR2YXIgZmVhdHVyZXMgPSBvcHRpb25zLmZlYXR1cmVzIHx8IFtdO1xuXHRcdHZhciBmaWxsQ29sb3IgPSAob3B0aW9ucy5maWxsQ29sb3IgIT09IG51bGwgJiYgb3B0aW9ucy5maWxsQ29sb3IgIT09IHVuZGVmaW5lZCkgPyBvcHRpb25zLmZpbGxDb2xvciA6IDB4MDAwMEZGO1xuXHRcdHZhciBzdHJva2VDb2xvciA9IChvcHRpb25zLnN0cm9rZUNvbG9yICE9PSBudWxsICYmIG9wdGlvbnMuc3Ryb2tlQ29sb3IgIT09IHVuZGVmaW5lZCkgPyBvcHRpb25zLnN0cm9rZUNvbG9yIDogMHhGRkZGRkY7XG5cblx0XHRpZihmZWF0dXJlcyA9PT0gbnVsbCB8fCBmZWF0dXJlcy5sZW5ndGggPT09IDApXG5cdFx0XHRyZXR1cm4gbnVsbDtcblxuXHRcdHZhciBnZW9tZXRyeSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xuXHRcdHZhciBvdXRsaW5lID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XG5cdFx0dmFyIHZlcnRleE9mZnNldCA9IGdlb21ldHJ5LnZlcnRpY2VzLmxlbmd0aDtcblx0XHR2YXIgbnVtUG9seWdvbnMgPSAwO1xuXG5cdFx0Ly8gaXRlcmF0ZSBldmVyeSBwb2x5Z29uIHdoaWNoIHNob3VsZCBjb250YWluIHRoZSBmb2xsb3dpbmcgYXJyYXlzOlxuXHRcdC8vIFtvdXRlciBsb29wXSwgW2lubmVyIGxvb3AgMV0sIC4uLiwgW2lubmVyIGxvb3Agbl1cblx0XHRmb3IodmFyIGo9MDsgajxmZWF0dXJlcy5sZW5ndGg7IGorKyl7XG5cdFx0XHR2YXIgcG9seWdvbiAgPSBmZWF0dXJlc1tqXTtcblx0XHRcdGZvcih2YXIgcD0wOyBwPHBvbHlnb24ubGVuZ3RoOyBwKyspIHtcblx0XHRcdFx0dmFyIGxvb3AgPSBwb2x5Z29uW3BdO1xuXHRcdFx0XHR2YXIgcG9pbnRzID0gW10sIGhvbGVJbmRpY2VzID0gW10sIGhvbGVJbmRleCA9IDA7XG5cblx0XHRcdFx0Zm9yKHZhciBsPTA7IGw8bG9vcC5sZW5ndGg7IGwrKykge1xuXHRcdFx0XHRcdHZhciBjb29yZGluYXRlID0gbG9vcFtsXTtcblx0XHRcdFx0XHR2YXIgcG9pbnQgPSB7eDogY29vcmRpbmF0ZVswXSwgeTogY29vcmRpbmF0ZVsxXX07XG5cdFx0XHRcdFx0cG9pbnRzLnB1c2gocG9pbnQueCk7XG5cdFx0XHRcdFx0cG9pbnRzLnB1c2gocG9pbnQueSk7XG5cblx0XHRcdFx0XHR2YXIgdmVydGV4ID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQueCwgcG9pbnQueSwgMTAwMSk7XG5cdFx0XHRcdFx0Z2VvbWV0cnkudmVydGljZXMucHVzaCh2ZXJ0ZXgpO1xuXG5cdFx0XHRcdFx0dmFyIHZlcnRleDEgPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludC54LCBwb2ludC55LCAxKTtcblx0XHRcdFx0XHRvdXRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MSk7XG5cblx0XHRcdFx0XHR2YXIgY29vcmQwLCBwb2ludDAsIHZlcnRleDA7XG5cdFx0XHRcdFx0aWYobCA9PSBsb29wLmxlbmd0aC0xKSB7XG5cdFx0XHRcdFx0XHRjb29yZDAgPSBsb29wWzBdO1xuXHRcdFx0XHRcdFx0cG9pbnQwID0ge3g6IGNvb3JkMFswXSwgeTogY29vcmQwWzFdfTtcblx0XHRcdFx0XHRcdHZlcnRleDAgPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludDAueCwgcG9pbnQwLnksIDEpO1xuXHRcdFx0XHRcdFx0b3V0bGluZS52ZXJ0aWNlcy5wdXNoKHZlcnRleDApO1xuXHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0Y29vcmQwID0gbG9vcFtsKzFdO1xuXHRcdFx0XHRcdFx0cG9pbnQwID0ge3g6IGNvb3JkMFswXSwgeTogY29vcmQwWzFdfTtcblx0XHRcdFx0XHRcdHZlcnRleDAgPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludDAueCwgcG9pbnQwLnksIDEpO1xuXHRcdFx0XHRcdFx0b3V0bGluZS52ZXJ0aWNlcy5wdXNoKHZlcnRleDApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHA+MCkgaG9sZUluZGljZXMucHVzaChob2xlSW5kZXgpO1xuXHRcdFx0XHRob2xlSW5kZXggKz0gbG9vcC5sZW5ndGg7XG5cblx0XHRcdFx0dmFyIHRyaXMgPSBlYXJjdXQocG9pbnRzLCBudWxsLCAyKTtcblx0XHRcdFx0Zm9yKHZhciBrPTA7IGs8dHJpcy5sZW5ndGg7IGsrPTMpIHtcblx0XHRcdFx0XHQvLyAyLTEtMCBtZWFucyBmYWNlIHVwXG5cdFx0XHRcdFx0dmFyIGZhY2UgPSBuZXcgVEhSRUUuRmFjZTMoXG5cdFx0XHRcdFx0XHR0cmlzW2srMl0gKyB2ZXJ0ZXhPZmZzZXQsIFxuXHRcdFx0XHRcdFx0dHJpc1trKzFdICsgdmVydGV4T2Zmc2V0LCBcblx0XHRcdFx0XHRcdHRyaXNbayswXSArIHZlcnRleE9mZnNldFxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0Z2VvbWV0cnkuZmFjZXMucHVzaChmYWNlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2ZXJ0ZXhPZmZzZXQgPSBnZW9tZXRyeS52ZXJ0aWNlcy5sZW5ndGg7XG5cdFx0XHRcdG51bVBvbHlnb25zKys7XG5cdFx0XHR9XHRcblx0XHR9XG5cblx0XHR2YXIgY292ZXJhZ2VQb2x5Z29uID0gbmV3IFRIUkVFLk1lc2goZ2VvbWV0cnksIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRjb2xvcjogZmlsbENvbG9yLFxuXHRcdFx0b3BhY2l0eTogMC4yNSwgXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pKTtcblxuXHRcdHZhciBvdXRsaW5lUG9seWdvbiA9IG5ldyBUSFJFRS5MaW5lU2VnbWVudHMob3V0bGluZSwgbmV3IFRIUkVFLkxpbmVCYXNpY01hdGVyaWFsKHtcblx0XHRcdGNvbG9yOiBzdHJva2VDb2xvcixcblx0XHRcdGxpbmV3aWR0aDogMixcblx0XHRcdG9wYWNpdHk6IDAuMjUsIFxuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXG5cdFx0XHRkZXB0aFdyaXRlOiBmYWxzZSxcblx0XHRcdGRlcHRoVGVzdDogZmFsc2Vcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4ge3NoYXBlOiBjb3ZlcmFnZVBvbHlnb24sIG91dGxpbmU6IG91dGxpbmVQb2x5Z29ufTtcblx0fTtcblxuXHR3aW5kb3cuUG9seWdvblJlbmRlcmVyID0gUG9seWdvblJlbmRlcmVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIHZzaGFkZXIgPSBcIlwiICtcblx0XHRcImF0dHJpYnV0ZSB2ZWM0IHRpbGU7XCIgK1xuXHRcdFwidmFyeWluZyB2ZWMyIHZVdjtcIiArXG5cdFx0XCJ2YXJ5aW5nIHZlYzQgdlRpbGU7XCIgK1xuXHRcdFwidm9pZCBtYWluKCkge1wiICtcblx0XHRcIlx0dmVjNCBtdlBvc2l0aW9uID0gbW9kZWxWaWV3TWF0cml4ICogdmVjNChwb3NpdGlvbiwgMS4wKTtcIiArXG5cdFx0XCJcdGdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIG12UG9zaXRpb247XCIgK1xuXHRcdFwiXHR2VXYgPSB1djtcIiArXG5cdFx0XCJcdHZUaWxlID0gdGlsZTtcIiArXG5cdFx0XCJ9XCI7XG5cblx0dmFyIGZzaGFkZXIgPSBcIlwiICtcblx0XHRcInVuaWZvcm0gc2FtcGxlcjJEIHRleDE7XCIgK1xuXHRcdFwidW5pZm9ybSBmbG9hdCBhbHBoYTtcIiArXG5cdFx0XCJ2YXJ5aW5nIHZlYzIgdlV2O1wiICtcblx0XHRcInZhcnlpbmcgdmVjNCB2VGlsZTtcIiArXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIgK1xuXHRcdFwiXHR2ZWMyIHV2ID0gdlRpbGUueHkgKyB2VGlsZS56dyAqIHZVdjtcIiArXG5cdFx0XCJcdGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh0ZXgxLCB1dikgKiB2ZWM0KDEsIDEsIDEsIGFscGhhKTtcIiArXG5cdFx0XCJ9XCI7XG5cblx0dmFyIE1BWF9DT1VOVCA9IE1hdGgucG93KDIsMzIpIC0gMTtcblx0dmFyIFNUQVJUX1ZBTFVFID0gLTk5OTk5LjA7XG5cblx0dmFyIFBPU0lUSU9OX0lOVEVSVkFMID0gMyo0OyAvLyAzIGRpbWVuc2lvbnMgcGVyIHZlcnRleCwgNCB2ZXJ0ZXggcGVyIHNwcml0ZVxuXHR2YXIgSU5ERVhfSU5URVJWQUwgPSAzKjI7IC8vIDMgaW5kZXggcGVyIHRyaSwgMiB0cmkgcGVyIHNwcml0ZVxuXHR2YXIgVVZfSU5URVJWQUwgPSAyKjQ7IC8vIDIgdXYgcGVyIHZlcnRleCwgNCB2ZXJ0ZXggcGVyIHNwcml0ZVxuXHR2YXIgVElMRV9JTlRFUlZBTCA9IDQqNDsgLy8gb2Zmc2V0KHgseSkgKyBzaXplKHdpZHRoLCBoZWlndCkgcGVyIHZlcnRleCwgNCB2ZXJ0ZXggcGVyIHNwcml0ZVxuXG5cdHZhciBTcHJpdGVSZW5kZXJlciA9IGZ1bmN0aW9uKCl7XG5cdFx0dGhpcy5taW5JbmRleCA9IE1BWF9DT1VOVDtcblx0XHR0aGlzLm1heEluZGV4ID0gMDtcblx0XHR0aGlzLmluZGV4ID0gMDtcblx0XHR0aGlzLnNwcml0ZXMgPSBbXTtcblx0XHR0aGlzLm9wYWNpdHkgPSAwLjg7XG5cdH07XG5cblx0U3ByaXRlUmVuZGVyZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnBvc2l0aW9ucyA9IG5ldyBGbG9hdDMyQXJyYXkoMTAyNCpQT1NJVElPTl9JTlRFUlZBTCk7IFxuXHRcdHRoaXMucG9zaXRpb25zLmZpbGwoU1RBUlRfVkFMVUUpO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh0aGlzLnBvc2l0aW9ucywgMyk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMuaW5kaWNlcyA9IG5ldyBVaW50MTZBcnJheSgxMDI0KklOREVYX0lOVEVSVkFMKTsgXG5cdFx0dGhpcy5pbmRpY2VzQXR0cmlidXRlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh0aGlzLmluZGljZXMsIDEpO1xuXHRcdHRoaXMuaW5kaWNlc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy51diA9IG5ldyBGbG9hdDMyQXJyYXkoMTAyNCpVVl9JTlRFUlZBTCk7IFxuXHRcdHRoaXMudXZBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMudXYsIDIpOyBcblx0XHR0aGlzLnV2QXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLnRpbGVzID0gbmV3IEZsb2F0MzJBcnJheSgxMDI0KlRJTEVfSU5URVJWQUwpOyBcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh0aGlzLnRpbGVzLCA0KTsgXG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy5nZW9tZXRyeSA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuc2V0SW5kZXgodGhpcy5pbmRpY2VzQXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCB0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZSk7XG5cdFx0dGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ3V2JywgdGhpcy51dkF0dHJpYnV0ZSk7XG5cdFx0dGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ3RpbGUnLCB0aGlzLnRpbGVzQXR0cmlidXRlKTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgRHluYW1pY1Nwcml0ZVNoZWV0KDQwOTYsIDQwOTYpO1xuXHRcdHRoaXMubWF0ZXJpYWwgPSBuZXcgVEhSRUUuU2hhZGVyTWF0ZXJpYWwoIHtcblx0XHRcdHVuaWZvcm1zOiB7XG5cdFx0XHRcdHRleDE6IHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLnNwcml0ZVNoZWV0LnRleHR1cmUgfSxcblx0XHRcdFx0YWxwaGE6IHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLm9wYWNpdHkgfVxuXHRcdFx0fSxcblx0XHRcdHZlcnRleFNoYWRlcjogdnNoYWRlcixcblx0XHRcdGZyYWdtZW50U2hhZGVyOiBmc2hhZGVyXG5cdFx0fSk7XG5cblx0XHR0aGlzLnNjZW5lT2JqZWN0ID0gbmV3IFRIUkVFLk1lc2godGhpcy5nZW9tZXRyeSwgdGhpcy5tYXRlcmlhbCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRTcHJpdGVSZW5kZXJlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHZhciBwb3NpdGlvbkluZGV4ID0gdGhpcy5pbmRleCpQT1NJVElPTl9JTlRFUlZBTDtcblx0XHR3aGlsZShwb3NpdGlvbkluZGV4IDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoICYmIHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXhdICE9PSBTVEFSVF9WQUxVRSlcblx0XHRcdHBvc2l0aW9uSW5kZXggPSArK3RoaXMuaW5kZXgqUE9TSVRJT05fSU5URVJWQUw7XG5cblx0XHRpZihwb3NpdGlvbkluZGV4ID49IHRoaXMucG9zaXRpb25zLmxlbmd0aCl7XG5cdFx0XHQvLyFUT0RPOiBFeHBhbmQgcG9pbnRzIGJ1ZmZlclxuXHRcdFx0Y29uc29sZS5sb2coXCJbU3ByaXRlUmVuZGVyZXJdIFJ1biBvdXQgb2YgcG9pbnRzISEhXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBpbWFnZSA9IG9wdGlvbnMuaW1hZ2U7XG5cdFx0dmFyIGltYWdlTmFtZSA9IG9wdGlvbnMuaW1hZ2VOYW1lO1xuXHRcdHZhciBzcHJpdGUgPSB0aGlzLnNwcml0ZVNoZWV0LmdldChpbWFnZU5hbWUpO1xuXHRcdGlmKCFzcHJpdGUpIHtcblx0XHRcdHNwcml0ZSA9IHRoaXMuc3ByaXRlU2hlZXQuYWRkKGltYWdlTmFtZSwgaW1hZ2UpO1xuXHRcdFx0aWYoIXNwcml0ZSkge1xuXHRcdFx0XHQvLyFUT0RPOiBDcmVhdGUgYSBuZXcgc3ByaXRlIHNoZWV0IGlmIHRoaXMgb25lIGdldHMgZnVsbFxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltTcHJpdGVSZW5kZXJlcl0gU3ByaXRlU2hlZXQgYWxyZWFkeSBmdWxsLlwiKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHRvcHRpb25zLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbiB8fCB7eDowLCB5OjAsIHo6MH07XG5cdFx0b3B0aW9ucy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMjU2O1xuXHRcdG9wdGlvbnMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMjU2O1xuXHRcdG9wdGlvbnMuaW1hZ2VOYW1lID0gb3B0aW9ucy5pY29uIHx8IFwicmVkLWRvdFwiO1xuXG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDBdID0gb3B0aW9ucy5wb3NpdGlvbi54O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyAxXSA9IG9wdGlvbnMucG9zaXRpb24ueTtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgMl0gPSBvcHRpb25zLnBvc2l0aW9uLno7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDNdID0gb3B0aW9ucy5wb3NpdGlvbi54ICsgb3B0aW9ucy53aWR0aDtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgNF0gPSBvcHRpb25zLnBvc2l0aW9uLnk7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDVdID0gb3B0aW9ucy5wb3NpdGlvbi56O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA2XSA9IG9wdGlvbnMucG9zaXRpb24ueDtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgN10gPSBvcHRpb25zLnBvc2l0aW9uLnkgKyBvcHRpb25zLmhlaWdodDtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgOF0gPSBvcHRpb25zLnBvc2l0aW9uLno7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDldID0gb3B0aW9ucy5wb3NpdGlvbi54ICsgb3B0aW9ucy53aWR0aDtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsxMF0gPSBvcHRpb25zLnBvc2l0aW9uLnkgKyBvcHRpb25zLmhlaWdodDtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsxMV0gPSBvcHRpb25zLnBvc2l0aW9uLno7XG5cblx0XHR2YXIgYXJyYXlJbmRleCA9IHRoaXMuaW5kZXgqSU5ERVhfSU5URVJWQUw7XG5cdFx0dGhpcy5pbmRpY2VzW2FycmF5SW5kZXggKyAwXSA9IHRoaXMuaW5kZXgqNCArIDA7XG5cdFx0dGhpcy5pbmRpY2VzW2FycmF5SW5kZXggKyAxXSA9IHRoaXMuaW5kZXgqNCArIDI7XG5cdFx0dGhpcy5pbmRpY2VzW2FycmF5SW5kZXggKyAyXSA9IHRoaXMuaW5kZXgqNCArIDE7XG5cdFx0dGhpcy5pbmRpY2VzW2FycmF5SW5kZXggKyAzXSA9IHRoaXMuaW5kZXgqNCArIDE7XG5cdFx0dGhpcy5pbmRpY2VzW2FycmF5SW5kZXggKyA0XSA9IHRoaXMuaW5kZXgqNCArIDI7XG5cdFx0dGhpcy5pbmRpY2VzW2FycmF5SW5kZXggKyA1XSA9IHRoaXMuaW5kZXgqNCArIDM7XG5cblx0XHR2YXIgdXZJbmRleCA9IHRoaXMuaW5kZXgqVVZfSU5URVJWQUw7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgMF0gPSAwO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDFdID0gMDtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyAyXSA9IDE7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgM10gPSAwO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDRdID0gMDtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyA1XSA9IDE7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgNl0gPSAxO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDddID0gMTtcblxuXHRcdHZhciB0ID0gdGhpcy5pbmRleCpUSUxFX0lOVEVSVkFMO1xuXHRcdHRoaXMudGlsZXNbdCswXSA9IHRoaXMudGlsZXNbdCs0XSA9IHRoaXMudGlsZXNbdCs4XSA9IHRoaXMudGlsZXNbdCsxMl0gPSBzcHJpdGUubm9ybWFsUmVjdC54O1xuXHRcdHRoaXMudGlsZXNbdCsxXSA9IHRoaXMudGlsZXNbdCs1XSA9IHRoaXMudGlsZXNbdCs5XSA9IHRoaXMudGlsZXNbdCsxM10gPSBzcHJpdGUubm9ybWFsUmVjdC55O1xuXHRcdHRoaXMudGlsZXNbdCsyXSA9IHRoaXMudGlsZXNbdCs2XSA9IHRoaXMudGlsZXNbdCsxMF0gPSB0aGlzLnRpbGVzW3QrMTRdID0gc3ByaXRlLm5vcm1hbFJlY3Qud2lkdGg7XG5cdFx0dGhpcy50aWxlc1t0KzNdID0gdGhpcy50aWxlc1t0KzddID0gdGhpcy50aWxlc1t0KzExXSA9IHRoaXMudGlsZXNbdCsxNV0gPSBzcHJpdGUubm9ybWFsUmVjdC5oZWlnaHQ7XG5cblx0XHR0aGlzLm1pbkluZGV4ID0gTWF0aC5taW4odGhpcy5taW5JbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0dGhpcy5tYXhJbmRleCA9IE1hdGgubWF4KHRoaXMubWF4SW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdHJldHVybiB7aW5kZXg6IHRoaXMuaW5kZXgrKywgbmFtZTogaW1hZ2VOYW1lfTtcblx0fTtcblxuXHRTcHJpdGVSZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oc3ByaXRlKSB7XG5cdFx0dmFyIHBvc2l0aW9uSW5kZXggPSBzcHJpdGUuaW5kZXgqUE9TSVRJT05fSU5URVJWQUw7XG5cdFx0Zm9yKHZhciBpPTA7IGk8UE9TSVRJT05fSU5URVJWQUw7IGkrKykge1xuXHRcdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIGldID0gU1RBUlRfVkFMVUU7XG5cdFx0fVxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVtb3ZlKHNwcml0ZS5uYW1lKTtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNYXRoLm1pbih0aGlzLm1pbkluZGV4LCBzcHJpdGUuaW5kZXgpO1xuXHRcdHRoaXMubWF4SW5kZXggPSBNYXRoLm1heCh0aGlzLm1heEluZGV4LCBzcHJpdGUuaW5kZXgpO1xuXG5cdFx0aWYodGhpcy5pbmRleCA+IHNwcml0ZS5pbmRleCkgdGhpcy5pbmRleCA9IHNwcml0ZS5pbmRleDtcblx0fTtcblxuXHRTcHJpdGVSZW5kZXJlci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIG9ubHkgdXBkYXRlIHBvc2l0aW9ucyB0aGF0IGNoYW5nZWQgYnkgcGFzc2luZyBhIHJhbmdlXG5cdFx0dGhpcy5taW5JbmRleCA9ICh0aGlzLm1pbkluZGV4ID09IE1BWF9DT1VOVCkgPyAwIDogdGhpcy5taW5JbmRleDtcblx0XHR2YXIgbmVlZHNVcGRhdGUgPSB0aGlzLm1heEluZGV4ICE9IHRoaXMubWluSW5kZXg7XG5cblx0XHR2YXIgcCA9IFBPU0lUSU9OX0lOVEVSVkFMO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqcDtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KnArcCktKHRoaXMubWluSW5kZXgqcCk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHZhciBpID0gSU5ERVhfSU5URVJWQUw7XG5cdFx0dGhpcy5pbmRpY2VzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqaTtcblx0XHR0aGlzLmluZGljZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCppK2kpLSh0aGlzLm1pbkluZGV4KmkpO1xuXHRcdHRoaXMuaW5kaWNlc0F0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0dmFyIHUgPSBVVl9JTlRFUlZBTDtcblx0XHR0aGlzLnV2QXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqdTtcblx0XHR0aGlzLnV2QXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqdSt1KS0odGhpcy5taW5JbmRleCp1KTtcblx0XHR0aGlzLnV2QXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHR2YXIgdCA9IFRJTEVfSU5URVJWQUw7XG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5vZmZzZXQgPSB0aGlzLm1pbkluZGV4KnQ7XG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KnQrdCktKHRoaXMubWluSW5kZXgqdCk7XG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0aWYobmVlZHNVcGRhdGUpIHtcblx0XHRcdHRoaXMuZ2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nQm94KCk7XG5cdFx0XHR0aGlzLmdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ1NwaGVyZSgpO1xuXHRcdH1cblxuXHRcdHRoaXMubWluSW5kZXggPSBNQVhfQ09VTlQ7XG5cdFx0dGhpcy5tYXhJbmRleCA9IDA7XG5cdH07XG5cblx0d2luZG93LlNwcml0ZVJlbmRlcmVyID0gU3ByaXRlUmVuZGVyZXI7XG59KCkpO1xuIiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBTcHJpdGUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0dGhpcy5uYW1lID0gZGF0YS5uYW1lO1xuXHRcdHZhciB4ID0gZGF0YS54LFxuXHRcdFx0eSA9IGRhdGEueSxcblx0XHRcdHdpZHRoID0gZGF0YS53aWR0aCxcblx0XHRcdGhlaWdodCA9IGRhdGEuaGVpZ2h0O1xuXHRcdHRoaXMucmVjdCA9IG5ldyBSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG5cdH07XG5cblx0U3ByaXRlLnByb3RvdHlwZS5jb21wdXRlTm9ybWFsID0gZnVuY3Rpb24obWF4V2lkdGgsIG1heEhlaWdodCkge1xuXHRcdHRoaXMubm9ybWFsUmVjdCA9IHRoaXMucmVjdC5nZXROb3JtYWxpemVkUmVjdChtYXhXaWR0aCwgbWF4SGVpZ2h0KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHR2YXIgU3ByaXRlU2hlZXQgPSBmdW5jdGlvbih0ZXh0dXJlLCBzcHJpdGVzKSB7XG5cdFx0dGhpcy50ZXh0dXJlID0gdGV4dHVyZTtcblx0XHR0aGlzLnNwcml0ZXMgPSB7fTtcblxuXHRcdGZvcih2YXIgaT0wOyBpPHNwcml0ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuc3ByaXRlc1tzcHJpdGVzW2ldLm5hbWVdID0gbmV3IFNwcml0ZShzcHJpdGVzW2ldKVxuXHRcdFx0XHQuY29tcHV0ZU5vcm1hbCh0ZXh0dXJlLmltYWdlLndpZHRoLCB0ZXh0dXJlLmltYWdlLmhlaWdodCk7XG5cdFx0fVxuXHR9O1xuXG5cdFNwcml0ZVNoZWV0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihzcHJpdGVOYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaXRlc1tzcHJpdGVOYW1lXTtcblx0fTtcblxuXHR3aW5kb3cuU3ByaXRlU2hlZXQgPSBTcHJpdGVTaGVldDtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBDU1NfVFJBTlNGT1JNID0gKGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHR2YXIgcHJvcHMgPSBbXG5cdFx0XHQndHJhbnNmb3JtJyxcblx0XHRcdCdXZWJraXRUcmFuc2Zvcm0nLFxuXHRcdFx0J01velRyYW5zZm9ybScsXG5cdFx0XHQnT1RyYW5zZm9ybScsXG5cdFx0XHQnbXNUcmFuc2Zvcm0nXG5cdFx0XTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcHJvcCA9IHByb3BzW2ldO1xuXHRcdFx0aWYgKGRpdi5zdHlsZVtwcm9wXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJldHVybiBwcm9wO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcHJvcHNbMF07XG5cdH0pKCk7XG5cblx0dmFyIFdlYkdMVmlldyA9IGZ1bmN0aW9uKG1hcCkge1xuXHRcdHRoaXMuX21hcCA9IG1hcDtcblx0XHR0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5PcnRob2dyYXBoaWNDYW1lcmEoMCwgMjU1LCAwLCAyNTUsIC0zMDAwLCAzMDAwKTtcblx0XHR0aGlzLmNhbWVyYS5wb3NpdGlvbi56ID0gMTAwMDtcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG5cdFx0dGhpcy5zY2VuZU1hc2sgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoe1xuXHRcdFx0YWxwaGE6IHRydWUsXG5cdFx0XHRhbnRpYWxpYXNpbmc6IHRydWUsXG5cdFx0XHRjbGVhckNvbG9yOiAweDAwMDAwMCxcblx0XHRcdGNsZWFyQWxwaGE6IDBcblxuXHRcdH0pO1xuXHRcdHRoaXMucmVuZGVyZXIuc2V0UGl4ZWxSYXRpbyh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyk7XG5cdFx0dGhpcy5yZW5kZXJlci5hdXRvQ2xlYXIgPSBmYWxzZTtcblx0XHR0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQuc3R5bGVbXCJwb2ludGVyLWV2ZW50c1wiXSA9ICdub25lJztcblx0XHR0aGlzLmNvbnRleHQgPSB0aGlzLnJlbmRlcmVyLmNvbnRleHQ7XG5cdFx0dGhpcy5hbmltYXRpb25GcmFtZSA9IG51bGw7XG5cdFx0dGhpcy5vYmplY3RSZW5kZXJlcnMgPSBbXTtcblx0XHR0aGlzLm51bU1hc2tzID0gMDtcblxuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbWFwID0gdGhpcy5tYXA7XG5cdFx0XHR2YXIgYm91bmRzID0gbWFwLmdldEJvdW5kcygpO1xuXHRcdFx0dmFyIHRvcExlZnQgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxuXHRcdFx0XHRib3VuZHMuZ2V0Tm9ydGhFYXN0KCkubGF0KCksXG5cdFx0XHRcdGJvdW5kcy5nZXRTb3V0aFdlc3QoKS5sbmcoKVxuXHRcdFx0KTtcblxuXHRcdFx0Ly8gVHJhbnNsYXRlIHRoZSB3ZWJnbCBjYW52YXMgYmFzZWQgb24gbWFwcydzIGJvdW5kc1xuXHRcdFx0dmFyIGNhbnZhcyA9IHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudDtcblx0XHRcdHZhciBwb2ludCA9IHRoaXMuZ2V0UHJvamVjdGlvbigpLmZyb21MYXRMbmdUb0RpdlBpeGVsKHRvcExlZnQpO1xuXHRcdFx0Y2FudmFzLnN0eWxlW0NTU19UUkFOU0ZPUk1dID0gJ3RyYW5zbGF0ZSgnICsgTWF0aC5yb3VuZChwb2ludC54KSArICdweCwnICsgTWF0aC5yb3VuZChwb2ludC55KSArICdweCknO1xuXG5cdFx0XHQvLyBSZXNpemUgdGhlIHJlbmRlcmVyIC8gY2FudmFzIGJhc2VkIG9uIHNpemUgb2YgdGhlIG1hcFxuXHRcdFx0dmFyIGRpdiA9IG1hcC5nZXREaXYoKSwgXG5cdFx0XHRcdHdpZHRoID0gZGl2LmNsaWVudFdpZHRoLCBcblx0XHRcdFx0aGVpZ2h0ID0gZGl2LmNsaWVudEhlaWdodDtcblxuXHRcdFx0aWYgKHdpZHRoICE9PSB0aGlzLndpZHRoIHx8IGhlaWdodCAhPT0gdGhpcy5oZWlnaHQpe1xuXHRcdFx0XHR0aGlzLndpZHRoID0gd2lkdGg7XG5cdFx0XHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdFx0XHR0aGlzLnJlbmRlcmVyLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFVwZGF0ZSBjYW1lcmEgYmFzZWQgb24gbWFwIHpvb20gYW5kIHBvc2l0aW9uXG5cdFx0XHR2YXIgem9vbSA9IG1hcC5nZXRab29tKCk7XG5cdFx0XHR2YXIgc2NhbGUgPSBNYXRoLnBvdygyLCB6b29tKTtcblx0XHRcdHZhciBvZmZzZXQgPSBtYXAuZ2V0UHJvamVjdGlvbigpLmZyb21MYXRMbmdUb1BvaW50KHRvcExlZnQpO1xuXG5cdFx0XHR0aGlzLmNhbWVyYS5wb3NpdGlvbi54ID0gb2Zmc2V0Lng7XG5cdFx0XHR0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gb2Zmc2V0Lnk7XG5cblx0XHRcdHRoaXMuc2NhbGUgPSB6b29tO1xuXHRcdFx0dGhpcy5jYW1lcmEuc2NhbGUueCA9IHRoaXMud2lkdGggLyAyNTYgLyBzY2FsZTtcblx0XHRcdHRoaXMuY2FtZXJhLnNjYWxlLnkgPSB0aGlzLmhlaWdodCAvIDI1NiAvIHNjYWxlO1xuXHRcdH07XG5cblx0XHR0aGlzLmRyYXcgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0aW9uRnJhbWUpO1xuXHRcdFx0dGhpcy5hbmltYXRpb25GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmRlZmVycmVkUmVuZGVyLmJpbmQodGhpcykpO1xuXHRcdH07XG5cblx0XHR0aGlzLmRlZmVycmVkUmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXG5cdFx0XHR2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dCwgcmVuZGVyZXIgPSB0aGlzLnJlbmRlcmVyO1xuXHRcdFx0dmFyIG1hc2tFbmFibGVkID0gdGhpcy5udW1NYXNrcyA+IDA7XG5cblx0XHRcdGlmKG1hc2tFbmFibGVkKSB7XG5cdFx0XHRcdGNvbnRleHQuY29sb3JNYXNrKCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSApO1xuXHRcdFx0XHRjb250ZXh0LmRlcHRoTWFzayggZmFsc2UgKTtcblxuXHRcdFx0XHRjb250ZXh0LmVuYWJsZShjb250ZXh0LlNURU5DSUxfVEVTVCk7XG5cdFx0XHRcdGNvbnRleHQuc3RlbmNpbE9wKGNvbnRleHQuUkVQTEFDRSwgY29udGV4dC5SRVBMQUNFLCBjb250ZXh0LlJFUExBQ0UpO1xuXHRcdFx0XHRjb250ZXh0LnN0ZW5jaWxGdW5jKGNvbnRleHQuQUxXQVlTLCAwLCAweGZmZmZmZmZmKTtcblx0XHRcdFx0Y29udGV4dC5jbGVhclN0ZW5jaWwoMSk7XG5cblx0XHRcdFx0dGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5zY2VuZU1hc2ssIHRoaXMuY2FtZXJhLCBudWxsLCB0cnVlKTtcblxuXHRcdFx0XHRjb250ZXh0LmNvbG9yTWFzayh0cnVlLCB0cnVlLCB0cnVlLCB0cnVlKTtcblx0XHRcdFx0Y29udGV4dC5kZXB0aE1hc2sodHJ1ZSApO1xuXG5cdFx0XHRcdGNvbnRleHQuc3RlbmNpbEZ1bmMoY29udGV4dC5FUVVBTCwgMCwgMHhmZmZmZmZmZik7ICAvLyBkcmF3IGlmID09IDBcblx0XHRcdFx0Y29udGV4dC5zdGVuY2lsT3AoY29udGV4dC5LRUVQLCBjb250ZXh0LktFRVAsIGNvbnRleHQuS0VFUCk7XG5cdFx0XHR9XG5cblx0XHRcdGZvcih2YXIgaT0wOyBpPHRoaXMub2JqZWN0UmVuZGVyZXJzLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHR0aGlzLm9iamVjdFJlbmRlcmVyc1tpXS5kcmF3KCk7XG5cblx0XHRcdHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuc2NlbmUsIHRoaXMuY2FtZXJhLCBudWxsLCAhbWFza0VuYWJsZWQpO1xuXG5cdFx0XHRpZihtYXNrRW5hYmxlZCkge1xuXHRcdFx0XHRjb250ZXh0LmRpc2FibGUoY29udGV4dC5TVEVOQ0lMX1RFU1QpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdyZW5kZXInfSk7XG5cdFx0fTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlID0gXy5leHRlbmQobmV3IGdvb2dsZS5tYXBzLk92ZXJsYXlWaWV3KCksIG5ldyBUSFJFRS5FdmVudERpc3BhdGNoZXIoKSk7XG5cdFdlYkdMVmlldy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBXZWJHTFZpZXc7XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5nZXRNYXAgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fbWFwO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUub25BZGQgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmdldFBhbmVzKCkub3ZlcmxheUxheWVyLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2FkZGVkX3RvX2RvbSd9KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLm9uUmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGNhbnZhcyA9IHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudDtcblx0XHR0aGlzLmNhbnZhcy5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuY2FudmFzKTtcblx0XHR0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAncmVtb3ZlZF9mcm9tX2RvbSd9KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcblx0XHQvLyFUT0RPOiBSZW1vdmUgZGVwZW5kZW5jeSBvZiBQb2ludFJlbmRlcmVyIGZyb20gV2ViR0xWaWV3XG5cdFx0dGhpcy5wb2ludFJlbmRlcmVyID0gbmV3IFBvaW50UmVuZGVyZXIodGhpcykuaW5pdCgpO1xuXHRcdHRoaXMuc2NlbmUuYWRkKHRoaXMucG9pbnRSZW5kZXJlci5zY2VuZU9iamVjdCk7XG5cdFx0dGhpcy5zcHJpdGVSZW5kZXJlciA9IG5ldyBTcHJpdGVSZW5kZXJlcigpLmluaXQoKTtcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLnNwcml0ZVJlbmRlcmVyLnNjZW5lT2JqZWN0KTtcblx0XHR0aGlzLnBvbHlnb25SZW5kZXJlciA9IG5ldyBQb2x5Z29uUmVuZGVyZXIoKS5pbml0KCk7XG5cdFx0dGhpcy5saW5lUmVuZGVyZXIgPSBuZXcgTGluZVJlbmRlcmVyKCkuaW5pdCgpO1xuXHRcdC8vIGFkZCB0aGVtIHRvIGFuIGFycmF5IHNvIHdlIGNhbiBkcmF3L3VwZGF0ZSB0aGVtIGFsbCBsYXRlclxuXHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzLnB1c2godGhpcy5wb2ludFJlbmRlcmVyKTtcblx0XHR0aGlzLm9iamVjdFJlbmRlcmVycy5wdXNoKHRoaXMucG9seWdvblJlbmRlcmVyKTtcblx0XHR0aGlzLm9iamVjdFJlbmRlcmVycy5wdXNoKHRoaXMuc3ByaXRlUmVuZGVyZXIpO1xuXHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzLnB1c2godGhpcy5saW5lUmVuZGVyZXIpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNoYW5nZUhhbmRsZXIgPSBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgJ2JvdW5kc19jaGFuZ2VkJywgdGhpcy5kcmF3LmJpbmQodGhpcykpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHRnb29nbGUubWFwcy5ldmVudC5yZW1vdmVMaXN0ZW5lcih0aGlzLmNoYW5nZUhhbmRsZXIpO1xuXHRcdHRoaXMuY2hhbmdlSGFuZGxlciA9IG51bGw7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRPYmplY3QgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdHRoaXMuc2NlbmUuYWRkKGdlb21ldHJ5KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLnJlbW92ZU9iamVjdCA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZS5yZW1vdmUoZ2VvbWV0cnkpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkUG9pbnQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMucG9pbnRSZW5kZXJlci5hZGQob3B0aW9ucyk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVQb2ludCA9IGZ1bmN0aW9uKHBvaW50KSB7XG5cdFx0dGhpcy5wb2ludFJlbmRlcmVyLnJlbW92ZShwb2ludCk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRTcHJpdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3ByaXRlUmVuZGVyZXIuYWRkKG9wdGlvbnMpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlU3ByaXRlID0gZnVuY3Rpb24oc3ByaXRlKSB7XG5cdFx0dGhpcy5zcHJpdGVSZW5kZXJlci5yZW1vdmUoc3ByaXRlKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmNyZWF0ZUdlb21ldHJ5ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHZhciBnZW9tZXRyeSA9IHRoaXMucG9seWdvblJlbmRlcmVyLmNyZWF0ZShvcHRpb25zKTtcblx0XHRpZihnZW9tZXRyeSAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy5hZGRHZW9tZXRyeShnZW9tZXRyeSk7XG5cdFx0fVxuXHRcdHJldHVybiBnZW9tZXRyeTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmFkZEdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lLmFkZChnZW9tZXRyeS5zaGFwZSk7XG5cdFx0dGhpcy5zY2VuZS5hZGQoZ2VvbWV0cnkub3V0bGluZSk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZS5yZW1vdmUoZ2VvbWV0cnkuc2hhcGUpO1xuXHRcdHRoaXMuc2NlbmUucmVtb3ZlKGdlb21ldHJ5Lm91dGxpbmUpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuZGVzdHJveUdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHRkZWxldGUgZ2VvbWV0cnkuc2hhcGU7XG5cdFx0ZGVsZXRlIGdlb21ldHJ5Lm91dGxpbmU7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5jcmVhdGVMaW5lID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHZhciBnZW9tZXRyeSA9IHRoaXMubGluZVJlbmRlcmVyLmNyZWF0ZShvcHRpb25zKTtcblx0XHRpZihnZW9tZXRyeSAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy5hZGRMaW5lKGdlb21ldHJ5KTtcblx0XHR9XG5cdFx0cmV0dXJuIGdlb21ldHJ5O1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkTGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcblx0XHR0aGlzLnNjZW5lLmFkZChsaW5lKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucmVtb3ZlTGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcblx0XHR0aGlzLnNjZW5lLnJlbW92ZShsaW5lKTtcblx0fTtcblxuXHRXZWJHTFZpZXcuZGVzdHJveUxpbmUgPSBmdW5jdGlvbihsaW5lKSB7XG5cdFx0ZGVsZXRlIGxpbmU7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5jcmVhdGVNYXNrID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHZhciBtYXNrID0gdGhpcy5wb2x5Z29uUmVuZGVyZXIuY3JlYXRlKG9wdGlvbnMpO1xuXHRcdGlmKG1hc2sgIT09IG51bGwpIHtcblx0XHRcdHRoaXMuYWRkTWFzayhtYXNrKTtcblx0XHR9XG5cdFx0cmV0dXJuIG1hc2s7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRNYXNrID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lTWFzay5hZGQoZ2VvbWV0cnkuc2hhcGUpO1xuXHRcdHRoaXMuc2NlbmVNYXNrLmFkZChnZW9tZXRyeS5vdXRsaW5lKTtcblx0XHR0aGlzLm51bU1hc2tzKz0xO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlTWFzayA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZU1hc2sucmVtb3ZlKGdlb21ldHJ5LnNoYXBlKTtcblx0XHR0aGlzLnNjZW5lTWFzay5yZW1vdmUoZ2VvbWV0cnkub3V0bGluZSk7XG5cdFx0dGhpcy5udW1NYXNrcy09MTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmRlc3Ryb3lNYXNrID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHRkZWxldGUgZ2VvbWV0cnkuc2hhcGU7XG5cdFx0ZGVsZXRlIGdlb21ldHJ5Lm91dGxpbmU7XG5cdH07XG5cblx0d2luZG93LldlYkdMVmlldyA9IFdlYkdMVmlldztcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBodHRwID0ge307XG5cblx0aHR0cC5nZXQgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcblx0XHR2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XG5cdFx0dmFyIHJlc3BvbnNlVHlwZSA9IG9wdGlvbnMucmVzcG9uc2VUeXBlO1xuXHRcdGlmKHJlc3BvbnNlVHlwZSA9PT0gJ2Jsb2InKSB7XG5cdFx0XHR2YXIgaW1hZ2UgPSAkKFwiPGltZyAvPlwiKS5hdHRyKCdzcmMnLCB1cmwpLm9uKCdsb2FkJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7ZGF0YTppbWFnZVswXX0pO1xuXHRcdFx0fSk7XG5cdFx0fWVsc2V7XG5cdFx0XHQkLmFqYXgodXJsLCBvcHRpb25zKVxuXHRcdFx0XHQuc3VjY2VzcyhmdW5jdGlvbihkYXRhLCBzdGF0dXMsIHhocil7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7ZGF0YTpkYXRhLCBzdGF0dXM6c3RhdHVzLCB4aHI6eGhyfSk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5lcnJvcihmdW5jdGlvbih4aHIsIHN0YXR1cywgZXJyb3Ipe1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdCh7eGhyOnhociwgc3RhdHVzOnN0YXR1cywgZXJyb3I6ZXJyb3J9KTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHR9O1xuXG5cdHdpbmRvdy5odHRwID0gaHR0cDtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBDTFVTVEVSX1BJWEVMX1NJWkUgPSA2NDtcblxuXHR2YXIgQ2x1c3RlckNvbnRyb2xsZXIgPSBmdW5jdGlvbih3ZWJHbFZpZXcpIHtcblx0XHR0aGlzLndlYkdsVmlldyA9IHdlYkdsVmlldztcblx0XHR0aGlzLnZpZXdzID0gW107XG5cdH07XG5cblx0Q2x1c3RlckNvbnRyb2xsZXIucHJvdG90eXBlLnNldE1hcCA9IGZ1bmN0aW9uKG1hcCkge1xuXHRcdGlmKG1hcCkge1xuXHRcdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdFx0dGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRDbHVzdGVyQ29udHJvbGxlci5wcm90b3R5cGUuYWRkVmlldyA9IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgaW5kZXggPSB0aGlzLnZpZXdzLmluZGV4T2Yodmlldyk7XG5cdFx0aWYoaW5kZXggPCAwKSB0aGlzLnZpZXdzLnB1c2godmlldyk7XG5cdFx0dmFyIGIgPSB0aGlzLmJvdW5kcztcblx0XHR2aWV3LnNldENsdXN0ZXJQaXhlbFNpemUoQ0xVU1RFUl9QSVhFTF9TSVpFKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRDbHVzdGVyQ29udHJvbGxlci5wcm90b3R5cGUucmVtb3ZlVmlldyA9IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgaW5kZXggPSB0aGlzLnZpZXdzLmluZGV4T2Yodmlldyk7XG5cdFx0aWYoaW5kZXggPj0gMCkgdGhpcy52aWV3cy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdHZpZXcuY2xlYXIoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRDbHVzdGVyQ29udHJvbGxlci5wcm90b3R5cGUuX2FkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jaGFuZ2VMaXN0ZW5lciA9IGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCBcImJvdW5kc19jaGFuZ2VkXCIsIHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuXHR9O1xuXG5cdENsdXN0ZXJDb250cm9sbGVyLnByb3RvdHlwZS5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHRnb29nbGUubWFwcy5ldmVudC5yZW1vdmVMaXN0ZW5lcih0aGlzLmNoYW5nZUxpc3RlbmVyKTtcblx0fTtcblxuXHRDbHVzdGVyQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cblx0fTtcblxuXHR3aW5kb3cuQ2x1c3RlckNvbnRyb2xsZXIgPSBDbHVzdGVyQ29udHJvbGxlcjtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0dmFyIE1FUkNBVE9SX1JBTkdFID0gMjU2O1xuXG5cdGZ1bmN0aW9uIGNvbnZlcnRQb2ludFRvVGlsZShsYXRMbmcsIHpvb20sIHByb2plY3Rpb24pIHtcblx0XHR2YXIgd29ybGRDb29yZGluYXRlID0gcHJvamVjdGlvbi5mcm9tTGF0TG5nVG9Qb2ludChsYXRMbmcpO1xuXHRcdHZhciBwaXhlbENvb3JkaW5hdGUgPSB7eDogd29ybGRDb29yZGluYXRlLnggKiBNYXRoLnBvdygyLCB6b29tKSwgeTogd29ybGRDb29yZGluYXRlLnkgKiBNYXRoLnBvdygyLCB6b29tKX07XG5cdFx0dmFyIHRpbGVDb29yZGluYXRlID0ge3g6IE1hdGguZmxvb3IocGl4ZWxDb29yZGluYXRlLnggLyBNRVJDQVRPUl9SQU5HRSksIHk6IE1hdGguZmxvb3IocGl4ZWxDb29yZGluYXRlLnkgLyBNRVJDQVRPUl9SQU5HRSl9O1xuXHRcdHJldHVybiB0aWxlQ29vcmRpbmF0ZTtcblx0fVxuXG5cdHZhciBUaWxlQ29udHJvbGxlciA9IGZ1bmN0aW9uKHdlYkdsVmlldykge1xuXHRcdHRoaXMud2ViR2xWaWV3ID0gd2ViR2xWaWV3O1xuXHRcdHRoaXMuYm91bmRzID0gbmV3IFJlY3RhbmdsZSgwLCAwLCAwLCAwKTtcblx0XHR0aGlzLnpvb20gPSAwO1xuXHRcdHRoaXMubWluWm9vbSA9IDA7XG5cdFx0dGhpcy5tYXhab29tID0gMTA7XG5cdFx0dGhpcy5lbmFibGVkID0gZmFsc2U7XG5cdFx0dGhpcy52aWV3cyA9IFtdO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5zZXRNYXAgPSBmdW5jdGlvbihtYXApIHtcblx0XHRpZihtYXApIHtcblx0XHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0XHRcdHRoaXMuX2FkZEV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLmFkZFZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG5cdFx0dmFyIGluZGV4ID0gdGhpcy52aWV3cy5pbmRleE9mKHZpZXcpO1xuXHRcdGlmKGluZGV4IDwgMCkgdGhpcy52aWV3cy5wdXNoKHZpZXcpO1xuXHRcdHZhciBiID0gdGhpcy5ib3VuZHM7XG5cdFx0dmlldy5zZXRUaWxlU2l6ZShNRVJDQVRPUl9SQU5HRSk7XG5cdFx0dmlldy5zaG93VGlsZXMoYi51bHgsIGIudWx5LCBiLmxyeCwgYi5scnksIHRoaXMuem9vbSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLnJlbW92ZVZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG5cdFx0dmFyIGluZGV4ID0gdGhpcy52aWV3cy5pbmRleE9mKHZpZXcpO1xuXHRcdGlmKGluZGV4ID49IDApIHRoaXMudmlld3Muc3BsaWNlKGluZGV4LCAxKTtcblx0XHR2aWV3LmNsZWFyKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLl9hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY2hhbmdlTGlzdGVuZXIgPSBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgXCJib3VuZHNfY2hhbmdlZFwiLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuX3JlbW92ZUV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0Z29vZ2xlLm1hcHMuZXZlbnQucmVtb3ZlTGlzdGVuZXIodGhpcy5jaGFuZ2VMaXN0ZW5lcik7XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLmhhc0NoYW5nZWRab29tID0gZnVuY3Rpb24oem9vbSkge1xuXHRcdHJldHVybiB0aGlzLnpvb20gIT0gem9vbTtcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuaGFzQ2hhbmdlZEJvdW5kcyA9IGZ1bmN0aW9uKHZpc2libGVCb3VuZHMpIHtcblx0XHR2YXIgY3VycmVudEJvdW5kcyA9IHRoaXMuYm91bmRzO1xuXHRcdHJldHVybiBjdXJyZW50Qm91bmRzLnVseCAhPSB2aXNpYmxlQm91bmRzLnVseCB8fCBcblx0XHRcdGN1cnJlbnRCb3VuZHMudWx5ICE9IHZpc2libGVCb3VuZHMudWx5IHx8IFxuXHRcdFx0Y3VycmVudEJvdW5kcy5scnggIT0gdmlzaWJsZUJvdW5kcy5scnggfHwgXG5cdFx0XHRjdXJyZW50Qm91bmRzLmxyeSAhPSB2aXNpYmxlQm91bmRzLmxyeTtcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG1hcCA9IHRoaXMubWFwO1xuXHRcdHZhciBwcm9qZWN0aW9uID0gbWFwLmdldFByb2plY3Rpb24oKTtcblx0XHR2YXIgem9vbSA9IG1hcC5nZXRab29tKCk7XG5cdFx0em9vbSA9IE1hdGgubWF4KHRoaXMubWluWm9vbSwgem9vbSk7XG5cdFx0em9vbSA9IE1hdGgubWluKHRoaXMubWF4Wm9vbSwgem9vbSk7XG5cblx0XHR2YXIgYm91bmRzID0gbWFwLmdldEJvdW5kcygpLFxuXHRcdFx0Ym91bmRzTmVMYXRMbmcgPSBib3VuZHMuZ2V0Tm9ydGhFYXN0KCksXG5cdFx0XHRib3VuZHNTd0xhdExuZyA9IGJvdW5kcy5nZXRTb3V0aFdlc3QoKSxcblx0XHRcdGJvdW5kc053TGF0TG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhib3VuZHNOZUxhdExuZy5sYXQoKSwgYm91bmRzU3dMYXRMbmcubG5nKCkpLFxuXHRcdFx0Ym91bmRzU2VMYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGJvdW5kc1N3TGF0TG5nLmxhdCgpLCBib3VuZHNOZUxhdExuZy5sbmcoKSksXG5cdFx0XHRwcm9qZWN0aW9uID0gbWFwLmdldFByb2plY3Rpb24oKSxcblx0XHRcdHRpbGVDb29yZGluYXRlTncgPSBjb252ZXJ0UG9pbnRUb1RpbGUoYm91bmRzTndMYXRMbmcsIHpvb20sIHByb2plY3Rpb24pLFxuXHRcdFx0dGlsZUNvb3JkaW5hdGVTZSA9IGNvbnZlcnRQb2ludFRvVGlsZShib3VuZHNTZUxhdExuZywgem9vbSwgcHJvamVjdGlvbiksXG5cdFx0XHR2aXNpYmxlQm91bmRzID0gbmV3IFJlY3RhbmdsZSh0aWxlQ29vcmRpbmF0ZU53LngsIHRpbGVDb29yZGluYXRlTncueSwgXG5cdFx0XHRcdHRpbGVDb29yZGluYXRlU2UueC10aWxlQ29vcmRpbmF0ZU53LngsIHRpbGVDb29yZGluYXRlU2UueS10aWxlQ29vcmRpbmF0ZU53LnkpO1xuXG5cdFx0dmFyIGN1cnJlbnRCb3VuZHMgPSB0aGlzLmJvdW5kcztcblx0XHR2YXIgeCA9IE1hdGgubWluKGN1cnJlbnRCb3VuZHMudWx4LCB2aXNpYmxlQm91bmRzLnVseCksXG5cdFx0XHR5ID0gTWF0aC5taW4oY3VycmVudEJvdW5kcy51bHksIHZpc2libGVCb3VuZHMudWx5KSxcblx0XHRcdHdpZHRoID0gTWF0aC5tYXgoY3VycmVudEJvdW5kcy5scngsIHZpc2libGVCb3VuZHMubHJ4KSAtIHgsXG5cdFx0XHRoZWlnaHQgPSBNYXRoLm1heChjdXJyZW50Qm91bmRzLmxyeSwgdmlzaWJsZUJvdW5kcy5scnkpIC0geTtcblx0XHR2YXIgcmFuZ2UgPSBuZXcgUmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuXHRcdFxuXHRcdC8vIEhpZGUgZXZlcnl0aGluZyBpZiB3ZSBjaGFuZ2VkIHpvb20gbGV2ZWwuXG5cdFx0Ly8gVGhlbiBzZXQgdGhlIHJhbmdlIHRvIHVwZGF0ZSBvbmx5IHRoZSB2aXNpYmxlIHRpbGVzLlxuXHRcdGlmKHRoaXMuaGFzQ2hhbmdlZFpvb20oem9vbSkpIHtcblx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGFsbCBjdXJyZW50bHkgdmlzaWJsZSB0aWxlcyB3aWxsIGJlIGhpZGRlbi5cblx0XHRcdHRoaXMudXBkYXRlVGlsZXMoY3VycmVudEJvdW5kcywgY3VycmVudEJvdW5kcywgbmV3IFJlY3RhbmdsZSgtMSwgLTEsIDAsIDApLCB0aGlzLnpvb20pO1xuXHRcdFx0Ly8gVGhlbiBtYWtlIHN1cmUgdGhhdCBhbGwgdGlsZXMgdGhhdCBzaG91bGQgYmUgdmlzaWJsZSB3aWxsIGNhbGwgc2hvd1RpbGUgYmVsb3cuXG5cdFx0XHRjdXJyZW50Qm91bmRzID0gbmV3IFJlY3RhbmdsZSgtMSwgLTEsIDAsIDApO1xuXHRcdFx0Ly8gV2Ugb25seSBuZWVkIHRvIHVwZGF0ZSBhbGwgdmlzaWJsZSB0aWxlcyBiZWxvdy5cblx0XHRcdHJhbmdlID0gdmlzaWJsZUJvdW5kcztcblx0XHR9XG5cblx0XHQvLyBJdGVyYXRlIGFsbCB0aGUgbGF5ZXJzIHRvIHVwZGF0ZSB3aGljaCB0aWxlcyBhcmUgdmlzaWJsZS5cblx0XHRpZih0aGlzLmhhc0NoYW5nZWRCb3VuZHModmlzaWJsZUJvdW5kcykpIHtcblx0XHRcdHRoaXMudXBkYXRlVGlsZXMocmFuZ2UsIGN1cnJlbnRCb3VuZHMsIHZpc2libGVCb3VuZHMsIHpvb20pO1xuXHRcdH1cblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlVGlsZXMgPSBmdW5jdGlvbihyYW5nZSwgY3VycmVudEJvdW5kcywgdmlzaWJsZUJvdW5kcywgem9vbSkge1xuXHRcdHZhciB2aWV3cyA9IHRoaXMudmlld3M7XG5cdFx0Zm9yKHZhciBpPTA7IGk8dmlld3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdGZvcih2YXIgY29sdW1uPXJhbmdlLnVseDsgY29sdW1uPD1yYW5nZS5scng7IGNvbHVtbisrKSB7XG5cdFx0XHRcdGZvcih2YXIgcm93PXJhbmdlLnVseTsgcm93PD1yYW5nZS5scnk7IHJvdysrKSB7XG5cdFx0XHRcdFx0aWYodmlzaWJsZUJvdW5kcy5jb250YWluc1BvaW50KGNvbHVtbiwgcm93KSkge1xuXHRcdFx0XHRcdFx0Ly8gT25seSBzaG93VGlsZSBpZiBpdCdzIG5vdCBhbHJlYWR5IHZpc2libGVcblx0XHRcdFx0XHRcdGlmKCFjdXJyZW50Qm91bmRzLmNvbnRhaW5zUG9pbnQoY29sdW1uLCByb3cpKVxuXHRcdFx0XHRcdFx0XHR2aWV3c1tpXS5zaG93VGlsZShjb2x1bW4sIHJvdywgem9vbSk7XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHQvLyBIaWRlIHRpbGUgdGhhdCBpcyBjdXJyZW50bHkgdmlzaWJsZVxuXHRcdFx0XHRcdFx0aWYoY3VycmVudEJvdW5kcy5jb250YWluc1BvaW50KGNvbHVtbiwgcm93KSlcblx0XHRcdFx0XHRcdFx0dmlld3NbaV0uaGlkZVRpbGUoY29sdW1uLCByb3csIHpvb20pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHRcdH1cblx0XHR0aGlzLnpvb20gPSB6b29tO1xuXHRcdHRoaXMuYm91bmRzID0gdmlzaWJsZUJvdW5kcztcblx0fTtcblxuXHR3aW5kb3cuVGlsZUNvbnRyb2xsZXIgPSBUaWxlQ29udHJvbGxlcjtcbn0oKSk7XG4iLCIoZnVuY3Rpb24oKXtcblx0dmFyIEdlb0pTT05EYXRhU291cmNlID0gZnVuY3Rpb24odXJsLCBwcm9qZWN0aW9uKXtcblx0XHR0aGlzLnVybCA9IHVybDtcblx0XHR0aGlzLnByb2plY3Rpb24gPSBwcm9qZWN0aW9uO1xuXHRcdHRoaXMuZmlsZUV4dGVuc2lvbiA9IFwianNvblwiO1xuXHRcdHRoaXMucmVzcG9uc2VUeXBlID0gXCJqc29uXCI7XG5cdH07XG5cblx0R2VvSlNPTkRhdGFTb3VyY2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdHZhciBmZWF0dXJlQ29sbGVjdGlvbiA9IHtwb2x5Z29uczpbXSwgcG9pbnRzOltdLCBsaW5lczpbXX07XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBleHRyYWN0RmVhdHVyZXMgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHR2YXIgZmVhdHVyZSA9IHNlbGYuX3BhcnNlRmVhdHVyZShkYXRhKTtcblx0XHRcdGlmKGZlYXR1cmUucG9seWdvbnMubGVuZ3RoID4gMClcblx0XHRcdFx0ZmVhdHVyZUNvbGxlY3Rpb24ucG9seWdvbnMgPSBmZWF0dXJlQ29sbGVjdGlvbi5wb2x5Z29ucy5jb25jYXQoZmVhdHVyZS5wb2x5Z29ucyk7XG5cdFx0XHRpZihmZWF0dXJlLnBvaW50cy5sZW5ndGggPiAwKVxuXHRcdFx0XHRmZWF0dXJlQ29sbGVjdGlvbi5wb2ludHMgPSBmZWF0dXJlQ29sbGVjdGlvbi5wb2ludHMuY29uY2F0KGZlYXR1cmUucG9pbnRzKTtcblx0XHRcdGlmKGZlYXR1cmUubGluZXMubGVuZ3RoID4gMClcblx0XHRcdFx0ZmVhdHVyZUNvbGxlY3Rpb24ubGluZXMgPSBmZWF0dXJlQ29sbGVjdGlvbi5saW5lcy5jb25jYXQoZmVhdHVyZS5saW5lcyk7XG5cdFx0fVxuXHRcdGlmKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVDb2xsZWN0aW9uXCIpIHtcblx0XHRcdFx0dmFyIGZlYXR1cmVzID0gZGF0YS5mZWF0dXJlcztcblx0XHRcdFx0Zm9yKHZhciBpPTA7IGk8ZmVhdHVyZXMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdFx0ZXh0cmFjdEZlYXR1cmVzKGZlYXR1cmVzW2ldKTtcblx0XHRcdH1lbHNlIGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVcIikge1xuXHRcdFx0XHRleHRyYWN0RmVhdHVyZXMoZGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmZWF0dXJlQ29sbGVjdGlvbjtcblx0fTtcblxuXHRHZW9KU09ORGF0YVNvdXJjZS5wcm90b3R5cGUuX3BhcnNlRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpIHtcblx0XHR2YXIgcG9seWdvbnMgPSBbXSwgcG9pbnRzID0gW10sIGxpbmVzID0gW107XG5cdFx0aWYoZmVhdHVyZS5nZW9tZXRyeS50eXBlID09IFwiUG9seWdvblwiKSB7XG5cdFx0XHR2YXIgY29vcmRpbmF0ZXMgPSBmZWF0dXJlLmdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuXHRcdFx0dmFyIHBvbHlnb24gPSBbXTtcblx0XHRcdGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBsaW5lYXJSaW5nID0gY29vcmRpbmF0ZXNbaV07XG5cdFx0XHRcdHBvbHlnb24ucHVzaCh0aGlzLl9wYXJzZUNvb3JkaW5hdGVzKGxpbmVhclJpbmcpKTtcblx0XHRcdH1cblx0XHRcdHBvbHlnb25zLnB1c2gocG9seWdvbik7XG5cdFx0fVxuXHRcdGVsc2UgaWYoZmVhdHVyZS5nZW9tZXRyeS50eXBlID09IFwiTXVsdGlQb2x5Z29uXCIpIHtcblx0XHRcdHZhciBjb29yZGluYXRlcyA9IGZlYXR1cmUuZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG5cdFx0XHRmb3IodmFyIGk9MDsgaTxjb29yZGluYXRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgcG9seWdvbkNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZXNbaV07XG5cdFx0XHRcdHZhciBwb2x5Z29uID0gW107XG5cdFx0XHRcdGZvcih2YXIgaj0wOyBqPHBvbHlnb25Db29yZGluYXRlcy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdHZhciBsaW5lYXJSaW5nID0gcG9seWdvbkNvb3JkaW5hdGVzW2pdO1xuXHRcdFx0XHRcdHBvbHlnb24ucHVzaCh0aGlzLl9wYXJzZUNvb3JkaW5hdGVzKGxpbmVhclJpbmcpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwb2x5Z29ucy5wdXNoKHBvbHlnb24pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIGlmKGZlYXR1cmUuZ2VvbWV0cnkudHlwZSA9PSBcIkxpbmVTdHJpbmdcIikge1xuXHRcdFx0bGluZXMucHVzaCh0aGlzLl9wYXJzZUNvb3JkaW5hdGVzKGZlYXR1cmUuZ2VvbWV0cnkuY29vcmRpbmF0ZXMpKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihmZWF0dXJlLmdlb21ldHJ5LnR5cGUgPT0gXCJNdWx0aUxpbmVTdHJpbmdcIikge1xuXHRcdFx0dmFyIGNvb3JkaW5hdGVzID0gZmVhdHVyZS5nZW9tZXRyeS5jb29yZGluYXRlcztcblx0XHRcdGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBsaW5lU3RyaW5nID0gY29vcmRpbmF0ZXNbaV07XG5cdFx0XHRcdGxpbmVzLnB1c2godGhpcy5fcGFyc2VDb29yZGluYXRlcyhsaW5lU3RyaW5nKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2UgaWYoZmVhdHVyZS5nZW9tZXRyeS50eXBlID09IFwiUG9pbnRcIikge1xuXHRcdFx0dmFyIGNvb3JkaW5hdGVzID0gZmVhdHVyZS5nZW9tZXRyeS5jb29yZGluYXRlcztcblx0XHRcdHZhciBsYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGNvb3JkaW5hdGVzWzFdLCBjb29yZGluYXRlc1swXSk7XG5cdFx0XHR2YXIgcG9pbnQgPSB0aGlzLnByb2plY3Rpb24uZnJvbUxhdExuZ1RvUG9pbnQobGF0TG5nKTtcblx0XHRcdHBvaW50cy5wdXNoKHtsYXRMbmc6IGxhdExuZywgcG9pbnQ6IHBvaW50fSk7XG5cdFx0fVxuXHRcdHJldHVybiB7cG9seWdvbnM6cG9seWdvbnMsIHBvaW50czpwb2ludHMsIGxpbmVzOmxpbmVzfTtcblx0fTtcblxuXHRHZW9KU09ORGF0YVNvdXJjZS5wcm90b3R5cGUuX3BhcnNlQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbihjb29yZGluYXRlcykge1xuXHRcdHZhciBwb2ludHMgPSBbXTtcblx0XHRmb3IodmFyIGk9MDsgaTxjb29yZGluYXRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGxhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoY29vcmRpbmF0ZXNbaV1bMV0sIGNvb3JkaW5hdGVzW2ldWzBdKTtcblx0XHRcdHZhciBwb2ludCA9IHRoaXMucHJvamVjdGlvbi5mcm9tTGF0TG5nVG9Qb2ludChsYXRMbmcpO1xuXHRcdFx0cG9pbnRzLnB1c2goW3BvaW50LngsIHBvaW50LnldKTtcblx0XHR9XG5cdFx0cmV0dXJuIHBvaW50cztcblx0fTtcblxuXHR3aW5kb3cuR2VvSlNPTkRhdGFTb3VyY2UgPSBHZW9KU09ORGF0YVNvdXJjZTtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBJbWFnZURhdGFTb3VyY2UgPSBmdW5jdGlvbih1cmwpe1xuXHRcdHRoaXMudXJsID0gdXJsO1xuXHRcdHRoaXMuZmlsZUV4dGVuc2lvbiA9IFwicG5nXCI7XG5cdFx0dGhpcy5yZXNwb25zZVR5cGUgPSBcImJsb2JcIjtcblx0fTtcblxuXHRJbWFnZURhdGFTb3VyY2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSl7XG5cdFx0cmV0dXJuIGRhdGE7XG5cdH07XG5cblx0d2luZG93LkltYWdlRGF0YVNvdXJjZSA9IEltYWdlRGF0YVNvdXJjZTtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdC8qKlxuXHQgKiBTaXRlcyBUeXBlZCBBcnJheSAtIERhdGEgU291cmNlXG5cdCAqIEZvcm1hdDogVWludDMyQXJyYXlbaSo0XSB3aGVyZSBpIGlzIG51bWJlciBvZiBzaXRlc1xuXHQgKiBhcnJheVswXSA9IGxhdGl0dWRlXG5cdCAqIGFycmF5WzFdID0gbG9uZ2l0dWRlXG5cdCAqIGFycmF5WzJdID0gY2x1c3RlciBjb3VudC4gaWYgPiAxLCB0aGVuIGl0J3MgYSBjbHVzdGVyLiBpZiA9PSAxLCB0aGVuIGl0J3MgYSBwb2ludC5cblx0ICogYXJyYXlbM10gPSBzaXRlIGlkXG5cdCAqL1xuXHR2YXIgU1RBRGF0YVNvdXJjZSA9IGZ1bmN0aW9uKHVybCwgcHJvamVjdGlvbil7XG5cdFx0dGhpcy51cmwgPSB1cmw7XG5cdFx0dGhpcy5wcm9qZWN0aW9uID0gcHJvamVjdGlvbjtcblx0XHR0aGlzLmZpbGVFeHRlbnNpb24gPSBcIlwiO1xuXHRcdHRoaXMucmVzcG9uc2VUeXBlID0gXCJhcnJheWJ1ZmZlclwiO1xuXHR9O1xuXG5cdFNUQURhdGFTb3VyY2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdHZhciBwcm9qZWN0aW9uID0gdGhpcy5wcm9qZWN0aW9uO1xuXHRcdHZhciBkYXRhID0gbmV3IFVpbnQzMkFycmF5KHJlc3BvbnNlLmRhdGEpO1xuXHRcdHZhciBtYXJrZXJzID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSs9NCkge1xuXHRcdFx0dmFyIGxhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YVtpXS8xMDAwMDAwLjAsIGRhdGFbaSsxXS8xMDAwMDAwLjApO1xuXHRcdFx0dmFyIHBvaW50ID0gcHJvamVjdGlvbi5mcm9tTGF0TG5nVG9Qb2ludChsYXRMbmcpO1xuXHRcdFx0dmFyIGNvdW50ID0gZGF0YVtpKzJdO1xuXHRcdFx0dmFyIGlkICA9IGRhdGFbaSszXTtcblx0XHRcdG1hcmtlcnMucHVzaCh7aWQ6IGlkLCBjb3VudDogY291bnQsIGxhdExuZzogbGF0TG5nLCBwb2ludDogcG9pbnR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIG1hcmtlcnM7XG5cdH07XG5cblx0d2luZG93LlNUQURhdGFTb3VyY2UgPSBTVEFEYXRhU291cmNlO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIFRpbGVQcm92aWRlciA9IGZ1bmN0aW9uKGRhdGFTb3VyY2UsICRodHRwLCAkcSkge1xuXHRcdHRoaXMuZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2U7XG5cdFx0dGhpcy4kaHR0cCA9ICRodHRwO1xuXHRcdHRoaXMuJHEgPSAkcTtcblx0XHR0aGlzLnRpbGVzID0ge307XG5cdH07XG5cblx0VGlsZVByb3ZpZGVyLnByb3RvdHlwZS5nZXRUaWxlVXJsID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHJldHVybiB0aGlzLmRhdGFTb3VyY2UudXJsK1wiL1wiK3orXCIvXCIreCtcIi9cIit5K1wiLlwiK3RoaXMuZGF0YVNvdXJjZS5maWxlRXh0ZW5zaW9uO1xuXHR9O1xuXG5cdFRpbGVQcm92aWRlci5wcm90b3R5cGUuZ2V0VGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgZGVmZXJyZWQgPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dmFyIHVybCA9IHRoaXMuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHRpZih0aGlzLnRpbGVzW3VybF0pe1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7dXJsOnVybCwgZGF0YTp0aGlzLnRpbGVzW3VybF19KTtcblx0XHR9ZWxzZXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuJGh0dHAuZ2V0KHVybCwge3Jlc3BvbnNlVHlwZTogdGhpcy5kYXRhU291cmNlLnJlc3BvbnNlVHlwZX0pXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0gPSBzZWxmLmRhdGFTb3VyY2UucGFyc2UocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7dXJsOnVybCwgZGF0YTpzZWxmLnRpbGVzW3VybF19KTtcblx0XHRcdFx0fSwgZnVuY3Rpb24ocmVhc29uKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHR9O1xuXG5cdHdpbmRvdy5UaWxlUHJvdmlkZXIgPSBUaWxlUHJvdmlkZXI7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgSW1hZ2VUaWxlVmlldyA9IGZ1bmN0aW9uKHRpbGVQcm92aWRlciwgd2ViR2xWaWV3KSB7XG5cdFx0dGhpcy50aWxlUHJvdmlkZXIgPSB0aWxlUHJvdmlkZXI7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy50aWxlcyA9IHt9O1xuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLnNldFRpbGVTaXplID0gZnVuY3Rpb24odGlsZVNpemUpIHtcblx0XHR0aGlzLnRpbGVTaXplID0gdGlsZVNpemU7XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGVzID0gZnVuY3Rpb24odWx4LCB1bHksIGxyeCwgbHJ5LCB6b29tKSB7XG5cdFx0Zm9yKHZhciBjb2x1bW49dWx4OyBjb2x1bW48PWxyeDsgY29sdW1uKyspIHtcblx0XHRcdGZvcih2YXIgcm93PXVseTsgcm93PD1scnk7IHJvdysrKSB7XG5cdFx0XHRcdHRoaXMuc2hvd1RpbGUoY29sdW1uLCByb3csIHpvb20pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGUgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG5cdFx0dmFyIHVybCA9IHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGVVcmwoeCwgeSwgeik7XG5cdFx0aWYodGhpcy50aWxlc1t1cmxdKSB7XG5cdFx0XHRpZighdGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KSB7XG5cdFx0XHRcdHZhciBzY2FsZUZhY3RvciA9IE1hdGgucG93KDIsIHopO1xuXHRcdFx0XHR2YXIgc3ByaXRlU2l6ZSA9IHRoaXMudGlsZVNpemUgLyBzY2FsZUZhY3Rvcjtcblx0XHRcdFx0dmFyIHNwcml0ZU9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0cG9zaXRpb246IHt4Ongqc3ByaXRlU2l6ZSwgeTp5KnNwcml0ZVNpemUsIHo6en0sXG5cdFx0XHRcdFx0d2lkdGg6IHNwcml0ZVNpemUsXG5cdFx0XHRcdFx0aGVpZ2h0OiBzcHJpdGVTaXplLFxuXHRcdFx0XHRcdGltYWdlOiB0aGlzLnRpbGVzW3VybF0uZGF0YSxcblx0XHRcdFx0XHRpbWFnZU5hbWU6IHVybFxuXHRcdFx0XHR9O1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSB0aGlzLndlYkdsVmlldy5hZGRTcHJpdGUoc3ByaXRlT3B0aW9ucyk7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0XHRcdH1cblx0XHR9ZWxzZXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGUoeCwgeSwgeilcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdHNlbGYudGlsZXNbdXJsXSA9IHJlc3BvbnNlO1xuXHRcdFx0XHRcdHZhciBzY2FsZUZhY3RvciA9IE1hdGgucG93KDIsIHopO1xuXHRcdFx0XHRcdHZhciBzcHJpdGVTaXplID0gc2VsZi50aWxlU2l6ZSAvIHNjYWxlRmFjdG9yO1xuXHRcdFx0XHRcdHZhciBzcHJpdGVPcHRpb25zID0ge1xuXHRcdFx0XHRcdFx0cG9zaXRpb246IHt4Ongqc3ByaXRlU2l6ZSwgeTp5KnNwcml0ZVNpemUsIHo6en0sXG5cdFx0XHRcdFx0XHR3aWR0aDogc3ByaXRlU2l6ZSxcblx0XHRcdFx0XHRcdGhlaWdodDogc3ByaXRlU2l6ZSxcblx0XHRcdFx0XHRcdGltYWdlOiBzZWxmLnRpbGVzW3VybF0uZGF0YSxcblx0XHRcdFx0XHRcdGltYWdlTmFtZTogdXJsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSBzZWxmLndlYkdsVmlldy5hZGRTcHJpdGUoc3ByaXRlT3B0aW9ucyk7XG5cdFx0XHRcdFx0c2VsZi53ZWJHbFZpZXcuZHJhdygpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihyZWFzb24pe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2cocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLmhpZGVUaWxlID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHZhciB1cmwgPSB0aGlzLnRpbGVQcm92aWRlci5nZXRUaWxlVXJsKHgsIHksIHopO1xuXHRcdGlmKHRoaXMudGlsZXNbdXJsXSAmJiB0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpIHtcblx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZVNwcml0ZSh0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpO1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5ID0gbnVsbDtcblx0XHR9XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0XHRmb3IodmFyIHVybCBpbiB0aGlzLnRpbGVzKSB7XG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpIHtcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcucmVtb3ZlU3ByaXRlKHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSk7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHR3aW5kb3cuSW1hZ2VUaWxlVmlldyA9IEltYWdlVGlsZVZpZXc7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgU2l0ZUNsdXN0ZXJWaWV3ID0gZnVuY3Rpb24oKXtcblxuXHR9O1xuXG5cdHdpbmRvdy5TaXRlQ2x1c3RlclZpZXcgPSBTaXRlQ2x1c3RlclZpZXc7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXG5cdGZ1bmN0aW9uIGNvbG9yVG9IZXgoYikge1xuXHRcdHZhciBoZXhDaGFyID0gW1wiMFwiLCBcIjFcIiwgXCIyXCIsIFwiM1wiLCBcIjRcIiwgXCI1XCIsIFwiNlwiLCBcIjdcIixcIjhcIiwgXCI5XCIsIFwiYVwiLCBcImJcIiwgXCJjXCIsIFwiZFwiLCBcImVcIiwgXCJmXCJdO1xuXHRcdHJldHVybiBoZXhDaGFyWyhiID4+IDIwKSAmIDB4MGZdICsgaGV4Q2hhclsoYiA+PiAxNikgJiAweDBmXSArIFxuXHRcdFx0aGV4Q2hhclsoYiA+PiAxMikgJiAweDBmXSArIGhleENoYXJbKGIgPj4gOCkgJiAweDBmXSArIFxuXHRcdFx0aGV4Q2hhclsoYiA+PiA0KSAmIDB4MGZdICsgaGV4Q2hhcltiICYgMHgwZl07XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRSYW5kb21Db2xvcigpIHtcblx0XHRyZXR1cm4gKE1hdGguZmxvb3IoMjU1LjAqTWF0aC5yYW5kb20oKSkgJiAweEZGKSA8PCAxNiBcblx0XHRcdHwgKE1hdGguZmxvb3IoMjU1LjAqTWF0aC5yYW5kb20oKSkgJiAweEZGKSA8PCA4IFxuXHRcdFx0fCAoTWF0aC5mbG9vcigyNTUuMCpNYXRoLnJhbmRvbSgpKSAmIDB4RkYpO1xuXHR9XG5cblx0dmFyIFZlY3RvclRpbGVWaWV3ID0gZnVuY3Rpb24odGlsZVByb3ZpZGVyLCB3ZWJHbFZpZXcsIGljb25JbWFnZSwgdXNlUmFuZG9tQ29sb3JzKSB7XG5cdFx0dGhpcy50aWxlUHJvdmlkZXIgPSB0aWxlUHJvdmlkZXI7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy5pY29uSW1hZ2UgPSBpY29uSW1hZ2U7XG5cdFx0dGhpcy50aWxlcyA9IHt9O1xuXHRcdHRoaXMuc2hvd25UaWxlcyA9IHt9O1xuXG5cdFx0Ly8gdXNlZCBmb3IgZGVidWdnaW5nXG5cdFx0dGhpcy51c2VSYW5kb21Db2xvcnMgPSB1c2VSYW5kb21Db2xvcnM7XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLnNldFRpbGVTaXplID0gZnVuY3Rpb24odGlsZVNpemUpIHtcblx0XHR0aGlzLnRpbGVTaXplID0gdGlsZVNpemU7XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLnNldFRpbGVTaXplID0gZnVuY3Rpb24odGlsZVNpemUpIHtcblx0XHR0aGlzLnRpbGVTaXplID0gdGlsZVNpemU7XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLnNob3dUaWxlcyA9IGZ1bmN0aW9uKHVseCwgdWx5LCBscngsIGxyeSwgem9vbSkge1xuXHRcdGZvcih2YXIgY29sdW1uPXVseDsgY29sdW1uPD1scng7IGNvbHVtbisrKSB7XG5cdFx0XHRmb3IodmFyIHJvdz11bHk7IHJvdzw9bHJ5OyByb3crKykge1xuXHRcdFx0XHR0aGlzLnNob3dUaWxlKGNvbHVtbiwgcm93LCB6b29tKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5zaG93VGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgdXJsID0gdGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHQvLyBjb25zb2xlLmxvZyhcIlNob3dpbmcgdGlsZTogXCIgKyB1cmwpO1xuXHRcdGlmKHRoaXMuc2hvd25UaWxlc1t1cmxdKSByZXR1cm47XG5cdFx0dGhpcy5zaG93blRpbGVzW3VybF0gPSB0cnVlO1xuXG5cdFx0aWYodGhpcy50aWxlc1t1cmxdKSB7XG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMgfHwgdGhpcy50aWxlc1t1cmxdLmxpbmVzKVxuXHRcdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMpXG5cdFx0XHRcdFx0dGhpcy53ZWJHbFZpZXcuYWRkR2VvbWV0cnkodGhpcy50aWxlc1t1cmxdLnBvbHlnb25zKTtcblx0XHRcdFx0aWYodGhpcy50aWxlc1t1cmxdLmxpbmVzKVxuXHRcdFx0XHRcdHRoaXMud2ViR2xWaWV3LmFkZExpbmUodGhpcy50aWxlc1t1cmxdLmxpbmVzKTtcblx0XHRcdGVsc2UgaWYodGhpcy50aWxlc1t1cmxdLmRhdGEpIFxuXHRcdFx0XHR0aGlzLmNyZWF0ZUZlYXR1cmVzKHVybCwgdGhpcy50aWxlc1t1cmxdLmRhdGEpO1xuXHRcdH1lbHNle1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZSh4LCB5LCB6KVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0c2VsZi50aWxlc1t1cmxdID0gcmVzcG9uc2U7XG5cdFx0XHRcdFx0aWYoc2VsZi5zaG93blRpbGVzW3VybF0pXG5cdFx0XHRcdFx0XHRzZWxmLmNyZWF0ZUZlYXR1cmVzKHVybCwgc2VsZi50aWxlc1t1cmxdLmRhdGEpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihyZWFzb24pe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHJlYXNvbik7XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0fTtcblxuXHRWZWN0b3JUaWxlVmlldy5wcm90b3R5cGUuaGlkZVRpbGUgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG5cdFx0dmFyIHVybCA9IHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGVVcmwoeCwgeSwgeik7XG5cdFx0Ly8gY29uc29sZS5sb2coXCJIaWRpbmcgdGlsZTogXCIgKyB1cmwpO1xuXHRcdHRoaXMuc2hvd25UaWxlc1t1cmxdID0gZmFsc2U7XG5cblx0XHRpZih0aGlzLnRpbGVzW3VybF0pIHtcblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5wb2x5Z29ucykge1xuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVHZW9tZXRyeSh0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMpO1xuXHRcdFx0XHRkZWxldGUgdGhpcy50aWxlc1t1cmxdLnBvbHlnb25zO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ubGluZXMpIHtcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcucmVtb3ZlTGluZSh0aGlzLnRpbGVzW3VybF0ubGluZXMpO1xuXHRcdFx0XHRkZWxldGUgdGhpcy50aWxlc1t1cmxdLmxpbmVzO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ubGluZXMgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9pbnRzKSB7XG5cdFx0XHRcdHZhciBwb2ludHMgPSB0aGlzLnRpbGVzW3VybF0ucG9pbnRzO1xuXHRcdFx0XHRmb3IodmFyIGk9MDsgaTxwb2ludHMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdFx0dGhpcy53ZWJHbFZpZXcucmVtb3ZlUG9pbnQocG9pbnRzW2ldKTtcblx0XHRcdFx0dGhpcy50aWxlc1t1cmxdLnBvaW50cyA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHRcdGZvcih2YXIgdXJsIGluIHRoaXMudGlsZXMpIHtcblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5wb2x5Z29ucykge1xuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVHZW9tZXRyeSh0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMpO1xuXHRcdFx0XHRkZWxldGUgdGhpcy50aWxlc1t1cmxdLnBvbHlnb25zO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ubGluZXMpIHtcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcucmVtb3ZlTGluZSh0aGlzLnRpbGVzW3VybF0ubGluZXMpO1xuXHRcdFx0XHRkZWxldGUgdGhpcy50aWxlc1t1cmxdLmxpbmVzO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ubGluZXMgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9pbnRzKSB7XG5cdFx0XHRcdHZhciBwb2ludHMgPSB0aGlzLnRpbGVzW3VybF0ucG9pbnRzO1xuXHRcdFx0XHRmb3IodmFyIGk9MDsgaTxwb2ludHMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdFx0dGhpcy53ZWJHbFZpZXcucmVtb3ZlUG9pbnQocG9pbnRzW2ldKTtcblx0XHRcdFx0dGhpcy50aWxlc1t1cmxdLnBvaW50cyA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHRWZWN0b3JUaWxlVmlldy5wcm90b3R5cGUuY3JlYXRlRmVhdHVyZXMgPSBmdW5jdGlvbih1cmwsIGZlYXR1cmVzKSB7XG5cdFx0dmFyIGFkZGVkID0gZmFsc2U7XG5cblx0XHRpZihmZWF0dXJlcy5wb2x5Z29ucy5sZW5ndGggPiAwKSB7XG5cdFx0XHR2YXIgcG9seWdvbk9wdGlvbnMgPSB7fTtcblx0XHRcdHBvbHlnb25PcHRpb25zLmZlYXR1cmVzID0gZmVhdHVyZXMucG9seWdvbnM7XG5cdFx0XHRwb2x5Z29uT3B0aW9ucy5maWxsQ29sb3IgPSB0aGlzLnVzZVJhbmRvbUNvbG9ycyA/IGdldFJhbmRvbUNvbG9yKCkgOiBudWxsO1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLnBvbHlnb25zID0gdGhpcy53ZWJHbFZpZXcuY3JlYXRlR2VvbWV0cnkocG9seWdvbk9wdGlvbnMpO1xuXHRcdFx0YWRkZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGZlYXR1cmVzLmxpbmVzLmxlbmd0aCA+IDApIHtcblx0XHRcdHZhciBsaW5lT3B0aW9ucyA9IHt9O1xuXHRcdFx0bGluZU9wdGlvbnMuZmVhdHVyZXMgPSBmZWF0dXJlcy5saW5lcztcblx0XHRcdGxpbmVPcHRpb25zLnN0cm9rZUNvbG9yID0gdGhpcy51c2VSYW5kb21Db2xvcnMgPyBnZXRSYW5kb21Db2xvcigpIDogbnVsbDtcblx0XHRcdHRoaXMudGlsZXNbdXJsXS5saW5lcyA9IHRoaXMud2ViR2xWaWV3LmNyZWF0ZUxpbmUobGluZU9wdGlvbnMpO1xuXHRcdFx0YWRkZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHZhciBwb2ludHMgPSBbXTtcblx0XHRmb3IodmFyIGk9MDsgaTxmZWF0dXJlcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwb2ludCA9IGZlYXR1cmVzLnBvaW50c1tpXTtcblx0XHRcdHZhciBtYXJrZXJPcHRpb25zID0ge1xuXHRcdFx0XHRwb3NpdGlvbjoge3g6cG9pbnQueCwgeTpwb2ludC55LCB6OjEwMH0sXG5cdFx0XHRcdGNvbG9yOiB7cjoxLCBnOjEsIGI6MX0sXG5cdFx0XHRcdGltYWdlOiB0aGlzLmljb25JbWFnZSxcblx0XHRcdFx0aW1hZ2VOYW1lOiB0aGlzLmljb25JbWFnZS51cmxcblx0XHRcdH07XG5cdFx0XHRwb2ludHMucHVzaCh0aGlzLndlYkdsVmlldy5hZGRQb2ludChtYXJrZXJPcHRpb25zKSk7XG5cdFx0fVxuXHRcdHRoaXMudGlsZXNbdXJsXS5wb2ludHMgPSBwb2ludHM7XG5cblx0XHRpZihhZGRlZClcblx0XHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHR3aW5kb3cuVmVjdG9yVGlsZVZpZXcgPSBWZWN0b3JUaWxlVmlldztcbn0oKSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
