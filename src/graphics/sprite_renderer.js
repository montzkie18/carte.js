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
