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
			for(var i=0; i<coordinates.length; i++) {
				var linearRing = coordinates[i];
				polygons.push(this._parseCoordinates(linearRing));
			}
		}
		else if(feature.geometry.type == "MultiPolygon") {
			var coordinates = feature.geometry.coordinates;
			for(var i=0; i<coordinates.length; i++) {
				var polygon = coordinates[i];
				for(var j=0; j<polygon.length; j++) {
					var linearRing = polygon[j];
					polygons.push(this._parseCoordinates(linearRing));
				}
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
		for(var j=0; j<coordinates[i].length; j++) {
			var latLng = new google.maps.LatLng(coordinates[i][j][1], coordinates[i][j][0]);
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

	VectorTileView.prototype.createFeatures = function(features) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJnZW9tcy9yZWN0YW5nbGUuanMiLCJncmFwaGljcy9keW5hbWljX3Nwcml0ZXNoZWV0LmpzIiwiZ3JhcGhpY3MvbGluZV9yZW5kZXJlci5qcyIsImdyYXBoaWNzL29iamVjdF9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3BvaW50X3JlbmRlcmVyLmpzIiwiZ3JhcGhpY3MvcG9seWdvbl9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3Nwcml0ZV9yZW5kZXJlci5qcyIsImdyYXBoaWNzL3Nwcml0ZXNoZWV0LmpzIiwiZ3JhcGhpY3Mvd2ViZ2xfdmlldy5qcyIsInV0aWxzL2h0dHByZXF1ZXN0cy5qcyIsImdpcy9jb250cm9sbGVycy9jbHVzdGVyX2NvbnRyb2xsZXIuanMiLCJnaXMvY29udHJvbGxlcnMvdGlsZV9jb250cm9sbGVyLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL2dlb2pzb25fZGF0YXNvdXJjZS5qcyIsImdpcy9kYXRhc291cmNlcy9pbWFnZV9kYXRhc291cmNlLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL3N0YV9kYXRhc291cmNlLmpzIiwiZ2lzL2RhdGFzb3VyY2VzL3RpbGVfcHJvdmlkZXIuanMiLCJnaXMvdmlld3MvaW1hZ2VfdGlsZV92aWV3LmpzIiwiZ2lzL3ZpZXdzL3NpdGVfY2x1c3Rlcl92aWV3LmpzIiwiZ2lzL3ZpZXdzL3ZlY3Rvcl90aWxlX3ZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiY2FydGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBkZWNsYXJlIHBhY2thZ2UgbmFtZXNcbnZhciBjYXJ0ZSA9IHt9OyIsIihmdW5jdGlvbigpe1xuXHR2YXIgUmVjdGFuZ2xlID0gZnVuY3Rpb24oeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuXHRcdHRoaXMueCA9IHg7XG5cdFx0dGhpcy55ID0geTtcblx0XHR0aGlzLndpZHRoID0gd2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cdFx0dGhpcy51bHggPSB4O1xuXHRcdHRoaXMudWx5ID0geTtcblx0XHR0aGlzLmxyeCA9IHgrd2lkdGg7XG5cdFx0dGhpcy5scnkgPSB5K3dpZHRoO1xuXHR9O1xuXG5cdFJlY3RhbmdsZS5wcm90b3R5cGUuY29udGFpbnNQb2ludCA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0XHRyZXR1cm4gdGhpcy51bHg8PXggJiYgeDw9dGhpcy5scnggJiYgdGhpcy51bHk8PXkgJiYgeTw9dGhpcy5scnk7XG5cdH07XG5cblx0UmVjdGFuZ2xlLnByb3RvdHlwZS5jb250YWluc1JlY3QgPSBmdW5jdGlvbihyZWN0KSB7XG5cdFx0cmV0dXJuIHRoaXMuY29udGFpbnNQb2ludChyZWN0LngsIHJlY3QueSkgJiYgXG5cdFx0XHR0aGlzLmNvbnRhaW5zUG9pbnQocmVjdC54K3JlY3Qud2lkdGgsIHJlY3QueStyZWN0LmhlaWdodCk7XG5cdH07XG5cblx0UmVjdGFuZ2xlLnByb3RvdHlwZS5jb250YWluc0RpbWVuc2lvbnMgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XG5cdFx0cmV0dXJuIHRoaXMud2lkdGggPj0gd2lkdGggJiYgdGhpcy5oZWlnaHQgPj0gaGVpZ2h0O1xuXHR9O1xuXG5cdFJlY3RhbmdsZS5wcm90b3R5cGUuZ2V0Tm9ybWFsaXplZFJlY3QgPSBmdW5jdGlvbihtYXhXaWR0aCwgbWF4SGVpZ2h0KSB7XG5cdFx0dmFyIHggPSB0aGlzLnggLyBtYXhXaWR0aCxcblx0XHRcdHkgPSB0aGlzLnkgLyBtYXhIZWlnaHQsXG5cdFx0XHR3aWR0aCA9IHRoaXMud2lkdGggLyBtYXhXaWR0aCxcblx0XHRcdGhlaWdodCA9IHRoaXMuaGVpZ2h0IC8gbWF4SGVpZ2h0O1xuXHRcdHJldHVybiBuZXcgUmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuXHR9O1xuXG5cdHdpbmRvdy5SZWN0YW5nbGUgPSBSZWN0YW5nbGU7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgU3ByaXRlTm9kZSA9IGZ1bmN0aW9uKHJlY3QpIHtcblx0XHR0aGlzLnJlY3QgPSByZWN0O1xuXHRcdHRoaXMubmFtZSA9IFwic3ByaXRlMFwiO1xuXHRcdHRoaXMuaW1hZ2UgPSBudWxsO1xuXHRcdHRoaXMuY2hpbGQgPSBbXTtcblx0fTtcblxuXHRTcHJpdGVOb2RlLnByb3RvdHlwZS5jb21wdXRlTm9ybWFsID0gZnVuY3Rpb24obWF4V2lkdGgsIG1heEhlaWdodCkge1xuXHRcdHRoaXMubWF4V2lkdGggPSBtYXhXaWR0aDtcblx0XHR0aGlzLm1heEhlaWdodCA9IG1heEhlaWdodDtcblx0XHR0aGlzLm5vcm1hbFJlY3QgPSB0aGlzLnJlY3QuZ2V0Tm9ybWFsaXplZFJlY3QobWF4V2lkdGgsIG1heEhlaWdodCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gbWF4IHJlY3QgYWxnb3JpdGhtIGZvciBmaW5kaW5nIHdoZXJlIHRvIGZpdCB0aGUgaW1hZ2UuXG5cdCAqIFNhbXBsZSBpbXBsZW1lbnRhdGlvbiBmb3IgbGlnaHRtYXBzOiBodHRwOi8vd3d3LmJsYWNrcGF3bi5jb20vdGV4dHMvbGlnaHRtYXBzL1xuXHQgKi9cblx0U3ByaXRlTm9kZS5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24obmFtZSwgaW1hZ2UpIHtcblx0XHR2YXIgbmV3Tm9kZSA9IG51bGw7XG5cdFx0aWYodGhpcy5pbWFnZSAhPT0gbnVsbCkge1xuXHRcdFx0Ly8gdGhpcyBhbHJlYWR5IGNvbnRhaW5zIGFuIGltYWdlIHNvIGxldCdzIGNoZWNrIGl0J3MgY2hpbGRyZW5cblx0XHRcdGlmKHRoaXMuY2hpbGQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRuZXdOb2RlID0gdGhpcy5jaGlsZFswXS5pbnNlcnQobmFtZSwgaW1hZ2UpO1xuXHRcdFx0XHRpZihuZXdOb2RlICE9PSBudWxsKSByZXR1cm4gbmV3Tm9kZTtcblx0XHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRbMV0uaW5zZXJ0KG5hbWUsIGltYWdlKTtcblx0XHRcdH1cblx0XHRcdC8vIHRoaXMgaXMgYSBsZWFmIG5vZGUgYW5kIGFscmVhZHkgY29udGFpbnMgYW4gaW1hZ2UgdGhhdCAnanVzdCBmaXRzJ1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmKHRoaXMucmVjdC5jb250YWluc0RpbWVuc2lvbnMoaW1hZ2Uud2lkdGgsIGltYWdlLmhlaWdodCkpIHtcblx0XHRcdFx0aWYodGhpcy5yZWN0LndpZHRoID09IGltYWdlLndpZHRoICYmIHRoaXMucmVjdC5oZWlnaHQgPT0gaW1hZ2UuaGVpZ2h0KSB7XG5cdFx0XHRcdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHRcdFx0XHR0aGlzLmltYWdlID0gaW1hZ2U7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZih0aGlzLmNoaWxkLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRuZXdOb2RlID0gdGhpcy5jaGlsZFswXS5pbnNlcnQobmFtZSwgaW1hZ2UpO1xuXHRcdFx0XHRcdGlmKG5ld05vZGUgIT09IG51bGwpIHJldHVybiBuZXdOb2RlO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNoaWxkWzFdLmluc2VydChuYW1lLCBpbWFnZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHJlY3QgPSB0aGlzLnJlY3Q7XG5cdFx0XHRcdFx0dmFyIGRXID0gdGhpcy5yZWN0LndpZHRoIC0gaW1hZ2Uud2lkdGg7XG5cdFx0XHRcdFx0dmFyIGRIID0gdGhpcy5yZWN0LmhlaWdodCAtIGltYWdlLmhlaWdodDtcblx0XHRcdFx0XHRpZihkVyA+IGRIKSB7XG5cdFx0XHRcdFx0XHQvLyBzcGxpdCB0aGlzIHJlY3RhbmdsZSB2ZXJ0aWNhbGx5IGludG8gdHdvLCBsZWZ0IGFuZCByaWdodFxuXHRcdFx0XHRcdFx0dGhpcy5jaGlsZFswXSA9IG5ldyBTcHJpdGVOb2RlKG5ldyBSZWN0YW5nbGUocmVjdC54LCByZWN0LnksIGltYWdlLndpZHRoLCByZWN0LmhlaWdodCkpO1xuXHRcdFx0XHRcdFx0dGhpcy5jaGlsZFsxXSA9IG5ldyBTcHJpdGVOb2RlKG5ldyBSZWN0YW5nbGUocmVjdC54K2ltYWdlLndpZHRoLCByZWN0LnksIGRXLCByZWN0LmhlaWdodCkpO1xuXHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0Ly8gc3BsaXQgdGhpcyByZWN0YW5nbGUgaG9yaXpvbnRhbGx5IGludG8gdHdvLCBvbmUgYWJvdmUgYW5vdGhlciBiZWxvd1xuXHRcdFx0XHRcdFx0dGhpcy5jaGlsZFswXSA9IG5ldyBTcHJpdGVOb2RlKG5ldyBSZWN0YW5nbGUocmVjdC54LCByZWN0LnksIHJlY3Qud2lkdGgsIGltYWdlLmhlaWdodCkpO1xuXHRcdFx0XHRcdFx0dGhpcy5jaGlsZFsxXSA9IG5ldyBTcHJpdGVOb2RlKG5ldyBSZWN0YW5nbGUocmVjdC54LCByZWN0LnkraW1hZ2UuaGVpZ2h0LCByZWN0LndpZHRoLCBkSCkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLmNoaWxkWzBdLmNvbXB1dGVOb3JtYWwodGhpcy5tYXhXaWR0aCwgdGhpcy5tYXhIZWlnaHQpO1xuXHRcdFx0XHRcdHRoaXMuY2hpbGRbMV0uY29tcHV0ZU5vcm1hbCh0aGlzLm1heFdpZHRoLCB0aGlzLm1heEhlaWdodCk7XG5cdFx0XHRcdFx0Ly8gdGhpcyBpbWFnZSBzaG91bGQgYXV0b21hdGljYWxseSBmaXQgdGhlIGZpcnN0IG5vZGVcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jaGlsZFswXS5pbnNlcnQobmFtZSwgaW1hZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHQvLyB0aGlzIHdpbGwgbm90IGZpdCB0aGlzIG5vZGVcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0fTtcblxuXHRTcHJpdGVOb2RlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0aWYodGhpcy5uYW1lID09IG5hbWUpIHJldHVybiB0aGlzO1xuXHRcdGlmKHRoaXMuY2hpbGQubGVuZ3RoID4gMCkge1xuXHRcdFx0dmFyIG5vZGUgPSB0aGlzLmNoaWxkWzBdLmdldChuYW1lKTtcblx0XHRcdGlmKG5vZGUgIT09IG51bGwpIHJldHVybiBub2RlO1xuXHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRbMV0uZ2V0KG5hbWUpO1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fTtcblxuXHRTcHJpdGVOb2RlLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0dmFyIG5vZGUgPSB0aGlzLmdldChuYW1lKTtcblx0XHRpZihub2RlKSBub2RlLmNsZWFyKCk7XG5cdFx0cmV0dXJuIG5vZGU7XG5cdH07XG5cblx0U3ByaXRlTm9kZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLm5hbWUgPSBcIlwiO1xuXHRcdHRoaXMuaW1hZ2UgPSBudWxsO1xuXHR9O1xuXG5cdHZhciBEeW5hbWljU3ByaXRlU2hlZXQgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XG5cdFx0dGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLmNhbnZhcy53aWR0aCA9IHdpZHRoO1xuXHRcdHRoaXMuY2FudmFzLmhlaWdodCA9IGhlaWdodDtcblxuXHRcdHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0XG5cdFx0dGhpcy50ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUodGhpcy5jYW52YXMpO1xuXHRcdHRoaXMudGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xuXHRcdHRoaXMudGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xuXHRcdHRoaXMudGV4dHVyZS5mbGlwWSA9IGZhbHNlO1xuXG5cdFx0dGhpcy5wbm9kZSA9IG5ldyBTcHJpdGVOb2RlKG5ldyBSZWN0YW5nbGUoMCwgMCwgd2lkdGgsIGhlaWdodCkpO1xuXHRcdHRoaXMucG5vZGUuY29tcHV0ZU5vcm1hbCh3aWR0aCwgaGVpZ2h0KTtcblx0fTtcblxuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlID0gbmV3IFRIUkVFLkV2ZW50RGlzcGF0Y2hlcigpO1xuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRHluYW1pY1Nwcml0ZVNoZWV0O1xuXG5cdER5bmFtaWNTcHJpdGVTaGVldC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnBub2RlLmdldChuYW1lKTtcblx0fTtcblxuXHREeW5hbWljU3ByaXRlU2hlZXQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG5hbWUsIGltYWdlKSB7XG5cdFx0aWYoaW1hZ2UgPT09IHVuZGVmaW5lZCB8fCBpbWFnZSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG5cdFx0aWYodGhpcy5nZXQobmFtZSkgIT09IG51bGwpIHJldHVybiBudWxsO1xuXHRcdHZhciBub2RlID0gdGhpcy5wbm9kZS5pbnNlcnQobmFtZSwgaW1hZ2UpO1xuXHRcdGlmKG5vZGUpIHtcblx0XHRcdHZhciByZWN0ID0gbm9kZS5yZWN0O1xuXHRcdFx0dGhpcy5jb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgcmVjdC54LCByZWN0LnkpO1xuXHRcdFx0dGhpcy50ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ3Nwcml0ZV9hZGRlZCd9KTtcblx0XHR9XG5cdFx0cmV0dXJuIG5vZGU7XG5cdH07XG5cblx0RHluYW1pY1Nwcml0ZVNoZWV0LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0dmFyIG5vZGUgPSB0aGlzLnBub2RlLmRlbGV0ZShuYW1lKTtcblx0XHRpZihub2RlKSB7XG5cdFx0XHR2YXIgcmVjdCA9IG5vZGUucmVjdDtcblx0XHRcdHRoaXMuY29udGV4dC5jbGVhclJlY3QocmVjdC54LCByZWN0LnksIHJlY3Qud2lkdGgsIHJlY3QuaGVpZ2h0KTtcblx0XHRcdHRoaXMudGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdzcHJpdGVfcmVtb3ZlZCd9KTtcblx0XHR9XG5cdFx0cmV0dXJuIG5vZGU7XG5cdH07XG5cblx0RHluYW1pY1Nwcml0ZVNoZWV0LnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24obmFtZSwgdXJsKSB7XG5cblx0fTtcblxuXHR3aW5kb3cuRHluYW1pY1Nwcml0ZVNoZWV0ID0gRHluYW1pY1Nwcml0ZVNoZWV0O1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIExpbmVSZW5kZXJlciA9IGZ1bmN0aW9uKCkge307XG5cblx0TGluZVJlbmRlcmVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9O1xuXG5cdExpbmVSZW5kZXJlci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcblxuXHRMaW5lUmVuZGVyZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcblxuXHRMaW5lUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHR2YXIgZmVhdHVyZXMgPSBvcHRpb25zLmZlYXR1cmVzIHx8IFtdO1xuXHRcdHZhciBzdHJva2VDb2xvciA9IChvcHRpb25zLnN0cm9rZUNvbG9yICE9PSBudWxsICYmIG9wdGlvbnMuc3Ryb2tlQ29sb3IgIT09IHVuZGVmaW5lZCkgPyBvcHRpb25zLnN0cm9rZUNvbG9yIDogMHhGRkZGRkY7XG5cblx0XHRpZihmZWF0dXJlcyA9PT0gbnVsbCB8fCBmZWF0dXJlcy5sZW5ndGggPT09IDApXG5cdFx0XHRyZXR1cm4gbnVsbDtcblxuXHRcdHZhciBsaW5lID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XG5cblx0XHQvLyBpdGVyYXRlIGV2ZXJ5IGxpbmUgd2hpY2ggc2hvdWxkIGNvbnRhaW4gdGhlIGZvbGxvd2luZyBhcnJheTpcblx0XHQvLyBbbGluZXN0cmluZyBvciBhcnJheSBvZiBwb2ludHNdXG5cdFx0Zm9yKHZhciBpPTA7IGk8ZmVhdHVyZXMubGVuZ3RoOyBpKyspe1xuXHRcdFx0dmFyIHBvbHlnb24gID0gZmVhdHVyZXNbaV07XG5cdFx0XHRmb3IodmFyIGo9MDsgajxwb2x5Z29uLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdHZhciBjb29yZGluYXRlID0gcG9seWdvbltqXTtcblx0XHRcdFx0dmFyIHBvaW50ID0ge3g6IGNvb3JkaW5hdGVbMF0sIHk6IGNvb3JkaW5hdGVbMV19O1xuXG5cdFx0XHRcdHZhciB2ZXJ0ZXgxID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQueCwgcG9pbnQueSwgMSk7XG5cdFx0XHRcdGxpbmUudmVydGljZXMucHVzaCh2ZXJ0ZXgxKTtcblxuXHRcdFx0XHR2YXIgY29vcmQwLCBwb2ludDAsIHZlcnRleDA7XG5cdFx0XHRcdGlmKGogPT0gcG9seWdvbi5sZW5ndGgtMSkge1xuXHRcdFx0XHRcdGNvb3JkMCA9IHBvbHlnb25bMF07XG5cdFx0XHRcdFx0cG9pbnQwID0ge3g6IGNvb3JkMFswXSwgeTogY29vcmQwWzFdfTtcblx0XHRcdFx0XHR2ZXJ0ZXgwID0gbmV3IFRIUkVFLlZlY3RvcjMocG9pbnQwLngsIHBvaW50MC55LCAxKTtcblx0XHRcdFx0XHRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MCk7XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdGNvb3JkMCA9IHBvbHlnb25baisxXTtcblx0XHRcdFx0XHRwb2ludDAgPSB7eDogY29vcmQwWzBdLCB5OiBjb29yZDBbMV19O1xuXHRcdFx0XHRcdHZlcnRleDAgPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludDAueCwgcG9pbnQwLnksIDEpO1xuXHRcdFx0XHRcdGxpbmUudmVydGljZXMucHVzaCh2ZXJ0ZXgwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVx0XG5cdFx0fVxuXG5cdFx0dmFyIGxpbmVQb2x5Z29uID0gbmV3IFRIUkVFLkxpbmVTZWdtZW50cyhsaW5lLCBuZXcgVEhSRUUuTGluZUJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0Y29sb3I6IHN0cm9rZUNvbG9yLFxuXHRcdFx0bGluZXdpZHRoOiAyLFxuXHRcdFx0b3BhY2l0eTogMC4yNSwgXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pKTtcblxuXHRcdHJldHVybiBsaW5lUG9seWdvbjtcblx0fTtcblxuXHR3aW5kb3cuTGluZVJlbmRlcmVyID0gTGluZVJlbmRlcmVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIE9iamVjdFJlbmRlcmVyID0gZnVuY3Rpb24oKSB7fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkgeyBcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRPYmplY3RSZW5kZXJlci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKCkge1xuXG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXG5cdH07XG5cblx0T2JqZWN0UmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihvYmplY3QpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihvYmplY3QpIHtcblxuXHR9O1xuXG5cdE9iamVjdFJlbmRlcmVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24ob2JqZWN0KSB7XG5cblx0fTtcblxuXHR3aW5kb3cuT2JqZWN0UmVuZGVyZXIgPSBPYmplY3RSZW5kZXJlcjtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciB2c2hhZGVyID0gXCJcIiArXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IHBvaW50U2l6ZTtcIiArXG5cdFx0XCJhdHRyaWJ1dGUgdmVjNCB0aWxlO1wiICtcblx0XHRcInZhcnlpbmcgdmVjNCB2VGlsZTtcIiArXG5cdFx0XCJ2YXJ5aW5nIHZlYzMgdkNvbG9yO1wiICtcblx0XHRcInZvaWQgbWFpbigpIHtcIiArXG5cdFx0XCJcdHZlYzQgbXZQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7XCIgK1xuXHRcdFwiXHRnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBtdlBvc2l0aW9uO1wiICtcblx0XHRcIlx0Z2xfUG9pbnRTaXplID0gcG9pbnRTaXplO1wiICtcblx0XHRcIlx0dlRpbGUgPSB0aWxlO1wiICtcblx0XHRcIlx0dkNvbG9yID0gY29sb3I7XCIgK1xuXHRcdFwifVwiO1xuXG5cdHZhciBmc2hhZGVyID0gXCJcIiArXG5cdFx0XCJ1bmlmb3JtIHNhbXBsZXIyRCB0ZXgxO1wiICtcblx0XHRcInVuaWZvcm0gdmVjMiBzcHJpdGVTaXplO1wiICtcblx0XHRcInZhcnlpbmcgdmVjNCB2VGlsZTtcIiArXG5cdFx0XCJ2YXJ5aW5nIHZlYzMgdkNvbG9yO1wiICtcblx0XHRcInZvaWQgbWFpbigpIHtcIiArXG5cdFx0XCJcdHZlYzIgdGlsZVVWID0gdlRpbGUueHkgKyB2VGlsZS56dyAqIGdsX1BvaW50Q29vcmQ7XCIgK1xuXHRcdFwiXHRnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodGV4MSwgdGlsZVVWKSAqIHZlYzQodkNvbG9yLnJnYiwgMS4wKTtcIiArXG5cdFx0XCJ9XCI7XG5cblx0dmFyIE1BWF9DT1VOVCA9IE1hdGgucG93KDIsMzIpIC0gMTtcblx0dmFyIFNUQVJUX1ZBTFVFID0gLTk5OTk5LjA7XG5cblx0dmFyIE1hcmtlciA9IGZ1bmN0aW9uKCkge307XG5cdE1hcmtlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFRIUkVFLkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuXG5cdHZhciBQb2ludFJlbmRlcmVyID0gZnVuY3Rpb24od2ViR2xWaWV3KSB7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy5wb2ludFNpemUgPSAzMi4wO1xuXG5cdFx0dGhpcy5yYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cdFx0dGhpcy5tb3VzZSA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG5cdFx0dGhpcy5tYXJrZXJzID0ge307XG5cdFx0dGhpcy5ob3ZlcmVkTWFya2VyID0gbnVsbDtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNQVhfQ09VTlQ7XG5cdFx0dGhpcy5tYXhJbmRleCA9IDA7XG5cdFx0dGhpcy5pbmRleCA9IDA7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucG9zaXRpb25zID0gbmV3IEZsb2F0MzJBcnJheSgxMDAwMDAwICogMyk7XG5cdFx0dGhpcy5wb3NpdGlvbnMuZmlsbChTVEFSVF9WQUxVRSk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMucG9zaXRpb25zLCAzKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy5jb2xvcnMgPSBuZXcgRmxvYXQzMkFycmF5KDEwMDAwMDAgKiAzKTtcblx0XHR0aGlzLmNvbG9yc0F0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy5jb2xvcnMsIDMpO1xuXHRcdHRoaXMuY29sb3JzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLnRpbGVzID0gbmV3IEZsb2F0MzJBcnJheSgxMDAwMDAwICogNCk7IFxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMudGlsZXMsIDQpOyBcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLmdlb21ldHJ5ID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XG5cdFx0dGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgdGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCdjb2xvcicsIHRoaXMuY29sb3JzQXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgndGlsZScsIHRoaXMudGlsZXNBdHRyaWJ1dGUpO1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBEeW5hbWljU3ByaXRlU2hlZXQoMjU2LCAyNTYpO1xuXHRcdHRoaXMubWF0ZXJpYWwgPSBuZXcgVEhSRUUuU2hhZGVyTWF0ZXJpYWwoIHtcblx0XHRcdHVuaWZvcm1zOiB7XG5cdFx0XHRcdHRleDE6IHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLnNwcml0ZVNoZWV0LnRleHR1cmUgfSxcblx0XHRcdFx0cG9pbnRTaXplOiB7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5wb2ludFNpemUgfVxuXHRcdFx0fSxcblx0XHRcdHZlcnRleENvbG9yczogVEhSRUUuVmVydGV4Q29sb3JzLFxuXHRcdFx0dmVydGV4U2hhZGVyOiB2c2hhZGVyLFxuXHRcdFx0ZnJhZ21lbnRTaGFkZXI6IGZzaGFkZXIsXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zY2VuZU9iamVjdCA9IG5ldyBUSFJFRS5Qb2ludHModGhpcy5nZW9tZXRyeSwgdGhpcy5tYXRlcmlhbCk7XG5cdFx0dGhpcy5yYXljYXN0T2JqZWN0cyA9IFt0aGlzLnNjZW5lT2JqZWN0XTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtYXAgPSB0aGlzLndlYkdsVmlldy5nZXRNYXAoKTtcblx0XHRnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXAsICdtb3VzZW1vdmUnLCB0aGlzLmhhbmRsZURvY3VtZW50TW91c2VNb3ZlLmJpbmQodGhpcykpO1xuXHRcdGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKG1hcCwgJ2NsaWNrJywgdGhpcy5oYW5kbGVEb2N1bWVudE1vdXNlQ2xpY2suYmluZCh0aGlzKSk7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdHRoaXMudXBkYXRlKGV2ZW50KTtcblx0fTtcblxuXHRQb2ludFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVEb2N1bWVudE1vdXNlQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdHRoaXMudXBkYXRlKGV2ZW50KTtcblx0XHRpZih0aGlzLmhvdmVyZWRNYXJrZXIpIFxuXHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6IFwiY2xpY2tcIn0pO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLl9jcmVhdGVNYXJrZXIgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdHZhciBtYXJrZXIgPSBuZXcgTWFya2VyKCk7XG5cdFx0bWFya2VyLmluZGV4ID0gaW5kZXg7XG5cdFx0dGhpcy5tYXJrZXJzW2luZGV4XSA9IG1hcmtlcjtcblx0XHRyZXR1cm4gbWFya2VyO1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgYXJyYXlJbmRleCA9IHRoaXMuaW5kZXggKiAzO1xuXHRcdHdoaWxlKGFycmF5SW5kZXggPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGggJiYgdGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleF0gIT09IFNUQVJUX1ZBTFVFKVxuXHRcdFx0YXJyYXlJbmRleCA9ICsrdGhpcy5pbmRleCozO1xuXG5cdFx0aWYoYXJyYXlJbmRleCA+PSB0aGlzLnBvc2l0aW9ucy5sZW5ndGgpe1xuXHRcdFx0Ly8hVE9ETzogRXhwYW5kIHBvaW50cyBidWZmZXJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1BvaW50UmVuZGVyZXJdIFJ1biBvdXQgb2YgcG9pbnRzISEhXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdG9wdGlvbnMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uIHx8IHt4OjAsIHk6MCwgejowfTtcblx0XHRvcHRpb25zLmNvbG9yID0gb3B0aW9ucy5jb2xvciB8fCB7cjoxLCBnOjEsIGI6MX07XG5cblx0XHR0aGlzLnBvc2l0aW9uc1thcnJheUluZGV4ICsgMF0gPSBvcHRpb25zLnBvc2l0aW9uLng7XG5cdFx0dGhpcy5wb3NpdGlvbnNbYXJyYXlJbmRleCArIDFdID0gb3B0aW9ucy5wb3NpdGlvbi55O1xuXHRcdHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXggKyAyXSA9IG9wdGlvbnMucG9zaXRpb24uejtcblxuXHRcdHRoaXMuY29sb3JzW2FycmF5SW5kZXggKyAwXSA9IG9wdGlvbnMuY29sb3Iucjtcblx0XHR0aGlzLmNvbG9yc1thcnJheUluZGV4ICsgMV0gPSBvcHRpb25zLmNvbG9yLmc7XG5cdFx0dGhpcy5jb2xvcnNbYXJyYXlJbmRleCArIDJdID0gb3B0aW9ucy5jb2xvci5iO1xuXG5cdFx0dmFyIHNwcml0ZSA9IHRoaXMuc3ByaXRlU2hlZXQuZ2V0KG9wdGlvbnMuaW1hZ2VOYW1lKTtcblx0XHRpZighc3ByaXRlKSB7XG5cdFx0XHRzcHJpdGUgPSB0aGlzLnNwcml0ZVNoZWV0LmFkZChvcHRpb25zLmltYWdlTmFtZSwgb3B0aW9ucy5pbWFnZSk7XG5cdFx0XHRpZighc3ByaXRlKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1BvaW50UmVuZGVyZXJdIFNwcml0ZVNoZWV0IGFscmVhZHkgZnVsbC5cIik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhciBzcHJpdGVSZWN0ID0gc3ByaXRlICE9PSBudWxsID8gc3ByaXRlLm5vcm1hbFJlY3QgOiB7eDowLCB5OjAsIHdpZHRoOjAsIGhlaWdodDowfTtcblx0XHR0aGlzLnRpbGVzW3RoaXMuaW5kZXgqNCArIDBdID0gc3ByaXRlUmVjdC54O1xuXHRcdHRoaXMudGlsZXNbdGhpcy5pbmRleCo0ICsgMV0gPSBzcHJpdGVSZWN0Lnk7XG5cdFx0dGhpcy50aWxlc1t0aGlzLmluZGV4KjQgKyAyXSA9IHNwcml0ZVJlY3Qud2lkdGg7XG5cdFx0dGhpcy50aWxlc1t0aGlzLmluZGV4KjQgKyAzXSA9IHNwcml0ZVJlY3QuaGVpZ2h0O1xuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1hdGgubWluKHRoaXMubWluSW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdHRoaXMubWF4SW5kZXggPSBNYXRoLm1heCh0aGlzLm1heEluZGV4LCB0aGlzLmluZGV4KTtcblx0XHR2YXIgbWFya2VyID0gdGhpcy5tYXJrZXJzW3RoaXMuaW5kZXhdIHx8IHRoaXMuX2NyZWF0ZU1hcmtlcih0aGlzLmluZGV4KTtcblx0XHRtYXJrZXIub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5pbmRleCsrO1xuXHRcdHJldHVybiBtYXJrZXI7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0dmFyIGFycmF5SW5kZXggPSBtYXJrZXIuaW5kZXggKiAzO1xuXHRcdHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXggKyAwXSA9IFNUQVJUX1ZBTFVFO1xuXHRcdHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXggKyAxXSA9IFNUQVJUX1ZBTFVFO1xuXHRcdHRoaXMucG9zaXRpb25zW2FycmF5SW5kZXggKyAyXSA9IFNUQVJUX1ZBTFVFO1xuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1hdGgubWluKHRoaXMubWluSW5kZXgsIG1hcmtlci5pbmRleCk7XG5cdFx0dGhpcy5tYXhJbmRleCA9IE1hdGgubWF4KHRoaXMubWF4SW5kZXgsIG1hcmtlci5pbmRleCk7XG5cblx0XHRpZih0aGlzLmluZGV4ID4gbWFya2VyLmluZGV4KSB0aGlzLmluZGV4ID0gbWFya2VyLmluZGV4O1xuXHR9O1xuXG5cdFBvaW50UmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbigpIHtcblx0XHQvLyBvbmx5IHVwZGF0ZSBwb3NpdGlvbnMgdGhhdCBjaGFuZ2VkIGJ5IHBhc3NpbmcgYSByYW5nZVxuXHRcdHRoaXMubWluSW5kZXggPSAodGhpcy5taW5JbmRleCA9PSBNQVhfQ09VTlQpID8gMCA6IHRoaXMubWluSW5kZXg7XG5cdFx0dmFyIG5lZWRzVXBkYXRlID0gdGhpcy5tYXhJbmRleCAhPSB0aGlzLm1pbkluZGV4O1xuXG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCozO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqMyszKS0odGhpcy5taW5JbmRleCozKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0dGhpcy5jb2xvcnNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCozO1xuXHRcdHRoaXMuY29sb3JzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqMyszKS0odGhpcy5taW5JbmRleCozKTtcblx0XHR0aGlzLmNvbG9yc0F0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5vZmZzZXQgPSB0aGlzLm1pbkluZGV4KjQ7XG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KjQrNCktKHRoaXMubWluSW5kZXgqNCk7XG5cdFx0dGhpcy50aWxlc0F0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0aWYobmVlZHNVcGRhdGUpIHtcblx0XHRcdHRoaXMuZ2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nQm94KCk7XG5cdFx0XHR0aGlzLmdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ1NwaGVyZSgpO1xuXHRcdH1cblxuXHRcdHRoaXMubWluSW5kZXggPSBNQVhfQ09VTlQ7XG5cdFx0dGhpcy5tYXhJbmRleCA9IDA7XG5cdH07XG5cblx0UG9pbnRSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRpZihldmVudC5jbGllbnRYICE9PSB1bmRlZmluZWQgJiYgZXZlbnQuY2xpZW50WSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLm1vdXNlLnggPSAoZXZlbnQuY2xpZW50WCAvIHRoaXMud2ViR2xWaWV3LndpZHRoKSAqIDIgLSAxO1xuXHRcdFx0dGhpcy5tb3VzZS55ID0gLShldmVudC5jbGllbnRZIC8gdGhpcy53ZWJHbFZpZXcuaGVpZ2h0KSAqIDIgKyAxO1xuXHRcdH1lbHNlIGlmKGV2ZW50LnBpeGVsKSB7XG5cdFx0XHR0aGlzLm1vdXNlLnggPSAoZXZlbnQucGl4ZWwueCAvIHRoaXMud2ViR2xWaWV3LndpZHRoKSAqIDIgLSAxO1xuXHRcdFx0dGhpcy5tb3VzZS55ID0gLShldmVudC5waXhlbC55IC8gdGhpcy53ZWJHbFZpZXcuaGVpZ2h0KSAqIDIgKyAxO1xuXHRcdH1cblxuXHRcdC8vIGNoZWNrIGlmIHdlIGhpdCBhbnkgb2YgdGhlIHBvaW50cyBpbiB0aGUgcGFydGljbGUgc3lzdGVtXG5cdFx0dGhpcy5yYXljYXN0ZXIucGFyYW1zLlBvaW50cy50aHJlc2hvbGQgPSAxNioxL01hdGgucG93KDIsIHRoaXMud2ViR2xWaWV3LnNjYWxlKTtcblx0XHR0aGlzLnJheWNhc3Rlci5zZXRGcm9tQ2FtZXJhKHRoaXMubW91c2UsIHRoaXMud2ViR2xWaWV3LmNhbWVyYSk7XG5cdFx0dmFyIGludGVyc2VjdGlvbnMgPSB0aGlzLnJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHRoaXMucmF5Y2FzdE9iamVjdHMpO1xuXHRcdGludGVyc2VjdGlvbiA9IChpbnRlcnNlY3Rpb25zLmxlbmd0aCkgPiAwID8gaW50ZXJzZWN0aW9uc1swXSA6IG51bGw7XG5cblx0XHQvLyB3ZSBoaXQgc29tZXRoaW5nXG5cdFx0aWYoaW50ZXJzZWN0aW9uKSB7XG5cdFx0XHQvLyBmaXJzdCB0aW1lIHRvIGhvdmVyIHNvbWV0aGluZ1xuXHRcdFx0aWYodGhpcy5ob3ZlcmVkTWFya2VyID09PSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlciA9IHRoaXMubWFya2Vyc1tpbnRlcnNlY3Rpb24uaW5kZXhdO1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ21vdXNlb3Zlcid9KTtcblx0XHRcdH1cblx0XHRcdC8vIHdlJ3JlIGFscmVhZHkgaG92ZXJpbmcgc29tZXRoaW5nIHRoZW4gc29tZXRoaW5nIGdvdCBpbiB0aGUgd2F5XG5cdFx0XHRlbHNlIGlmKHRoaXMuaG92ZXJlZE1hcmtlci5pbmRleCAhPSBpbnRlcnNlY3Rpb24uaW5kZXgpIHtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdtb3VzZW91dCd9KTtcblx0XHRcdFx0dGhpcy5ob3ZlcmVkTWFya2VyID0gdGhpcy5tYXJrZXJzW2ludGVyc2VjdGlvbi5pbmRleF07XG5cdFx0XHRcdHRoaXMuaG92ZXJlZE1hcmtlci5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnbW91c2VvdmVyJ30pO1xuXHRcdFx0fVxuXHRcdFx0aWYodGhpcy53ZWJHbFZpZXcgJiYgdGhpcy53ZWJHbFZpZXcubWFwKVxuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5tYXAuc2V0T3B0aW9ucyh7ZHJhZ2dhYmxlQ3Vyc29yOidwb2ludGVyJ30pO1xuXHRcdH1cblx0XHQvLyB0aGVyZSdzIG5vdGhpbmcgdW5kZXIgdGhlIG1vdXNlXG5cdFx0ZWxzZSB7XG5cdFx0XHQvLyB3ZSBsb3N0IG91ciBvYmplY3QuIGJ5ZSBieWVcblx0XHRcdGlmKHRoaXMuaG92ZXJlZE1hcmtlciAhPT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ21vdXNlb3V0J30pO1xuXHRcdFx0XHR0aGlzLmhvdmVyZWRNYXJrZXIgPSBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYodGhpcy53ZWJHbFZpZXcgJiYgdGhpcy53ZWJHbFZpZXcubWFwKVxuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5tYXAuc2V0T3B0aW9ucyh7ZHJhZ2dhYmxlQ3Vyc29yOm51bGx9KTtcblx0XHR9XG5cdH07XG5cblx0d2luZG93LlBvaW50UmVuZGVyZXIgPSBQb2ludFJlbmRlcmVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIFBvbHlnb25SZW5kZXJlciA9IGZ1bmN0aW9uKCkge307XG5cblx0UG9seWdvblJlbmRlcmVyLnByb3RvdHlwZSA9IG5ldyBPYmplY3RSZW5kZXJlcigpO1xuXHRQb2x5Z29uUmVuZGVyZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUG9seWdvblJlbmRlcmVyO1xuXG5cdFBvbHlnb25SZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdHZhciBmZWF0dXJlcyA9IG9wdGlvbnMuZmVhdHVyZXMgfHwgW107XG5cdFx0dmFyIGZpbGxDb2xvciA9IChvcHRpb25zLmZpbGxDb2xvciAhPT0gbnVsbCAmJiBvcHRpb25zLmZpbGxDb2xvciAhPT0gdW5kZWZpbmVkKSA/IG9wdGlvbnMuZmlsbENvbG9yIDogMHgwMDAwRkY7XG5cdFx0dmFyIHN0cm9rZUNvbG9yID0gKG9wdGlvbnMuc3Ryb2tlQ29sb3IgIT09IG51bGwgJiYgb3B0aW9ucy5zdHJva2VDb2xvciAhPT0gdW5kZWZpbmVkKSA/IG9wdGlvbnMuc3Ryb2tlQ29sb3IgOiAweEZGRkZGRjtcblxuXHRcdGlmKGZlYXR1cmVzID09PSBudWxsIHx8IGZlYXR1cmVzLmxlbmd0aCA9PT0gMClcblx0XHRcdHJldHVybiBudWxsO1xuXG5cdFx0dmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XG5cdFx0dmFyIG91dGxpbmUgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcblx0XHR2YXIgdmVydGV4T2Zmc2V0ID0gZ2VvbWV0cnkudmVydGljZXMubGVuZ3RoO1xuXHRcdHZhciBudW1Qb2x5Z29ucyA9IDA7XG5cblx0XHQvLyBpdGVyYXRlIGV2ZXJ5IHBvbHlnb24gd2hpY2ggc2hvdWxkIGNvbnRhaW4gdGhlIGZvbGxvd2luZyBhcnJheXM6XG5cdFx0Ly8gW291dGVyIGxvb3BdLCBbaW5uZXIgbG9vcCAxXSwgLi4uLCBbaW5uZXIgbG9vcCBuXVxuXHRcdGZvcih2YXIgaj0wOyBqPGZlYXR1cmVzLmxlbmd0aDsgaisrKXtcblx0XHRcdHZhciBwb2x5Z29uICA9IGZlYXR1cmVzW2pdO1xuXHRcdFx0Zm9yKHZhciBwPTA7IHA8cG9seWdvbi5sZW5ndGg7IHArKykge1xuXHRcdFx0XHR2YXIgbG9vcCA9IHBvbHlnb25bcF07XG5cdFx0XHRcdHZhciBwb2ludHMgPSBbXSwgaG9sZUluZGljZXMgPSBbXSwgaG9sZUluZGV4ID0gMDtcblxuXHRcdFx0XHRmb3IodmFyIGw9MDsgbDxsb29wLmxlbmd0aDsgbCsrKSB7XG5cdFx0XHRcdFx0dmFyIGNvb3JkaW5hdGUgPSBsb29wW2xdO1xuXHRcdFx0XHRcdHZhciBwb2ludCA9IHt4OiBjb29yZGluYXRlWzBdLCB5OiBjb29yZGluYXRlWzFdfTtcblx0XHRcdFx0XHRwb2ludHMucHVzaChwb2ludC54KTtcblx0XHRcdFx0XHRwb2ludHMucHVzaChwb2ludC55KTtcblxuXHRcdFx0XHRcdHZhciB2ZXJ0ZXggPSBuZXcgVEhSRUUuVmVjdG9yMyhwb2ludC54LCBwb2ludC55LCAxMDAxKTtcblx0XHRcdFx0XHRnZW9tZXRyeS52ZXJ0aWNlcy5wdXNoKHZlcnRleCk7XG5cblx0XHRcdFx0XHR2YXIgdmVydGV4MSA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50LngsIHBvaW50LnksIDEpO1xuXHRcdFx0XHRcdG91dGxpbmUudmVydGljZXMucHVzaCh2ZXJ0ZXgxKTtcblxuXHRcdFx0XHRcdHZhciBjb29yZDAsIHBvaW50MCwgdmVydGV4MDtcblx0XHRcdFx0XHRpZihsID09IGxvb3AubGVuZ3RoLTEpIHtcblx0XHRcdFx0XHRcdGNvb3JkMCA9IGxvb3BbMF07XG5cdFx0XHRcdFx0XHRwb2ludDAgPSB7eDogY29vcmQwWzBdLCB5OiBjb29yZDBbMV19O1xuXHRcdFx0XHRcdFx0dmVydGV4MCA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50MC54LCBwb2ludDAueSwgMSk7XG5cdFx0XHRcdFx0XHRvdXRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MCk7XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRjb29yZDAgPSBsb29wW2wrMV07XG5cdFx0XHRcdFx0XHRwb2ludDAgPSB7eDogY29vcmQwWzBdLCB5OiBjb29yZDBbMV19O1xuXHRcdFx0XHRcdFx0dmVydGV4MCA9IG5ldyBUSFJFRS5WZWN0b3IzKHBvaW50MC54LCBwb2ludDAueSwgMSk7XG5cdFx0XHRcdFx0XHRvdXRsaW5lLnZlcnRpY2VzLnB1c2godmVydGV4MCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYocD4wKSBob2xlSW5kaWNlcy5wdXNoKGhvbGVJbmRleCk7XG5cdFx0XHRcdGhvbGVJbmRleCArPSBsb29wLmxlbmd0aDtcblxuXHRcdFx0XHR2YXIgdHJpcyA9IGVhcmN1dChwb2ludHMsIG51bGwsIDIpO1xuXHRcdFx0XHRmb3IodmFyIGs9MDsgazx0cmlzLmxlbmd0aDsgays9Mykge1xuXHRcdFx0XHRcdC8vIDItMS0wIG1lYW5zIGZhY2UgdXBcblx0XHRcdFx0XHR2YXIgZmFjZSA9IG5ldyBUSFJFRS5GYWNlMyhcblx0XHRcdFx0XHRcdHRyaXNbaysyXSArIHZlcnRleE9mZnNldCwgXG5cdFx0XHRcdFx0XHR0cmlzW2srMV0gKyB2ZXJ0ZXhPZmZzZXQsIFxuXHRcdFx0XHRcdFx0dHJpc1trKzBdICsgdmVydGV4T2Zmc2V0XG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRnZW9tZXRyeS5mYWNlcy5wdXNoKGZhY2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZlcnRleE9mZnNldCA9IGdlb21ldHJ5LnZlcnRpY2VzLmxlbmd0aDtcblx0XHRcdFx0bnVtUG9seWdvbnMrKztcblx0XHRcdH1cdFxuXHRcdH1cblxuXHRcdHZhciBjb3ZlcmFnZVBvbHlnb24gPSBuZXcgVEhSRUUuTWVzaChnZW9tZXRyeSwgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdGNvbG9yOiBmaWxsQ29sb3IsXG5cdFx0XHRvcGFjaXR5OiAwLjI1LCBcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxuXHRcdFx0ZGVwdGhXcml0ZTogZmFsc2UsXG5cdFx0XHRkZXB0aFRlc3Q6IGZhbHNlXG5cdFx0fSkpO1xuXG5cdFx0dmFyIG91dGxpbmVQb2x5Z29uID0gbmV3IFRIUkVFLkxpbmVTZWdtZW50cyhvdXRsaW5lLCBuZXcgVEhSRUUuTGluZUJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0Y29sb3I6IHN0cm9rZUNvbG9yLFxuXHRcdFx0bGluZXdpZHRoOiAyLFxuXHRcdFx0b3BhY2l0eTogMC4yNSwgXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdGRlcHRoV3JpdGU6IGZhbHNlLFxuXHRcdFx0ZGVwdGhUZXN0OiBmYWxzZVxuXHRcdH0pKTtcblxuXHRcdHJldHVybiB7c2hhcGU6IGNvdmVyYWdlUG9seWdvbiwgb3V0bGluZTogb3V0bGluZVBvbHlnb259O1xuXHR9O1xuXG5cdHdpbmRvdy5Qb2x5Z29uUmVuZGVyZXIgPSBQb2x5Z29uUmVuZGVyZXI7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgdnNoYWRlciA9IFwiXCIgK1xuXHRcdFwiYXR0cmlidXRlIHZlYzQgdGlsZTtcIiArXG5cdFx0XCJ2YXJ5aW5nIHZlYzIgdlV2O1wiICtcblx0XHRcInZhcnlpbmcgdmVjNCB2VGlsZTtcIiArXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIgK1xuXHRcdFwiXHR2ZWM0IG12UG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KHBvc2l0aW9uLCAxLjApO1wiICtcblx0XHRcIlx0Z2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcIiArXG5cdFx0XCJcdHZVdiA9IHV2O1wiICtcblx0XHRcIlx0dlRpbGUgPSB0aWxlO1wiICtcblx0XHRcIn1cIjtcblxuXHR2YXIgZnNoYWRlciA9IFwiXCIgK1xuXHRcdFwidW5pZm9ybSBzYW1wbGVyMkQgdGV4MTtcIiArXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IGFscGhhO1wiICtcblx0XHRcInZhcnlpbmcgdmVjMiB2VXY7XCIgK1xuXHRcdFwidmFyeWluZyB2ZWM0IHZUaWxlO1wiICtcblx0XHRcInZvaWQgbWFpbigpIHtcIiArXG5cdFx0XCJcdHZlYzIgdXYgPSB2VGlsZS54eSArIHZUaWxlLnp3ICogdlV2O1wiICtcblx0XHRcIlx0Z2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHRleDEsIHV2KSAqIHZlYzQoMSwgMSwgMSwgYWxwaGEpO1wiICtcblx0XHRcIn1cIjtcblxuXHR2YXIgTUFYX0NPVU5UID0gTWF0aC5wb3coMiwzMikgLSAxO1xuXHR2YXIgU1RBUlRfVkFMVUUgPSAtOTk5OTkuMDtcblxuXHR2YXIgUE9TSVRJT05fSU5URVJWQUwgPSAzKjQ7IC8vIDMgZGltZW5zaW9ucyBwZXIgdmVydGV4LCA0IHZlcnRleCBwZXIgc3ByaXRlXG5cdHZhciBJTkRFWF9JTlRFUlZBTCA9IDMqMjsgLy8gMyBpbmRleCBwZXIgdHJpLCAyIHRyaSBwZXIgc3ByaXRlXG5cdHZhciBVVl9JTlRFUlZBTCA9IDIqNDsgLy8gMiB1diBwZXIgdmVydGV4LCA0IHZlcnRleCBwZXIgc3ByaXRlXG5cdHZhciBUSUxFX0lOVEVSVkFMID0gNCo0OyAvLyBvZmZzZXQoeCx5KSArIHNpemUod2lkdGgsIGhlaWd0KSBwZXIgdmVydGV4LCA0IHZlcnRleCBwZXIgc3ByaXRlXG5cblx0dmFyIFNwcml0ZVJlbmRlcmVyID0gZnVuY3Rpb24oKXtcblx0XHR0aGlzLm1pbkluZGV4ID0gTUFYX0NPVU5UO1xuXHRcdHRoaXMubWF4SW5kZXggPSAwO1xuXHRcdHRoaXMuaW5kZXggPSAwO1xuXHRcdHRoaXMuc3ByaXRlcyA9IFtdO1xuXHRcdHRoaXMub3BhY2l0eSA9IDAuODtcblx0fTtcblxuXHRTcHJpdGVSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucG9zaXRpb25zID0gbmV3IEZsb2F0MzJBcnJheSgxMDI0KlBPU0lUSU9OX0lOVEVSVkFMKTsgXG5cdFx0dGhpcy5wb3NpdGlvbnMuZmlsbChTVEFSVF9WQUxVRSk7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMucG9zaXRpb25zLCAzKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS5zZXREeW5hbWljKHRydWUpO1xuXG5cdFx0dGhpcy5pbmRpY2VzID0gbmV3IFVpbnQxNkFycmF5KDEwMjQqSU5ERVhfSU5URVJWQUwpOyBcblx0XHR0aGlzLmluZGljZXNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMuaW5kaWNlcywgMSk7XG5cdFx0dGhpcy5pbmRpY2VzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLnV2ID0gbmV3IEZsb2F0MzJBcnJheSgxMDI0KlVWX0lOVEVSVkFMKTsgXG5cdFx0dGhpcy51dkF0dHJpYnV0ZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodGhpcy51diwgMik7IFxuXHRcdHRoaXMudXZBdHRyaWJ1dGUuc2V0RHluYW1pYyh0cnVlKTtcblxuXHRcdHRoaXMudGlsZXMgPSBuZXcgRmxvYXQzMkFycmF5KDEwMjQqVElMRV9JTlRFUlZBTCk7IFxuXHRcdHRoaXMudGlsZXNBdHRyaWJ1dGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHRoaXMudGlsZXMsIDQpOyBcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnNldER5bmFtaWModHJ1ZSk7XG5cblx0XHR0aGlzLmdlb21ldHJ5ID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XG5cdFx0dGhpcy5nZW9tZXRyeS5zZXRJbmRleCh0aGlzLmluZGljZXNBdHRyaWJ1dGUpO1xuXHRcdHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIHRoaXMucG9zaXRpb25zQXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgndXYnLCB0aGlzLnV2QXR0cmlidXRlKTtcblx0XHR0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgndGlsZScsIHRoaXMudGlsZXNBdHRyaWJ1dGUpO1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBEeW5hbWljU3ByaXRlU2hlZXQoNDA5NiwgNDA5Nik7XG5cdFx0dGhpcy5tYXRlcmlhbCA9IG5ldyBUSFJFRS5TaGFkZXJNYXRlcmlhbCgge1xuXHRcdFx0dW5pZm9ybXM6IHtcblx0XHRcdFx0dGV4MTogeyB0eXBlOiBcInRcIiwgdmFsdWU6IHRoaXMuc3ByaXRlU2hlZXQudGV4dHVyZSB9LFxuXHRcdFx0XHRhbHBoYTogeyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMub3BhY2l0eSB9XG5cdFx0XHR9LFxuXHRcdFx0dmVydGV4U2hhZGVyOiB2c2hhZGVyLFxuXHRcdFx0ZnJhZ21lbnRTaGFkZXI6IGZzaGFkZXJcblx0XHR9KTtcblxuXHRcdHRoaXMuc2NlbmVPYmplY3QgPSBuZXcgVEhSRUUuTWVzaCh0aGlzLmdlb21ldHJ5LCB0aGlzLm1hdGVyaWFsKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdFNwcml0ZVJlbmRlcmVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIHBvc2l0aW9uSW5kZXggPSB0aGlzLmluZGV4KlBPU0lUSU9OX0lOVEVSVkFMO1xuXHRcdHdoaWxlKHBvc2l0aW9uSW5kZXggPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGggJiYgdGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleF0gIT09IFNUQVJUX1ZBTFVFKVxuXHRcdFx0cG9zaXRpb25JbmRleCA9ICsrdGhpcy5pbmRleCpQT1NJVElPTl9JTlRFUlZBTDtcblxuXHRcdGlmKHBvc2l0aW9uSW5kZXggPj0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoKXtcblx0XHRcdC8vIVRPRE86IEV4cGFuZCBwb2ludHMgYnVmZmVyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltTcHJpdGVSZW5kZXJlcl0gUnVuIG91dCBvZiBwb2ludHMhISFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGltYWdlID0gb3B0aW9ucy5pbWFnZTtcblx0XHR2YXIgaW1hZ2VOYW1lID0gb3B0aW9ucy5pbWFnZU5hbWU7XG5cdFx0dmFyIHNwcml0ZSA9IHRoaXMuc3ByaXRlU2hlZXQuZ2V0KGltYWdlTmFtZSk7XG5cdFx0aWYoIXNwcml0ZSkge1xuXHRcdFx0c3ByaXRlID0gdGhpcy5zcHJpdGVTaGVldC5hZGQoaW1hZ2VOYW1lLCBpbWFnZSk7XG5cdFx0XHRpZighc3ByaXRlKSB7XG5cdFx0XHRcdC8vIVRPRE86IENyZWF0ZSBhIG5ldyBzcHJpdGUgc2hlZXQgaWYgdGhpcyBvbmUgZ2V0cyBmdWxsXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Nwcml0ZVJlbmRlcmVyXSBTcHJpdGVTaGVldCBhbHJlYWR5IGZ1bGwuXCIpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdG9wdGlvbnMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uIHx8IHt4OjAsIHk6MCwgejowfTtcblx0XHRvcHRpb25zLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAyNTY7XG5cdFx0b3B0aW9ucy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAyNTY7XG5cdFx0b3B0aW9ucy5pbWFnZU5hbWUgPSBvcHRpb25zLmljb24gfHwgXCJyZWQtZG90XCI7XG5cblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgMF0gPSBvcHRpb25zLnBvc2l0aW9uLng7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDFdID0gb3B0aW9ucy5wb3NpdGlvbi55O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyAyXSA9IG9wdGlvbnMucG9zaXRpb24uejtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgM10gPSBvcHRpb25zLnBvc2l0aW9uLnggKyBvcHRpb25zLndpZHRoO1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA0XSA9IG9wdGlvbnMucG9zaXRpb24ueTtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgNV0gPSBvcHRpb25zLnBvc2l0aW9uLno7XG5cdFx0dGhpcy5wb3NpdGlvbnNbcG9zaXRpb25JbmRleCArIDZdID0gb3B0aW9ucy5wb3NpdGlvbi54O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA3XSA9IG9wdGlvbnMucG9zaXRpb24ueSArIG9wdGlvbnMuaGVpZ2h0O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKyA4XSA9IG9wdGlvbnMucG9zaXRpb24uejtcblx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgOV0gPSBvcHRpb25zLnBvc2l0aW9uLnggKyBvcHRpb25zLndpZHRoO1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKzEwXSA9IG9wdGlvbnMucG9zaXRpb24ueSArIG9wdGlvbnMuaGVpZ2h0O1xuXHRcdHRoaXMucG9zaXRpb25zW3Bvc2l0aW9uSW5kZXggKzExXSA9IG9wdGlvbnMucG9zaXRpb24uejtcblxuXHRcdHZhciBhcnJheUluZGV4ID0gdGhpcy5pbmRleCpJTkRFWF9JTlRFUlZBTDtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDBdID0gdGhpcy5pbmRleCo0ICsgMDtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDFdID0gdGhpcy5pbmRleCo0ICsgMjtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDJdID0gdGhpcy5pbmRleCo0ICsgMTtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDNdID0gdGhpcy5pbmRleCo0ICsgMTtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDRdID0gdGhpcy5pbmRleCo0ICsgMjtcblx0XHR0aGlzLmluZGljZXNbYXJyYXlJbmRleCArIDVdID0gdGhpcy5pbmRleCo0ICsgMztcblxuXHRcdHZhciB1dkluZGV4ID0gdGhpcy5pbmRleCpVVl9JTlRFUlZBTDtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyAwXSA9IDA7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgMV0gPSAwO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDJdID0gMTtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyAzXSA9IDA7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgNF0gPSAwO1xuXHRcdHRoaXMudXZbdXZJbmRleCArIDVdID0gMTtcblx0XHR0aGlzLnV2W3V2SW5kZXggKyA2XSA9IDE7XG5cdFx0dGhpcy51dlt1dkluZGV4ICsgN10gPSAxO1xuXG5cdFx0dmFyIHQgPSB0aGlzLmluZGV4KlRJTEVfSU5URVJWQUw7XG5cdFx0dGhpcy50aWxlc1t0KzBdID0gdGhpcy50aWxlc1t0KzRdID0gdGhpcy50aWxlc1t0KzhdID0gdGhpcy50aWxlc1t0KzEyXSA9IHNwcml0ZS5ub3JtYWxSZWN0Lng7XG5cdFx0dGhpcy50aWxlc1t0KzFdID0gdGhpcy50aWxlc1t0KzVdID0gdGhpcy50aWxlc1t0KzldID0gdGhpcy50aWxlc1t0KzEzXSA9IHNwcml0ZS5ub3JtYWxSZWN0Lnk7XG5cdFx0dGhpcy50aWxlc1t0KzJdID0gdGhpcy50aWxlc1t0KzZdID0gdGhpcy50aWxlc1t0KzEwXSA9IHRoaXMudGlsZXNbdCsxNF0gPSBzcHJpdGUubm9ybWFsUmVjdC53aWR0aDtcblx0XHR0aGlzLnRpbGVzW3QrM10gPSB0aGlzLnRpbGVzW3QrN10gPSB0aGlzLnRpbGVzW3QrMTFdID0gdGhpcy50aWxlc1t0KzE1XSA9IHNwcml0ZS5ub3JtYWxSZWN0LmhlaWdodDtcblxuXHRcdHRoaXMubWluSW5kZXggPSBNYXRoLm1pbih0aGlzLm1pbkluZGV4LCB0aGlzLmluZGV4KTtcblx0XHR0aGlzLm1heEluZGV4ID0gTWF0aC5tYXgodGhpcy5tYXhJbmRleCwgdGhpcy5pbmRleCk7XG5cdFx0cmV0dXJuIHtpbmRleDogdGhpcy5pbmRleCsrLCBuYW1lOiBpbWFnZU5hbWV9O1xuXHR9O1xuXG5cdFNwcml0ZVJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihzcHJpdGUpIHtcblx0XHR2YXIgcG9zaXRpb25JbmRleCA9IHNwcml0ZS5pbmRleCpQT1NJVElPTl9JTlRFUlZBTDtcblx0XHRmb3IodmFyIGk9MDsgaTxQT1NJVElPTl9JTlRFUlZBTDsgaSsrKSB7XG5cdFx0XHR0aGlzLnBvc2l0aW9uc1twb3NpdGlvbkluZGV4ICsgaV0gPSBTVEFSVF9WQUxVRTtcblx0XHR9XG5cdFx0dGhpcy5zcHJpdGVTaGVldC5yZW1vdmUoc3ByaXRlLm5hbWUpO1xuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1hdGgubWluKHRoaXMubWluSW5kZXgsIHNwcml0ZS5pbmRleCk7XG5cdFx0dGhpcy5tYXhJbmRleCA9IE1hdGgubWF4KHRoaXMubWF4SW5kZXgsIHNwcml0ZS5pbmRleCk7XG5cblx0XHRpZih0aGlzLmluZGV4ID4gc3ByaXRlLmluZGV4KSB0aGlzLmluZGV4ID0gc3ByaXRlLmluZGV4O1xuXHR9O1xuXG5cdFNwcml0ZVJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oKSB7XG5cdFx0Ly8gb25seSB1cGRhdGUgcG9zaXRpb25zIHRoYXQgY2hhbmdlZCBieSBwYXNzaW5nIGEgcmFuZ2Vcblx0XHR0aGlzLm1pbkluZGV4ID0gKHRoaXMubWluSW5kZXggPT0gTUFYX0NPVU5UKSA/IDAgOiB0aGlzLm1pbkluZGV4O1xuXHRcdHZhciBuZWVkc1VwZGF0ZSA9IHRoaXMubWF4SW5kZXggIT0gdGhpcy5taW5JbmRleDtcblxuXHRcdHZhciBwID0gUE9TSVRJT05fSU5URVJWQUw7XG5cdFx0dGhpcy5wb3NpdGlvbnNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCpwO1xuXHRcdHRoaXMucG9zaXRpb25zQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqcCtwKS0odGhpcy5taW5JbmRleCpwKTtcblx0XHR0aGlzLnBvc2l0aW9uc0F0dHJpYnV0ZS5uZWVkc1VwZGF0ZSA9IG5lZWRzVXBkYXRlO1xuXG5cdFx0dmFyIGkgPSBJTkRFWF9JTlRFUlZBTDtcblx0XHR0aGlzLmluZGljZXNBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCppO1xuXHRcdHRoaXMuaW5kaWNlc0F0dHJpYnV0ZS51cGRhdGVSYW5nZS5jb3VudCA9ICh0aGlzLm1heEluZGV4KmkraSktKHRoaXMubWluSW5kZXgqaSk7XG5cdFx0dGhpcy5pbmRpY2VzQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHR2YXIgdSA9IFVWX0lOVEVSVkFMO1xuXHRcdHRoaXMudXZBdHRyaWJ1dGUudXBkYXRlUmFuZ2Uub2Zmc2V0ID0gdGhpcy5taW5JbmRleCp1O1xuXHRcdHRoaXMudXZBdHRyaWJ1dGUudXBkYXRlUmFuZ2UuY291bnQgPSAodGhpcy5tYXhJbmRleCp1K3UpLSh0aGlzLm1pbkluZGV4KnUpO1xuXHRcdHRoaXMudXZBdHRyaWJ1dGUubmVlZHNVcGRhdGUgPSBuZWVkc1VwZGF0ZTtcblxuXHRcdHZhciB0ID0gVElMRV9JTlRFUlZBTDtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLm9mZnNldCA9IHRoaXMubWluSW5kZXgqdDtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLnVwZGF0ZVJhbmdlLmNvdW50ID0gKHRoaXMubWF4SW5kZXgqdCt0KS0odGhpcy5taW5JbmRleCp0KTtcblx0XHR0aGlzLnRpbGVzQXR0cmlidXRlLm5lZWRzVXBkYXRlID0gbmVlZHNVcGRhdGU7XG5cblx0XHRpZihuZWVkc1VwZGF0ZSkge1xuXHRcdFx0dGhpcy5nZW9tZXRyeS5jb21wdXRlQm91bmRpbmdCb3goKTtcblx0XHRcdHRoaXMuZ2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nU3BoZXJlKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5taW5JbmRleCA9IE1BWF9DT1VOVDtcblx0XHR0aGlzLm1heEluZGV4ID0gMDtcblx0fTtcblxuXHR3aW5kb3cuU3ByaXRlUmVuZGVyZXIgPSBTcHJpdGVSZW5kZXJlcjtcbn0oKSk7XG4iLCIoZnVuY3Rpb24oKXtcblx0dmFyIFNwcml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHR0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG5cdFx0dmFyIHggPSBkYXRhLngsXG5cdFx0XHR5ID0gZGF0YS55LFxuXHRcdFx0d2lkdGggPSBkYXRhLndpZHRoLFxuXHRcdFx0aGVpZ2h0ID0gZGF0YS5oZWlnaHQ7XG5cdFx0dGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcblx0fTtcblxuXHRTcHJpdGUucHJvdG90eXBlLmNvbXB1dGVOb3JtYWwgPSBmdW5jdGlvbihtYXhXaWR0aCwgbWF4SGVpZ2h0KSB7XG5cdFx0dGhpcy5ub3JtYWxSZWN0ID0gdGhpcy5yZWN0LmdldE5vcm1hbGl6ZWRSZWN0KG1heFdpZHRoLCBtYXhIZWlnaHQpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdHZhciBTcHJpdGVTaGVldCA9IGZ1bmN0aW9uKHRleHR1cmUsIHNwcml0ZXMpIHtcblx0XHR0aGlzLnRleHR1cmUgPSB0ZXh0dXJlO1xuXHRcdHRoaXMuc3ByaXRlcyA9IHt9O1xuXG5cdFx0Zm9yKHZhciBpPTA7IGk8c3ByaXRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5zcHJpdGVzW3Nwcml0ZXNbaV0ubmFtZV0gPSBuZXcgU3ByaXRlKHNwcml0ZXNbaV0pXG5cdFx0XHRcdC5jb21wdXRlTm9ybWFsKHRleHR1cmUuaW1hZ2Uud2lkdGgsIHRleHR1cmUuaW1hZ2UuaGVpZ2h0KTtcblx0XHR9XG5cdH07XG5cblx0U3ByaXRlU2hlZXQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHNwcml0ZU5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5zcHJpdGVzW3Nwcml0ZU5hbWVdO1xuXHR9O1xuXG5cdHdpbmRvdy5TcHJpdGVTaGVldCA9IFNwcml0ZVNoZWV0O1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIENTU19UUkFOU0ZPUk0gPSAoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHZhciBwcm9wcyA9IFtcblx0XHRcdCd0cmFuc2Zvcm0nLFxuXHRcdFx0J1dlYmtpdFRyYW5zZm9ybScsXG5cdFx0XHQnTW96VHJhbnNmb3JtJyxcblx0XHRcdCdPVHJhbnNmb3JtJyxcblx0XHRcdCdtc1RyYW5zZm9ybSdcblx0XHRdO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwcm9wID0gcHJvcHNbaV07XG5cdFx0XHRpZiAoZGl2LnN0eWxlW3Byb3BdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV0dXJuIHByb3A7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBwcm9wc1swXTtcblx0fSkoKTtcblxuXHR2YXIgV2ViR0xWaWV3ID0gZnVuY3Rpb24obWFwKSB7XG5cdFx0dGhpcy5fbWFwID0gbWFwO1xuXHRcdHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYSgwLCAyNTUsIDAsIDI1NSwgLTMwMDAsIDMwMDApO1xuXHRcdHRoaXMuY2FtZXJhLnBvc2l0aW9uLnogPSAxMDAwO1xuXHRcdHRoaXMuc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblx0XHR0aGlzLnNjZW5lTWFzayA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuXHRcdHRoaXMucmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7XG5cdFx0XHRhbHBoYTogdHJ1ZSxcblx0XHRcdGFudGlhbGlhc2luZzogdHJ1ZSxcblx0XHRcdGNsZWFyQ29sb3I6IDB4MDAwMDAwLFxuXHRcdFx0Y2xlYXJBbHBoYTogMFxuXG5cdFx0fSk7XG5cdFx0dGhpcy5yZW5kZXJlci5zZXRQaXhlbFJhdGlvKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvKTtcblx0XHR0aGlzLnJlbmRlcmVyLmF1dG9DbGVhciA9IGZhbHNlO1xuXHRcdHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudC5zdHlsZVtcInBvaW50ZXItZXZlbnRzXCJdID0gJ25vbmUnO1xuXHRcdHRoaXMuY29udGV4dCA9IHRoaXMucmVuZGVyZXIuY29udGV4dDtcblx0XHR0aGlzLmFuaW1hdGlvbkZyYW1lID0gbnVsbDtcblx0XHR0aGlzLm9iamVjdFJlbmRlcmVycyA9IFtdO1xuXHRcdHRoaXMubnVtTWFza3MgPSAwO1xuXG5cdFx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtYXAgPSB0aGlzLm1hcDtcblx0XHRcdHZhciBib3VuZHMgPSBtYXAuZ2V0Qm91bmRzKCk7XG5cdFx0XHR2YXIgdG9wTGVmdCA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoXG5cdFx0XHRcdGJvdW5kcy5nZXROb3J0aEVhc3QoKS5sYXQoKSxcblx0XHRcdFx0Ym91bmRzLmdldFNvdXRoV2VzdCgpLmxuZygpXG5cdFx0XHQpO1xuXG5cdFx0XHQvLyBUcmFuc2xhdGUgdGhlIHdlYmdsIGNhbnZhcyBiYXNlZCBvbiBtYXBzJ3MgYm91bmRzXG5cdFx0XHR2YXIgY2FudmFzID0gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50O1xuXHRcdFx0dmFyIHBvaW50ID0gdGhpcy5nZXRQcm9qZWN0aW9uKCkuZnJvbUxhdExuZ1RvRGl2UGl4ZWwodG9wTGVmdCk7XG5cdFx0XHRjYW52YXMuc3R5bGVbQ1NTX1RSQU5TRk9STV0gPSAndHJhbnNsYXRlKCcgKyBNYXRoLnJvdW5kKHBvaW50LngpICsgJ3B4LCcgKyBNYXRoLnJvdW5kKHBvaW50LnkpICsgJ3B4KSc7XG5cblx0XHRcdC8vIFJlc2l6ZSB0aGUgcmVuZGVyZXIgLyBjYW52YXMgYmFzZWQgb24gc2l6ZSBvZiB0aGUgbWFwXG5cdFx0XHR2YXIgZGl2ID0gbWFwLmdldERpdigpLCBcblx0XHRcdFx0d2lkdGggPSBkaXYuY2xpZW50V2lkdGgsIFxuXHRcdFx0XHRoZWlnaHQgPSBkaXYuY2xpZW50SGVpZ2h0O1xuXG5cdFx0XHRpZiAod2lkdGggIT09IHRoaXMud2lkdGggfHwgaGVpZ2h0ICE9PSB0aGlzLmhlaWdodCl7XG5cdFx0XHRcdHRoaXMud2lkdGggPSB3aWR0aDtcblx0XHRcdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cdFx0XHRcdHRoaXMucmVuZGVyZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIGNhbWVyYSBiYXNlZCBvbiBtYXAgem9vbSBhbmQgcG9zaXRpb25cblx0XHRcdHZhciB6b29tID0gbWFwLmdldFpvb20oKTtcblx0XHRcdHZhciBzY2FsZSA9IE1hdGgucG93KDIsIHpvb20pO1xuXHRcdFx0dmFyIG9mZnNldCA9IG1hcC5nZXRQcm9qZWN0aW9uKCkuZnJvbUxhdExuZ1RvUG9pbnQodG9wTGVmdCk7XG5cblx0XHRcdHRoaXMuY2FtZXJhLnBvc2l0aW9uLnggPSBvZmZzZXQueDtcblx0XHRcdHRoaXMuY2FtZXJhLnBvc2l0aW9uLnkgPSBvZmZzZXQueTtcblxuXHRcdFx0dGhpcy5zY2FsZSA9IHpvb207XG5cdFx0XHR0aGlzLmNhbWVyYS5zY2FsZS54ID0gdGhpcy53aWR0aCAvIDI1NiAvIHNjYWxlO1xuXHRcdFx0dGhpcy5jYW1lcmEuc2NhbGUueSA9IHRoaXMuaGVpZ2h0IC8gMjU2IC8gc2NhbGU7XG5cdFx0fTtcblxuXHRcdHRoaXMuZHJhdyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRpb25GcmFtZSk7XG5cdFx0XHR0aGlzLmFuaW1hdGlvbkZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuZGVmZXJyZWRSZW5kZXIuYmluZCh0aGlzKSk7XG5cdFx0fTtcblxuXHRcdHRoaXMuZGVmZXJyZWRSZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cblx0XHRcdHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0LCByZW5kZXJlciA9IHRoaXMucmVuZGVyZXI7XG5cdFx0XHR2YXIgbWFza0VuYWJsZWQgPSB0aGlzLm51bU1hc2tzID4gMDtcblxuXHRcdFx0aWYobWFza0VuYWJsZWQpIHtcblx0XHRcdFx0Y29udGV4dC5jb2xvck1hc2soIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlICk7XG5cdFx0XHRcdGNvbnRleHQuZGVwdGhNYXNrKCBmYWxzZSApO1xuXG5cdFx0XHRcdGNvbnRleHQuZW5hYmxlKGNvbnRleHQuU1RFTkNJTF9URVNUKTtcblx0XHRcdFx0Y29udGV4dC5zdGVuY2lsT3AoY29udGV4dC5SRVBMQUNFLCBjb250ZXh0LlJFUExBQ0UsIGNvbnRleHQuUkVQTEFDRSk7XG5cdFx0XHRcdGNvbnRleHQuc3RlbmNpbEZ1bmMoY29udGV4dC5BTFdBWVMsIDAsIDB4ZmZmZmZmZmYpO1xuXHRcdFx0XHRjb250ZXh0LmNsZWFyU3RlbmNpbCgxKTtcblxuXHRcdFx0XHR0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnNjZW5lTWFzaywgdGhpcy5jYW1lcmEsIG51bGwsIHRydWUpO1xuXG5cdFx0XHRcdGNvbnRleHQuY29sb3JNYXNrKHRydWUsIHRydWUsIHRydWUsIHRydWUpO1xuXHRcdFx0XHRjb250ZXh0LmRlcHRoTWFzayh0cnVlICk7XG5cblx0XHRcdFx0Y29udGV4dC5zdGVuY2lsRnVuYyhjb250ZXh0LkVRVUFMLCAwLCAweGZmZmZmZmZmKTsgIC8vIGRyYXcgaWYgPT0gMFxuXHRcdFx0XHRjb250ZXh0LnN0ZW5jaWxPcChjb250ZXh0LktFRVAsIGNvbnRleHQuS0VFUCwgY29udGV4dC5LRUVQKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yKHZhciBpPTA7IGk8dGhpcy5vYmplY3RSZW5kZXJlcnMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzW2ldLmRyYXcoKTtcblxuXHRcdFx0dGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5zY2VuZSwgdGhpcy5jYW1lcmEsIG51bGwsICFtYXNrRW5hYmxlZCk7XG5cblx0XHRcdGlmKG1hc2tFbmFibGVkKSB7XG5cdFx0XHRcdGNvbnRleHQuZGlzYWJsZShjb250ZXh0LlNURU5DSUxfVEVTVCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ3JlbmRlcid9KTtcblx0XHR9O1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUgPSBfLmV4dGVuZChuZXcgZ29vZ2xlLm1hcHMuT3ZlcmxheVZpZXcoKSwgbmV3IFRIUkVFLkV2ZW50RGlzcGF0Y2hlcigpKTtcblx0V2ViR0xWaWV3LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFdlYkdMVmlldztcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmdldE1hcCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9tYXA7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5vbkFkZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZ2V0UGFuZXMoKS5vdmVybGF5TGF5ZXIuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnYWRkZWRfdG9fZG9tJ30pO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUub25SZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgY2FudmFzID0gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50O1xuXHRcdHRoaXMuY2FudmFzLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5jYW52YXMpO1xuXHRcdHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdyZW1vdmVkX2Zyb21fZG9tJ30pO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIVRPRE86IFJlbW92ZSBkZXBlbmRlbmN5IG9mIFBvaW50UmVuZGVyZXIgZnJvbSBXZWJHTFZpZXdcblx0XHR0aGlzLnBvaW50UmVuZGVyZXIgPSBuZXcgUG9pbnRSZW5kZXJlcih0aGlzKS5pbml0KCk7XG5cdFx0dGhpcy5zY2VuZS5hZGQodGhpcy5wb2ludFJlbmRlcmVyLnNjZW5lT2JqZWN0KTtcblx0XHR0aGlzLnNwcml0ZVJlbmRlcmVyID0gbmV3IFNwcml0ZVJlbmRlcmVyKCkuaW5pdCgpO1xuXHRcdHRoaXMuc2NlbmUuYWRkKHRoaXMuc3ByaXRlUmVuZGVyZXIuc2NlbmVPYmplY3QpO1xuXHRcdHRoaXMucG9seWdvblJlbmRlcmVyID0gbmV3IFBvbHlnb25SZW5kZXJlcigpLmluaXQoKTtcblx0XHR0aGlzLmxpbmVSZW5kZXJlciA9IG5ldyBMaW5lUmVuZGVyZXIoKS5pbml0KCk7XG5cdFx0Ly8gYWRkIHRoZW0gdG8gYW4gYXJyYXkgc28gd2UgY2FuIGRyYXcvdXBkYXRlIHRoZW0gYWxsIGxhdGVyXG5cdFx0dGhpcy5vYmplY3RSZW5kZXJlcnMucHVzaCh0aGlzLnBvaW50UmVuZGVyZXIpO1xuXHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzLnB1c2godGhpcy5wb2x5Z29uUmVuZGVyZXIpO1xuXHRcdHRoaXMub2JqZWN0UmVuZGVyZXJzLnB1c2godGhpcy5zcHJpdGVSZW5kZXJlcik7XG5cdFx0dGhpcy5vYmplY3RSZW5kZXJlcnMucHVzaCh0aGlzLmxpbmVSZW5kZXJlcik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY2hhbmdlSGFuZGxlciA9IGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCAnYm91bmRzX2NoYW5nZWQnLCB0aGlzLmRyYXcuYmluZCh0aGlzKSk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdGdvb2dsZS5tYXBzLmV2ZW50LnJlbW92ZUxpc3RlbmVyKHRoaXMuY2hhbmdlSGFuZGxlcik7XG5cdFx0dGhpcy5jaGFuZ2VIYW5kbGVyID0gbnVsbDtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmFkZE9iamVjdCA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG5cdFx0dGhpcy5zY2VuZS5hZGQoZ2VvbWV0cnkpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUucmVtb3ZlT2JqZWN0ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lLnJlbW92ZShnZW9tZXRyeSk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRQb2ludCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gdGhpcy5wb2ludFJlbmRlcmVyLmFkZChvcHRpb25zKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLnJlbW92ZVBvaW50ID0gZnVuY3Rpb24ocG9pbnQpIHtcblx0XHR0aGlzLnBvaW50UmVuZGVyZXIucmVtb3ZlKHBvaW50KTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmFkZFNwcml0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gdGhpcy5zcHJpdGVSZW5kZXJlci5hZGQob3B0aW9ucyk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVTcHJpdGUgPSBmdW5jdGlvbihzcHJpdGUpIHtcblx0XHR0aGlzLnNwcml0ZVJlbmRlcmVyLnJlbW92ZShzcHJpdGUpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuY3JlYXRlR2VvbWV0cnkgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIGdlb21ldHJ5ID0gdGhpcy5wb2x5Z29uUmVuZGVyZXIuY3JlYXRlKG9wdGlvbnMpO1xuXHRcdGlmKGdlb21ldHJ5ICE9PSBudWxsKSB7XG5cdFx0XHR0aGlzLmFkZEdlb21ldHJ5KGdlb21ldHJ5KTtcblx0XHR9XG5cdFx0cmV0dXJuIGdlb21ldHJ5O1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuYWRkR2VvbWV0cnkgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdHRoaXMuc2NlbmUuYWRkKGdlb21ldHJ5LnNoYXBlKTtcblx0XHR0aGlzLnNjZW5lLmFkZChnZW9tZXRyeS5vdXRsaW5lKTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLnJlbW92ZUdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lLnJlbW92ZShnZW9tZXRyeS5zaGFwZSk7XG5cdFx0dGhpcy5zY2VuZS5yZW1vdmUoZ2VvbWV0cnkub3V0bGluZSk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5kZXN0cm95R2VvbWV0cnkgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdGRlbGV0ZSBnZW9tZXRyeS5zaGFwZTtcblx0XHRkZWxldGUgZ2VvbWV0cnkub3V0bGluZTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmNyZWF0ZUxpbmUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIGdlb21ldHJ5ID0gdGhpcy5saW5lUmVuZGVyZXIuY3JlYXRlKG9wdGlvbnMpO1xuXHRcdGlmKGdlb21ldHJ5ICE9PSBudWxsKSB7XG5cdFx0XHR0aGlzLmFkZExpbmUoZ2VvbWV0cnkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZ2VvbWV0cnk7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5hZGRMaW5lID0gZnVuY3Rpb24obGluZSkge1xuXHRcdHRoaXMuc2NlbmUuYWRkKGxpbmUpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5yZW1vdmVMaW5lID0gZnVuY3Rpb24obGluZSkge1xuXHRcdHRoaXMuc2NlbmUucmVtb3ZlKGxpbmUpO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5kZXN0cm95TGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcblx0XHRkZWxldGUgbGluZTtcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmNyZWF0ZU1hc2sgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIG1hc2sgPSB0aGlzLnBvbHlnb25SZW5kZXJlci5jcmVhdGUob3B0aW9ucyk7XG5cdFx0aWYobWFzayAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy5hZGRNYXNrKG1hc2spO1xuXHRcdH1cblx0XHRyZXR1cm4gbWFzaztcblx0fTtcblxuXHRXZWJHTFZpZXcucHJvdG90eXBlLmFkZE1hc2sgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdHRoaXMuc2NlbmVNYXNrLmFkZChnZW9tZXRyeS5zaGFwZSk7XG5cdFx0dGhpcy5zY2VuZU1hc2suYWRkKGdlb21ldHJ5Lm91dGxpbmUpO1xuXHRcdHRoaXMubnVtTWFza3MrPTE7XG5cdH07XG5cblx0V2ViR0xWaWV3LnByb3RvdHlwZS5yZW1vdmVNYXNrID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcblx0XHR0aGlzLnNjZW5lTWFzay5yZW1vdmUoZ2VvbWV0cnkuc2hhcGUpO1xuXHRcdHRoaXMuc2NlbmVNYXNrLnJlbW92ZShnZW9tZXRyeS5vdXRsaW5lKTtcblx0XHR0aGlzLm51bU1hc2tzLT0xO1xuXHR9O1xuXG5cdFdlYkdMVmlldy5wcm90b3R5cGUuZGVzdHJveU1hc2sgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuXHRcdGRlbGV0ZSBnZW9tZXRyeS5zaGFwZTtcblx0XHRkZWxldGUgZ2VvbWV0cnkub3V0bGluZTtcblx0fTtcblxuXHR3aW5kb3cuV2ViR0xWaWV3ID0gV2ViR0xWaWV3O1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIGh0dHAgPSB7fTtcblxuXHRodHRwLmdldCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuXHRcdHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcblx0XHR2YXIgcmVzcG9uc2VUeXBlID0gb3B0aW9ucy5yZXNwb25zZVR5cGU7XG5cdFx0aWYocmVzcG9uc2VUeXBlID09PSAnYmxvYicpIHtcblx0XHRcdHZhciBpbWFnZSA9ICQoXCI8aW1nIC8+XCIpLmF0dHIoJ3NyYycsIHVybCkub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtkYXRhOmltYWdlWzBdfSk7XG5cdFx0XHR9KTtcblx0XHR9ZWxzZXtcblx0XHRcdCQuYWpheCh1cmwsIG9wdGlvbnMpXG5cdFx0XHRcdC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywgeGhyKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtkYXRhOmRhdGEsIHN0YXR1czpzdGF0dXMsIHhocjp4aHJ9KTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmVycm9yKGZ1bmN0aW9uKHhociwgc3RhdHVzLCBlcnJvcil7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KHt4aHI6eGhyLCBzdGF0dXM6c3RhdHVzLCBlcnJvcjplcnJvcn0pO1xuXHRcdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdH07XG5cblx0d2luZG93Lmh0dHAgPSBodHRwO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIENMVVNURVJfUElYRUxfU0laRSA9IDY0O1xuXG5cdHZhciBDbHVzdGVyQ29udHJvbGxlciA9IGZ1bmN0aW9uKHdlYkdsVmlldykge1xuXHRcdHRoaXMud2ViR2xWaWV3ID0gd2ViR2xWaWV3O1xuXHRcdHRoaXMudmlld3MgPSBbXTtcblx0fTtcblxuXHRDbHVzdGVyQ29udHJvbGxlci5wcm90b3R5cGUuc2V0TWFwID0gZnVuY3Rpb24obWFwKSB7XG5cdFx0aWYobWFwKSB7XG5cdFx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0XHR0aGlzLl9hZGRFdmVudExpc3RlbmVycygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9yZW1vdmVFdmVudExpc3RlbmVycygpO1xuXHRcdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdENsdXN0ZXJDb250cm9sbGVyLnByb3RvdHlwZS5hZGRWaWV3ID0gZnVuY3Rpb24odmlldykge1xuXHRcdHZhciBpbmRleCA9IHRoaXMudmlld3MuaW5kZXhPZih2aWV3KTtcblx0XHRpZihpbmRleCA8IDApIHRoaXMudmlld3MucHVzaCh2aWV3KTtcblx0XHR2YXIgYiA9IHRoaXMuYm91bmRzO1xuXHRcdHZpZXcuc2V0Q2x1c3RlclBpeGVsU2l6ZShDTFVTVEVSX1BJWEVMX1NJWkUpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdENsdXN0ZXJDb250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVWaWV3ID0gZnVuY3Rpb24odmlldykge1xuXHRcdHZhciBpbmRleCA9IHRoaXMudmlld3MuaW5kZXhPZih2aWV3KTtcblx0XHRpZihpbmRleCA+PSAwKSB0aGlzLnZpZXdzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0dmlldy5jbGVhcigpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdENsdXN0ZXJDb250cm9sbGVyLnByb3RvdHlwZS5fYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNoYW5nZUxpc3RlbmVyID0gZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsIFwiYm91bmRzX2NoYW5nZWRcIiwgdGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG5cdH07XG5cblx0Q2x1c3RlckNvbnRyb2xsZXIucHJvdG90eXBlLl9yZW1vdmVFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdGdvb2dsZS5tYXBzLmV2ZW50LnJlbW92ZUxpc3RlbmVyKHRoaXMuY2hhbmdlTGlzdGVuZXIpO1xuXHR9O1xuXG5cdENsdXN0ZXJDb250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblxuXHR9O1xuXG5cdHdpbmRvdy5DbHVzdGVyQ29udHJvbGxlciA9IENsdXN0ZXJDb250cm9sbGVyO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblxuXHR2YXIgTUVSQ0FUT1JfUkFOR0UgPSAyNTY7XG5cblx0ZnVuY3Rpb24gY29udmVydFBvaW50VG9UaWxlKGxhdExuZywgem9vbSwgcHJvamVjdGlvbikge1xuXHRcdHZhciB3b3JsZENvb3JkaW5hdGUgPSBwcm9qZWN0aW9uLmZyb21MYXRMbmdUb1BvaW50KGxhdExuZyk7XG5cdFx0dmFyIHBpeGVsQ29vcmRpbmF0ZSA9IHt4OiB3b3JsZENvb3JkaW5hdGUueCAqIE1hdGgucG93KDIsIHpvb20pLCB5OiB3b3JsZENvb3JkaW5hdGUueSAqIE1hdGgucG93KDIsIHpvb20pfTtcblx0XHR2YXIgdGlsZUNvb3JkaW5hdGUgPSB7eDogTWF0aC5mbG9vcihwaXhlbENvb3JkaW5hdGUueCAvIE1FUkNBVE9SX1JBTkdFKSwgeTogTWF0aC5mbG9vcihwaXhlbENvb3JkaW5hdGUueSAvIE1FUkNBVE9SX1JBTkdFKX07XG5cdFx0cmV0dXJuIHRpbGVDb29yZGluYXRlO1xuXHR9XG5cblx0dmFyIFRpbGVDb250cm9sbGVyID0gZnVuY3Rpb24od2ViR2xWaWV3KSB7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy5ib3VuZHMgPSBuZXcgUmVjdGFuZ2xlKDAsIDAsIDAsIDApO1xuXHRcdHRoaXMuem9vbSA9IDA7XG5cdFx0dGhpcy5taW5ab29tID0gMDtcblx0XHR0aGlzLm1heFpvb20gPSAxMDtcblx0XHR0aGlzLmVuYWJsZWQgPSBmYWxzZTtcblx0XHR0aGlzLnZpZXdzID0gW107XG5cdH07XG5cblx0VGlsZUNvbnRyb2xsZXIucHJvdG90eXBlLnNldE1hcCA9IGZ1bmN0aW9uKG1hcCkge1xuXHRcdGlmKG1hcCkge1xuXHRcdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdFx0dGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcblx0XHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuYWRkVmlldyA9IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgaW5kZXggPSB0aGlzLnZpZXdzLmluZGV4T2Yodmlldyk7XG5cdFx0aWYoaW5kZXggPCAwKSB0aGlzLnZpZXdzLnB1c2godmlldyk7XG5cdFx0dmFyIGIgPSB0aGlzLmJvdW5kcztcblx0XHR2aWV3LnNldFRpbGVTaXplKE1FUkNBVE9SX1JBTkdFKTtcblx0XHR2aWV3LnNob3dUaWxlcyhiLnVseCwgYi51bHksIGIubHJ4LCBiLmxyeSwgdGhpcy56b29tKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUucmVtb3ZlVmlldyA9IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgaW5kZXggPSB0aGlzLnZpZXdzLmluZGV4T2Yodmlldyk7XG5cdFx0aWYoaW5kZXggPj0gMCkgdGhpcy52aWV3cy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdHZpZXcuY2xlYXIoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuX2FkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jaGFuZ2VMaXN0ZW5lciA9IGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCBcImJvdW5kc19jaGFuZ2VkXCIsIHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcblx0XHRnb29nbGUubWFwcy5ldmVudC5yZW1vdmVMaXN0ZW5lcih0aGlzLmNoYW5nZUxpc3RlbmVyKTtcblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUuaGFzQ2hhbmdlZFpvb20gPSBmdW5jdGlvbih6b29tKSB7XG5cdFx0cmV0dXJuIHRoaXMuem9vbSAhPSB6b29tO1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS5oYXNDaGFuZ2VkQm91bmRzID0gZnVuY3Rpb24odmlzaWJsZUJvdW5kcykge1xuXHRcdHZhciBjdXJyZW50Qm91bmRzID0gdGhpcy5ib3VuZHM7XG5cdFx0cmV0dXJuIGN1cnJlbnRCb3VuZHMudWx4ICE9IHZpc2libGVCb3VuZHMudWx4IHx8IFxuXHRcdFx0Y3VycmVudEJvdW5kcy51bHkgIT0gdmlzaWJsZUJvdW5kcy51bHkgfHwgXG5cdFx0XHRjdXJyZW50Qm91bmRzLmxyeCAhPSB2aXNpYmxlQm91bmRzLmxyeCB8fCBcblx0XHRcdGN1cnJlbnRCb3VuZHMubHJ5ICE9IHZpc2libGVCb3VuZHMubHJ5O1xuXHR9O1xuXG5cdFRpbGVDb250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbWFwID0gdGhpcy5tYXAsXG5cdFx0XHRib3VuZHMgPSBtYXAuZ2V0Qm91bmRzKCksXG5cdFx0XHRib3VuZHNOZUxhdExuZyA9IGJvdW5kcy5nZXROb3J0aEVhc3QoKSxcblx0XHRcdGJvdW5kc1N3TGF0TG5nID0gYm91bmRzLmdldFNvdXRoV2VzdCgpLFxuXHRcdFx0Ym91bmRzTndMYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGJvdW5kc05lTGF0TG5nLmxhdCgpLCBib3VuZHNTd0xhdExuZy5sbmcoKSksXG5cdFx0XHRib3VuZHNTZUxhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoYm91bmRzU3dMYXRMbmcubGF0KCksIGJvdW5kc05lTGF0TG5nLmxuZygpKSxcblx0XHRcdHpvb20gPSBtYXAuZ2V0Wm9vbSgpLFxuXHRcdFx0cHJvamVjdGlvbiA9IG1hcC5nZXRQcm9qZWN0aW9uKCksXG5cdFx0XHR0aWxlQ29vcmRpbmF0ZU53ID0gY29udmVydFBvaW50VG9UaWxlKGJvdW5kc053TGF0TG5nLCB6b29tLCBwcm9qZWN0aW9uKSxcblx0XHRcdHRpbGVDb29yZGluYXRlU2UgPSBjb252ZXJ0UG9pbnRUb1RpbGUoYm91bmRzU2VMYXRMbmcsIHpvb20sIHByb2plY3Rpb24pLFxuXHRcdFx0dmlzaWJsZUJvdW5kcyA9IG5ldyBSZWN0YW5nbGUodGlsZUNvb3JkaW5hdGVOdy54LCB0aWxlQ29vcmRpbmF0ZU53LnksIFxuXHRcdFx0XHR0aWxlQ29vcmRpbmF0ZVNlLngtdGlsZUNvb3JkaW5hdGVOdy54LCB0aWxlQ29vcmRpbmF0ZVNlLnktdGlsZUNvb3JkaW5hdGVOdy55KTtcblxuXHRcdHpvb20gPSBNYXRoLm1heCh0aGlzLm1pblpvb20sIHpvb20pO1xuXHRcdHpvb20gPSBNYXRoLm1pbih0aGlzLm1heFpvb20sIHpvb20pO1xuXG5cdFx0dmFyIGN1cnJlbnRCb3VuZHMgPSB0aGlzLmJvdW5kcztcblx0XHR2YXIgeCA9IE1hdGgubWluKGN1cnJlbnRCb3VuZHMudWx4LCB2aXNpYmxlQm91bmRzLnVseCksXG5cdFx0XHR5ID0gTWF0aC5taW4oY3VycmVudEJvdW5kcy51bHksIHZpc2libGVCb3VuZHMudWx5KSxcblx0XHRcdHdpZHRoID0gTWF0aC5tYXgoY3VycmVudEJvdW5kcy5scngsIHZpc2libGVCb3VuZHMubHJ4KSAtIHgsXG5cdFx0XHRoZWlnaHQgPSBNYXRoLm1heChjdXJyZW50Qm91bmRzLmxyeSwgdmlzaWJsZUJvdW5kcy5scnkpIC0geTtcblx0XHR2YXIgcmFuZ2UgPSBuZXcgUmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuXHRcdFxuXHRcdC8vIEhpZGUgZXZlcnl0aGluZyBpZiB3ZSBjaGFuZ2VkIHpvb20gbGV2ZWwuXG5cdFx0Ly8gVGhlbiBzZXQgdGhlIHJhbmdlIHRvIHVwZGF0ZSBvbmx5IHRoZSB2aXNpYmxlIHRpbGVzLlxuXHRcdGlmKHRoaXMuaGFzQ2hhbmdlZFpvb20oem9vbSkpIHtcblx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGFsbCBjdXJyZW50bHkgdmlzaWJsZSB0aWxlcyB3aWxsIGJlIGhpZGRlbi5cblx0XHRcdHRoaXMudXBkYXRlVGlsZXMoY3VycmVudEJvdW5kcywgY3VycmVudEJvdW5kcywgbmV3IFJlY3RhbmdsZSgtMSwgLTEsIDAsIDApLCB0aGlzLnpvb20pO1xuXHRcdFx0Ly8gVGhlbiBtYWtlIHN1cmUgdGhhdCBhbGwgdGlsZXMgdGhhdCBzaG91bGQgYmUgdmlzaWJsZSB3aWxsIGNhbGwgc2hvd1RpbGUgYmVsb3cuXG5cdFx0XHRjdXJyZW50Qm91bmRzID0gbmV3IFJlY3RhbmdsZSgtMSwgLTEsIDAsIDApO1xuXHRcdFx0Ly8gV2Ugb25seSBuZWVkIHRvIHVwZGF0ZSBhbGwgdmlzaWJsZSB0aWxlcyBiZWxvdy5cblx0XHRcdHJhbmdlID0gdmlzaWJsZUJvdW5kcztcblx0XHR9XG5cblx0XHQvLyBJdGVyYXRlIGFsbCB0aGUgbGF5ZXJzIHRvIHVwZGF0ZSB3aGljaCB0aWxlcyBhcmUgdmlzaWJsZS5cblx0XHRpZih0aGlzLmhhc0NoYW5nZWRCb3VuZHModmlzaWJsZUJvdW5kcykpIHtcblx0XHRcdHRoaXMudXBkYXRlVGlsZXMocmFuZ2UsIGN1cnJlbnRCb3VuZHMsIHZpc2libGVCb3VuZHMsIHpvb20pO1xuXHRcdH1cblx0fTtcblxuXHRUaWxlQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlVGlsZXMgPSBmdW5jdGlvbihyYW5nZSwgY3VycmVudEJvdW5kcywgdmlzaWJsZUJvdW5kcywgem9vbSkge1xuXHRcdHZhciB2aWV3cyA9IHRoaXMudmlld3M7XG5cdFx0Zm9yKHZhciBpPTA7IGk8dmlld3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdGZvcih2YXIgY29sdW1uPXJhbmdlLnVseDsgY29sdW1uPD1yYW5nZS5scng7IGNvbHVtbisrKSB7XG5cdFx0XHRcdGZvcih2YXIgcm93PXJhbmdlLnVseTsgcm93PD1yYW5nZS5scnk7IHJvdysrKSB7XG5cdFx0XHRcdFx0aWYodmlzaWJsZUJvdW5kcy5jb250YWluc1BvaW50KGNvbHVtbiwgcm93KSkge1xuXHRcdFx0XHRcdFx0Ly8gT25seSBzaG93VGlsZSBpZiBpdCdzIG5vdCBhbHJlYWR5IHZpc2libGVcblx0XHRcdFx0XHRcdGlmKCFjdXJyZW50Qm91bmRzLmNvbnRhaW5zUG9pbnQoY29sdW1uLCByb3cpKVxuXHRcdFx0XHRcdFx0XHR2aWV3c1tpXS5zaG93VGlsZShjb2x1bW4sIHJvdywgem9vbSk7XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHQvLyBIaWRlIHRpbGUgdGhhdCBpcyBjdXJyZW50bHkgdmlzaWJsZVxuXHRcdFx0XHRcdFx0aWYoY3VycmVudEJvdW5kcy5jb250YWluc1BvaW50KGNvbHVtbiwgcm93KSlcblx0XHRcdFx0XHRcdFx0dmlld3NbaV0uaGlkZVRpbGUoY29sdW1uLCByb3csIHpvb20pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHRcdH1cblx0XHR0aGlzLnpvb20gPSB6b29tO1xuXHRcdHRoaXMuYm91bmRzID0gdmlzaWJsZUJvdW5kcztcblx0fTtcblxuXHR3aW5kb3cuVGlsZUNvbnRyb2xsZXIgPSBUaWxlQ29udHJvbGxlcjtcbn0oKSk7XG4iLCIoZnVuY3Rpb24oKXtcblx0dmFyIEdlb0pTT05EYXRhU291cmNlID0gZnVuY3Rpb24odXJsLCBwcm9qZWN0aW9uKXtcblx0XHR0aGlzLnVybCA9IHVybDtcblx0XHR0aGlzLnByb2plY3Rpb24gPSBwcm9qZWN0aW9uO1xuXHRcdHRoaXMuZmlsZUV4dGVuc2lvbiA9IFwianNvblwiO1xuXHRcdHRoaXMucmVzcG9uc2VUeXBlID0gXCJqc29uXCI7XG5cdH07XG5cblx0R2VvSlNPTkRhdGFTb3VyY2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdHZhciBmZWF0dXJlQ29sbGVjdGlvbiA9IHtwb2x5Z29uczpbXSwgcG9pbnRzOltdLCBsaW5lczpbXX07XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBleHRyYWN0RmVhdHVyZXMgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHR2YXIgZmVhdHVyZSA9IHNlbGYuX3BhcnNlRmVhdHVyZShkYXRhKTtcblx0XHRcdGlmKGZlYXR1cmUucG9seWdvbnMubGVuZ3RoID4gMClcblx0XHRcdFx0ZmVhdHVyZUNvbGxlY3Rpb24ucG9seWdvbnMgPSBmZWF0dXJlQ29sbGVjdGlvbi5wb2x5Z29ucy5jb25jYXQoZmVhdHVyZS5wb2x5Z29ucyk7XG5cdFx0XHRpZihmZWF0dXJlLnBvaW50cy5sZW5ndGggPiAwKVxuXHRcdFx0XHRmZWF0dXJlQ29sbGVjdGlvbi5wb2ludHMgPSBmZWF0dXJlQ29sbGVjdGlvbi5wb2ludHMuY29uY2F0KGZlYXR1cmUucG9pbnRzKTtcblx0XHRcdGlmKGZlYXR1cmUubGluZXMubGVuZ3RoID4gMClcblx0XHRcdFx0ZmVhdHVyZUNvbGxlY3Rpb24ubGluZXMgPSBmZWF0dXJlQ29sbGVjdGlvbi5saW5lcy5jb25jYXQoZmVhdHVyZS5saW5lcyk7XG5cdFx0fVxuXHRcdGlmKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVDb2xsZWN0aW9uXCIpIHtcblx0XHRcdFx0dmFyIGZlYXR1cmVzID0gZGF0YS5mZWF0dXJlcztcblx0XHRcdFx0Zm9yKHZhciBpPTA7IGk8ZmVhdHVyZXMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdFx0ZXh0cmFjdEZlYXR1cmVzKGZlYXR1cmVzW2ldKTtcblx0XHRcdH1lbHNlIGlmKGRhdGEudHlwZSA9PSBcIkZlYXR1cmVcIikge1xuXHRcdFx0XHRleHRyYWN0RmVhdHVyZXMoZGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmZWF0dXJlQ29sbGVjdGlvbjtcblx0fTtcblxuXHRHZW9KU09ORGF0YVNvdXJjZS5wcm90b3R5cGUuX3BhcnNlRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpIHtcblx0XHR2YXIgcG9seWdvbnMgPSBbXSwgcG9pbnRzID0gW10sIGxpbmVzID0gW107XG5cdFx0aWYoZmVhdHVyZS5nZW9tZXRyeS50eXBlID09IFwiUG9seWdvblwiKSB7XG5cdFx0XHR2YXIgY29vcmRpbmF0ZXMgPSBmZWF0dXJlLmdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8Y29vcmRpbmF0ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIGxpbmVhclJpbmcgPSBjb29yZGluYXRlc1tpXTtcblx0XHRcdFx0cG9seWdvbnMucHVzaCh0aGlzLl9wYXJzZUNvb3JkaW5hdGVzKGxpbmVhclJpbmcpKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZSBpZihmZWF0dXJlLmdlb21ldHJ5LnR5cGUgPT0gXCJNdWx0aVBvbHlnb25cIikge1xuXHRcdFx0dmFyIGNvb3JkaW5hdGVzID0gZmVhdHVyZS5nZW9tZXRyeS5jb29yZGluYXRlcztcblx0XHRcdGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBwb2x5Z29uID0gY29vcmRpbmF0ZXNbaV07XG5cdFx0XHRcdGZvcih2YXIgaj0wOyBqPHBvbHlnb24ubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHR2YXIgbGluZWFyUmluZyA9IHBvbHlnb25bal07XG5cdFx0XHRcdFx0cG9seWdvbnMucHVzaCh0aGlzLl9wYXJzZUNvb3JkaW5hdGVzKGxpbmVhclJpbmcpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIGlmKGZlYXR1cmUuZ2VvbWV0cnkudHlwZSA9PSBcIkxpbmVTdHJpbmdcIikge1xuXHRcdFx0bGluZXMucHVzaCh0aGlzLl9wYXJzZUNvb3JkaW5hdGVzKGZlYXR1cmUuZ2VvbWV0cnkuY29vcmRpbmF0ZXMpKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihmZWF0dXJlLmdlb21ldHJ5LnR5cGUgPT0gXCJNdWx0aUxpbmVTdHJpbmdcIikge1xuXHRcdFx0dmFyIGNvb3JkaW5hdGVzID0gZmVhdHVyZS5nZW9tZXRyeS5jb29yZGluYXRlcztcblx0XHRcdGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBsaW5lU3RyaW5nID0gY29vcmRpbmF0ZXNbaV07XG5cdFx0XHRcdGxpbmVzLnB1c2godGhpcy5fcGFyc2VDb29yZGluYXRlcyhsaW5lU3RyaW5nKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2UgaWYoZmVhdHVyZS5nZW9tZXRyeS50eXBlID09IFwiUG9pbnRcIikge1xuXHRcdFx0dmFyIGNvb3JkaW5hdGVzID0gZmVhdHVyZS5nZW9tZXRyeS5jb29yZGluYXRlcztcblx0XHRcdHZhciBsYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGNvb3JkaW5hdGVzWzFdLCBjb29yZGluYXRlc1swXSk7XG5cdFx0XHR2YXIgcG9pbnQgPSB0aGlzLnByb2plY3Rpb24uZnJvbUxhdExuZ1RvUG9pbnQobGF0TG5nKTtcblx0XHRcdHBvaW50cy5wdXNoKHtsYXRMbmc6IGxhdExuZywgcG9pbnQ6IHBvaW50fSk7XG5cdFx0fVxuXHRcdHJldHVybiB7cG9seWdvbnM6cG9seWdvbnMsIHBvaW50czpwb2ludHMsIGxpbmVzOmxpbmVzfTtcblx0fTtcblxuXHRHZW9KU09ORGF0YVNvdXJjZS5wcm90b3R5cGUuX3BhcnNlQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbihjb29yZGluYXRlcykge1xuXHRcdHZhciBwb2ludHMgPSBbXTtcblx0XHRmb3IodmFyIGo9MDsgajxjb29yZGluYXRlc1tpXS5sZW5ndGg7IGorKykge1xuXHRcdFx0dmFyIGxhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoY29vcmRpbmF0ZXNbaV1bal1bMV0sIGNvb3JkaW5hdGVzW2ldW2pdWzBdKTtcblx0XHRcdHZhciBwb2ludCA9IHRoaXMucHJvamVjdGlvbi5mcm9tTGF0TG5nVG9Qb2ludChsYXRMbmcpO1xuXHRcdFx0cG9pbnRzLnB1c2goW3BvaW50LngsIHBvaW50LnldKTtcblx0XHR9XG5cdFx0cmV0dXJuIHBvaW50cztcblx0fTtcblxuXHR3aW5kb3cuR2VvSlNPTkRhdGFTb3VyY2UgPSBHZW9KU09ORGF0YVNvdXJjZTtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdHZhciBJbWFnZURhdGFTb3VyY2UgPSBmdW5jdGlvbih1cmwpe1xuXHRcdHRoaXMudXJsID0gdXJsO1xuXHRcdHRoaXMuZmlsZUV4dGVuc2lvbiA9IFwicG5nXCI7XG5cdFx0dGhpcy5yZXNwb25zZVR5cGUgPSBcImJsb2JcIjtcblx0fTtcblxuXHRJbWFnZURhdGFTb3VyY2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSl7XG5cdFx0cmV0dXJuIGRhdGE7XG5cdH07XG5cblx0d2luZG93LkltYWdlRGF0YVNvdXJjZSA9IEltYWdlRGF0YVNvdXJjZTtcbn0oKSk7IiwiKGZ1bmN0aW9uKCl7XG5cdC8qKlxuXHQgKiBTaXRlcyBUeXBlZCBBcnJheSAtIERhdGEgU291cmNlXG5cdCAqIEZvcm1hdDogVWludDMyQXJyYXlbaSo0XSB3aGVyZSBpIGlzIG51bWJlciBvZiBzaXRlc1xuXHQgKiBhcnJheVswXSA9IGxhdGl0dWRlXG5cdCAqIGFycmF5WzFdID0gbG9uZ2l0dWRlXG5cdCAqIGFycmF5WzJdID0gY2x1c3RlciBjb3VudC4gaWYgPiAxLCB0aGVuIGl0J3MgYSBjbHVzdGVyLiBpZiA9PSAxLCB0aGVuIGl0J3MgYSBwb2ludC5cblx0ICogYXJyYXlbM10gPSBzaXRlIGlkXG5cdCAqL1xuXHR2YXIgU1RBRGF0YVNvdXJjZSA9IGZ1bmN0aW9uKHVybCwgcHJvamVjdGlvbil7XG5cdFx0dGhpcy51cmwgPSB1cmw7XG5cdFx0dGhpcy5wcm9qZWN0aW9uID0gcHJvamVjdGlvbjtcblx0XHR0aGlzLmZpbGVFeHRlbnNpb24gPSBcIlwiO1xuXHRcdHRoaXMucmVzcG9uc2VUeXBlID0gXCJhcnJheWJ1ZmZlclwiO1xuXHR9O1xuXG5cdFNUQURhdGFTb3VyY2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdHZhciBwcm9qZWN0aW9uID0gdGhpcy5wcm9qZWN0aW9uO1xuXHRcdHZhciBkYXRhID0gbmV3IFVpbnQzMkFycmF5KHJlc3BvbnNlLmRhdGEpO1xuXHRcdHZhciBtYXJrZXJzID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSs9NCkge1xuXHRcdFx0dmFyIGxhdExuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YVtpXS8xMDAwMDAwLjAsIGRhdGFbaSsxXS8xMDAwMDAwLjApO1xuXHRcdFx0dmFyIHBvaW50ID0gcHJvamVjdGlvbi5mcm9tTGF0TG5nVG9Qb2ludChsYXRMbmcpO1xuXHRcdFx0dmFyIGNvdW50ID0gZGF0YVtpKzJdO1xuXHRcdFx0dmFyIGlkICA9IGRhdGFbaSszXTtcblx0XHRcdG1hcmtlcnMucHVzaCh7aWQ6IGlkLCBjb3VudDogY291bnQsIGxhdExuZzogbGF0TG5nLCBwb2ludDogcG9pbnR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIG1hcmtlcnM7XG5cdH07XG5cblx0d2luZG93LlNUQURhdGFTb3VyY2UgPSBTVEFEYXRhU291cmNlO1xufSgpKTsiLCIoZnVuY3Rpb24oKXtcblx0dmFyIFRpbGVQcm92aWRlciA9IGZ1bmN0aW9uKGRhdGFTb3VyY2UsICRodHRwLCAkcSkge1xuXHRcdHRoaXMuZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2U7XG5cdFx0dGhpcy4kaHR0cCA9ICRodHRwO1xuXHRcdHRoaXMuJHEgPSAkcTtcblx0XHR0aGlzLnRpbGVzID0ge307XG5cdH07XG5cblx0VGlsZVByb3ZpZGVyLnByb3RvdHlwZS5nZXRUaWxlVXJsID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHJldHVybiB0aGlzLmRhdGFTb3VyY2UudXJsK1wiL1wiK3orXCIvXCIreCtcIi9cIit5K1wiLlwiK3RoaXMuZGF0YVNvdXJjZS5maWxlRXh0ZW5zaW9uO1xuXHR9O1xuXG5cdFRpbGVQcm92aWRlci5wcm90b3R5cGUuZ2V0VGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgZGVmZXJyZWQgPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dmFyIHVybCA9IHRoaXMuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHRpZih0aGlzLnRpbGVzW3VybF0pe1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7dXJsOnVybCwgZGF0YTp0aGlzLnRpbGVzW3VybF19KTtcblx0XHR9ZWxzZXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuJGh0dHAuZ2V0KHVybCwge3Jlc3BvbnNlVHlwZTogdGhpcy5kYXRhU291cmNlLnJlc3BvbnNlVHlwZX0pXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0gPSBzZWxmLmRhdGFTb3VyY2UucGFyc2UocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7dXJsOnVybCwgZGF0YTpzZWxmLnRpbGVzW3VybF19KTtcblx0XHRcdFx0fSwgZnVuY3Rpb24ocmVhc29uKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHR9O1xuXG5cdHdpbmRvdy5UaWxlUHJvdmlkZXIgPSBUaWxlUHJvdmlkZXI7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgSW1hZ2VUaWxlVmlldyA9IGZ1bmN0aW9uKHRpbGVQcm92aWRlciwgd2ViR2xWaWV3KSB7XG5cdFx0dGhpcy50aWxlUHJvdmlkZXIgPSB0aWxlUHJvdmlkZXI7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy50aWxlcyA9IHt9O1xuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLnNldFRpbGVTaXplID0gZnVuY3Rpb24odGlsZVNpemUpIHtcblx0XHR0aGlzLnRpbGVTaXplID0gdGlsZVNpemU7XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGVzID0gZnVuY3Rpb24odWx4LCB1bHksIGxyeCwgbHJ5LCB6b29tKSB7XG5cdFx0Zm9yKHZhciBjb2x1bW49dWx4OyBjb2x1bW48PWxyeDsgY29sdW1uKyspIHtcblx0XHRcdGZvcih2YXIgcm93PXVseTsgcm93PD1scnk7IHJvdysrKSB7XG5cdFx0XHRcdHRoaXMuc2hvd1RpbGUoY29sdW1uLCByb3csIHpvb20pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLndlYkdsVmlldy5kcmF3KCk7XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuc2hvd1RpbGUgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG5cdFx0dmFyIHVybCA9IHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGVVcmwoeCwgeSwgeik7XG5cdFx0aWYodGhpcy50aWxlc1t1cmxdKSB7XG5cdFx0XHRpZighdGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5KSB7XG5cdFx0XHRcdHZhciBzY2FsZUZhY3RvciA9IE1hdGgucG93KDIsIHopO1xuXHRcdFx0XHR2YXIgc3ByaXRlU2l6ZSA9IHRoaXMudGlsZVNpemUgLyBzY2FsZUZhY3Rvcjtcblx0XHRcdFx0dmFyIHNwcml0ZU9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0cG9zaXRpb246IHt4Ongqc3ByaXRlU2l6ZSwgeTp5KnNwcml0ZVNpemUsIHo6en0sXG5cdFx0XHRcdFx0d2lkdGg6IHNwcml0ZVNpemUsXG5cdFx0XHRcdFx0aGVpZ2h0OiBzcHJpdGVTaXplLFxuXHRcdFx0XHRcdGltYWdlOiB0aGlzLnRpbGVzW3VybF0uZGF0YSxcblx0XHRcdFx0XHRpbWFnZU5hbWU6IHVybFxuXHRcdFx0XHR9O1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSB0aGlzLndlYkdsVmlldy5hZGRTcHJpdGUoc3ByaXRlT3B0aW9ucyk7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0XHRcdH1cblx0XHR9ZWxzZXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGUoeCwgeSwgeilcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdHNlbGYudGlsZXNbdXJsXSA9IHJlc3BvbnNlO1xuXHRcdFx0XHRcdHZhciBzY2FsZUZhY3RvciA9IE1hdGgucG93KDIsIHopO1xuXHRcdFx0XHRcdHZhciBzcHJpdGVTaXplID0gc2VsZi50aWxlU2l6ZSAvIHNjYWxlRmFjdG9yO1xuXHRcdFx0XHRcdHZhciBzcHJpdGVPcHRpb25zID0ge1xuXHRcdFx0XHRcdFx0cG9zaXRpb246IHt4Ongqc3ByaXRlU2l6ZSwgeTp5KnNwcml0ZVNpemUsIHo6en0sXG5cdFx0XHRcdFx0XHR3aWR0aDogc3ByaXRlU2l6ZSxcblx0XHRcdFx0XHRcdGhlaWdodDogc3ByaXRlU2l6ZSxcblx0XHRcdFx0XHRcdGltYWdlOiBzZWxmLnRpbGVzW3VybF0uZGF0YSxcblx0XHRcdFx0XHRcdGltYWdlTmFtZTogdXJsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRzZWxmLnRpbGVzW3VybF0uZ2VvbWV0cnkgPSBzZWxmLndlYkdsVmlldy5hZGRTcHJpdGUoc3ByaXRlT3B0aW9ucyk7XG5cdFx0XHRcdFx0c2VsZi53ZWJHbFZpZXcuZHJhdygpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihyZWFzb24pe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2cocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdEltYWdlVGlsZVZpZXcucHJvdG90eXBlLmhpZGVUaWxlID0gZnVuY3Rpb24oeCwgeSwgeikge1xuXHRcdHZhciB1cmwgPSB0aGlzLnRpbGVQcm92aWRlci5nZXRUaWxlVXJsKHgsIHksIHopO1xuXHRcdGlmKHRoaXMudGlsZXNbdXJsXSAmJiB0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpIHtcblx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZVNwcml0ZSh0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpO1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLmdlb21ldHJ5ID0gbnVsbDtcblx0XHR9XG5cdH07XG5cblx0SW1hZ2VUaWxlVmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0XHRmb3IodmFyIHVybCBpbiB0aGlzLnRpbGVzKSB7XG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0uZ2VvbWV0cnkpIHtcblx0XHRcdFx0dGhpcy53ZWJHbFZpZXcucmVtb3ZlU3ByaXRlKHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSk7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5nZW9tZXRyeSA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHR3aW5kb3cuSW1hZ2VUaWxlVmlldyA9IEltYWdlVGlsZVZpZXc7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXHR2YXIgU2l0ZUNsdXN0ZXJWaWV3ID0gZnVuY3Rpb24oKXtcblxuXHR9O1xuXG5cdHdpbmRvdy5TaXRlQ2x1c3RlclZpZXcgPSBTaXRlQ2x1c3RlclZpZXc7XG59KCkpOyIsIihmdW5jdGlvbigpe1xuXG5cdGZ1bmN0aW9uIGNvbG9yVG9IZXgoYikge1xuXHRcdHZhciBoZXhDaGFyID0gW1wiMFwiLCBcIjFcIiwgXCIyXCIsIFwiM1wiLCBcIjRcIiwgXCI1XCIsIFwiNlwiLCBcIjdcIixcIjhcIiwgXCI5XCIsIFwiYVwiLCBcImJcIiwgXCJjXCIsIFwiZFwiLCBcImVcIiwgXCJmXCJdO1xuXHRcdHJldHVybiBoZXhDaGFyWyhiID4+IDIwKSAmIDB4MGZdICsgaGV4Q2hhclsoYiA+PiAxNikgJiAweDBmXSArIFxuXHRcdFx0aGV4Q2hhclsoYiA+PiAxMikgJiAweDBmXSArIGhleENoYXJbKGIgPj4gOCkgJiAweDBmXSArIFxuXHRcdFx0aGV4Q2hhclsoYiA+PiA0KSAmIDB4MGZdICsgaGV4Q2hhcltiICYgMHgwZl07XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRSYW5kb21Db2xvcigpIHtcblx0XHRyZXR1cm4gKE1hdGguZmxvb3IoMjU1LjAqTWF0aC5yYW5kb20oKSkgJiAweEZGKSA8PCAxNiBcblx0XHRcdHwgKE1hdGguZmxvb3IoMjU1LjAqTWF0aC5yYW5kb20oKSkgJiAweEZGKSA8PCA4IFxuXHRcdFx0fCAoTWF0aC5mbG9vcigyNTUuMCpNYXRoLnJhbmRvbSgpKSAmIDB4RkYpO1xuXHR9XG5cblx0dmFyIFZlY3RvclRpbGVWaWV3ID0gZnVuY3Rpb24odGlsZVByb3ZpZGVyLCB3ZWJHbFZpZXcsIGljb25JbWFnZSwgdXNlUmFuZG9tQ29sb3JzKSB7XG5cdFx0dGhpcy50aWxlUHJvdmlkZXIgPSB0aWxlUHJvdmlkZXI7XG5cdFx0dGhpcy53ZWJHbFZpZXcgPSB3ZWJHbFZpZXc7XG5cdFx0dGhpcy5pY29uSW1hZ2UgPSBpY29uSW1hZ2U7XG5cdFx0dGhpcy50aWxlcyA9IHt9O1xuXHRcdHRoaXMuc2hvd25UaWxlcyA9IHt9O1xuXG5cdFx0Ly8gdXNlZCBmb3IgZGVidWdnaW5nXG5cdFx0dGhpcy51c2VSYW5kb21Db2xvcnMgPSB1c2VSYW5kb21Db2xvcnM7XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLnNldFRpbGVTaXplID0gZnVuY3Rpb24odGlsZVNpemUpIHtcblx0XHR0aGlzLnRpbGVTaXplID0gdGlsZVNpemU7XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLnNldFRpbGVTaXplID0gZnVuY3Rpb24odGlsZVNpemUpIHtcblx0XHR0aGlzLnRpbGVTaXplID0gdGlsZVNpemU7XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLnNob3dUaWxlcyA9IGZ1bmN0aW9uKHVseCwgdWx5LCBscngsIGxyeSwgem9vbSkge1xuXHRcdGZvcih2YXIgY29sdW1uPXVseDsgY29sdW1uPD1scng7IGNvbHVtbisrKSB7XG5cdFx0XHRmb3IodmFyIHJvdz11bHk7IHJvdzw9bHJ5OyByb3crKykge1xuXHRcdFx0XHR0aGlzLnNob3dUaWxlKGNvbHVtbiwgcm93LCB6b29tKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5zaG93VGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgdXJsID0gdGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHQvLyBjb25zb2xlLmxvZyhcIlNob3dpbmcgdGlsZTogXCIgKyB1cmwpO1xuXHRcdGlmKHRoaXMuc2hvd25UaWxlc1t1cmxdKSByZXR1cm47XG5cdFx0dGhpcy5zaG93blRpbGVzW3VybF0gPSB0cnVlO1xuXG5cdFx0aWYodGhpcy50aWxlc1t1cmxdKSB7XG5cdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMgfHwgdGhpcy50aWxlc1t1cmxdLmxpbmVzKVxuXHRcdFx0XHRpZih0aGlzLnRpbGVzW3VybF0ucG9seWdvbnMpXG5cdFx0XHRcdFx0dGhpcy53ZWJHbFZpZXcuYWRkR2VvbWV0cnkodGhpcy50aWxlc1t1cmxdLnBvbHlnb25zKTtcblx0XHRcdFx0aWYodGhpcy50aWxlc1t1cmxdLmxpbmVzKVxuXHRcdFx0XHRcdHRoaXMud2ViR2xWaWV3LmFkZExpbmUodGhpcy50aWxlc1t1cmxdLmxpbmVzKTtcblx0XHRcdGVsc2UgaWYodGhpcy50aWxlc1t1cmxdLmRhdGEpIFxuXHRcdFx0XHR0aGlzLmNyZWF0ZUZlYXR1cmVzKHRoaXMudGlsZXNbdXJsXS5kYXRhKTtcblx0XHR9ZWxzZXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMudGlsZVByb3ZpZGVyLmdldFRpbGUoeCwgeSwgeilcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdHNlbGYudGlsZXNbdXJsXSA9IHJlc3BvbnNlO1xuXHRcdFx0XHRcdGlmKHNlbGYuc2hvd25UaWxlc1t1cmxdKVxuXHRcdFx0XHRcdFx0c2VsZi5jcmVhdGVGZWF0dXJlcyhzZWxmLnRpbGVzW3VybF0uZGF0YSk7XG5cdFx0XHRcdH0sIGZ1bmN0aW9uKHJlYXNvbil7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2cocmVhc29uKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5oaWRlVGlsZSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcblx0XHR2YXIgdXJsID0gdGhpcy50aWxlUHJvdmlkZXIuZ2V0VGlsZVVybCh4LCB5LCB6KTtcblx0XHQvLyBjb25zb2xlLmxvZyhcIkhpZGluZyB0aWxlOiBcIiArIHVybCk7XG5cdFx0dGhpcy5zaG93blRpbGVzW3VybF0gPSBmYWxzZTtcblxuXHRcdGlmKHRoaXMudGlsZXNbdXJsXSkge1xuXHRcdFx0aWYodGhpcy50aWxlc1t1cmxdLnBvbHlnb25zKSB7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZUdlb21ldHJ5KHRoaXMudGlsZXNbdXJsXS5wb2x5Z29ucyk7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnRpbGVzW3VybF0ucG9seWdvbnM7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5wb2x5Z29ucyA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5saW5lcykge1xuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVMaW5lKHRoaXMudGlsZXNbdXJsXS5saW5lcyk7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnRpbGVzW3VybF0ubGluZXM7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5saW5lcyA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5wb2ludHMpIHtcblx0XHRcdFx0dmFyIHBvaW50cyA9IHRoaXMudGlsZXNbdXJsXS5wb2ludHM7XG5cdFx0XHRcdGZvcih2YXIgaT0wOyBpPHBvaW50cy5sZW5ndGg7IGkrKylcblx0XHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVQb2ludChwb2ludHNbaV0pO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ucG9pbnRzID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0VmVjdG9yVGlsZVZpZXcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG5cdFx0Zm9yKHZhciB1cmwgaW4gdGhpcy50aWxlcykge1xuXHRcdFx0aWYodGhpcy50aWxlc1t1cmxdLnBvbHlnb25zKSB7XG5cdFx0XHRcdHRoaXMud2ViR2xWaWV3LnJlbW92ZUdlb21ldHJ5KHRoaXMudGlsZXNbdXJsXS5wb2x5Z29ucyk7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnRpbGVzW3VybF0ucG9seWdvbnM7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5wb2x5Z29ucyA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5saW5lcykge1xuXHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVMaW5lKHRoaXMudGlsZXNbdXJsXS5saW5lcyk7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnRpbGVzW3VybF0ubGluZXM7XG5cdFx0XHRcdHRoaXMudGlsZXNbdXJsXS5saW5lcyA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMudGlsZXNbdXJsXS5wb2ludHMpIHtcblx0XHRcdFx0dmFyIHBvaW50cyA9IHRoaXMudGlsZXNbdXJsXS5wb2ludHM7XG5cdFx0XHRcdGZvcih2YXIgaT0wOyBpPHBvaW50cy5sZW5ndGg7IGkrKylcblx0XHRcdFx0XHR0aGlzLndlYkdsVmlldy5yZW1vdmVQb2ludChwb2ludHNbaV0pO1xuXHRcdFx0XHR0aGlzLnRpbGVzW3VybF0ucG9pbnRzID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy53ZWJHbFZpZXcuZHJhdygpO1xuXHR9O1xuXG5cdFZlY3RvclRpbGVWaWV3LnByb3RvdHlwZS5jcmVhdGVGZWF0dXJlcyA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG5cdFx0dmFyIGFkZGVkID0gZmFsc2U7XG5cblx0XHRpZihmZWF0dXJlcy5wb2x5Z29ucy5sZW5ndGggPiAwKSB7XG5cdFx0XHR2YXIgcG9seWdvbk9wdGlvbnMgPSB7fTtcblx0XHRcdHBvbHlnb25PcHRpb25zLmZlYXR1cmVzID0gZmVhdHVyZXMucG9seWdvbnM7XG5cdFx0XHRwb2x5Z29uT3B0aW9ucy5maWxsQ29sb3IgPSB0aGlzLnVzZVJhbmRvbUNvbG9ycyA/IGdldFJhbmRvbUNvbG9yKCkgOiBudWxsO1xuXHRcdFx0dGhpcy50aWxlc1t1cmxdLnBvbHlnb25zID0gdGhpcy53ZWJHbFZpZXcuY3JlYXRlR2VvbWV0cnkocG9seWdvbk9wdGlvbnMpO1xuXHRcdFx0YWRkZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGZlYXR1cmVzLmxpbmVzLmxlbmd0aCA+IDApIHtcblx0XHRcdHZhciBsaW5lT3B0aW9ucyA9IHt9O1xuXHRcdFx0bGluZU9wdGlvbnMuZmVhdHVyZXMgPSBmZWF0dXJlcy5saW5lcztcblx0XHRcdGxpbmVPcHRpb25zLnN0cm9rZUNvbG9yID0gdGhpcy51c2VSYW5kb21Db2xvcnMgPyBnZXRSYW5kb21Db2xvcigpIDogbnVsbDtcblx0XHRcdHRoaXMudGlsZXNbdXJsXS5saW5lcyA9IHRoaXMud2ViR2xWaWV3LmNyZWF0ZUxpbmUobGluZU9wdGlvbnMpO1xuXHRcdFx0YWRkZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHZhciBwb2ludHMgPSBbXTtcblx0XHRmb3IodmFyIGk9MDsgaTxmZWF0dXJlcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwb2ludCA9IGZlYXR1cmVzLnBvaW50c1tpXTtcblx0XHRcdHZhciBtYXJrZXJPcHRpb25zID0ge1xuXHRcdFx0XHRwb3NpdGlvbjoge3g6cG9pbnQueCwgeTpwb2ludC55LCB6OjEwMH0sXG5cdFx0XHRcdGNvbG9yOiB7cjoxLCBnOjEsIGI6MX0sXG5cdFx0XHRcdGltYWdlOiB0aGlzLmljb25JbWFnZSxcblx0XHRcdFx0aW1hZ2VOYW1lOiB0aGlzLmljb25JbWFnZS51cmxcblx0XHRcdH07XG5cdFx0XHRwb2ludHMucHVzaCh0aGlzLndlYkdsVmlldy5hZGRQb2ludChtYXJrZXJPcHRpb25zKSk7XG5cdFx0fVxuXHRcdHRoaXMudGlsZXNbdXJsXS5wb2ludHMgPSBwb2ludHM7XG5cblx0XHRpZihhZGRlZClcblx0XHRcdHRoaXMud2ViR2xWaWV3LmRyYXcoKTtcblx0fTtcblxuXHR3aW5kb3cuVmVjdG9yVGlsZVZpZXcgPSBWZWN0b3JUaWxlVmlldztcbn0oKSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
