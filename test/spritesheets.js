(function(){

	var image;

	module('carte.DynamicSpriteSheet', {
		setup: function() {
			image = new Image();
			image.width = image.height = 256;
		}
	});

	test('should create canvas', 3, function(){
		var spriteSheet = new DynamicSpriteSheet(1, 1);
		notEqual(spriteSheet.canvas, null);
		equal(spriteSheet.canvas.width, 1);
		equal(spriteSheet.canvas.height, 1);
	});

	test('should create node when adding image', 6, function(){
		var spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var node = spriteSheet.add("image", image);
		notEqual(node, null);
		notEqual(node.rect, null);
		equal(node.rect.x, 0);
		equal(node.rect.y, 0);
		equal(node.rect.width, 256);
		equal(node.rect.width, 256);
	});

	test('should return null when adding image of same name', 1, function(){
		var spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var node1 = spriteSheet.add("image", image);
		var node2 = spriteSheet.add("image", image);
		equal(node2, null);
	});

	test('should create 2nd image to the right of 1st', 6, function(){
		var spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var node1 = spriteSheet.add("image1", image);
		var node2 = spriteSheet.add("image2", image);
		notEqual(node2, null);
		notEqual(node2.rect, null);
		// should be on the right of first image
		equal(node2.rect.x, 256);
		equal(node2.rect.y, 0);
		equal(node2.rect.width, 256);
		equal(node2.rect.width, 256);
	});

	test('should fit square images', 3, function(){
		var spriteSheet = new DynamicSpriteSheet(256, 256);
		var count = 0;
		while(spriteSheet.add("image"+count, image))
			count++;
		equal(count, 1); 

		spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var count = 0;
		while(spriteSheet.add("image"+count, image))
			count++;
		equal(count, 16);

		spriteSheet = new DynamicSpriteSheet(4096, 4096);
		var count = 0;
		while(spriteSheet.add("image"+count, image))
			count++;
		equal(count, 256);
	});

	test('should get node via image name', 2, function(){
		var spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var addedNode1 = spriteSheet.add("image1", image);
		var addedNode2 = spriteSheet.add("image2", image);

		var node1 = spriteSheet.get('image1');
		var node2 = spriteSheet.get('image2');

		deepEqual(addedNode1, node1);
		deepEqual(addedNode2, node2);
	});

	test('should get null for non-existing images', 1, function(){
		var spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var node1 = spriteSheet.get('image1');
		equal(node1, null);
	});

	test('should delete existing image', 4, function(){
		var spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var addedNode = spriteSheet.add("image1", image);
		var removedNode = spriteSheet.remove('image1');

		deepEqual(addedNode, removedNode);
		strictEqual(addedNode.name, "");
		equal(addedNode.image, null);
		
		var node = spriteSheet.get("image1");
		equal(node, null);
	});

	test('should return null when deleting non-existing image', 1, function(){
		var spriteSheet = new DynamicSpriteSheet(1024, 1024);
		var removedNode = spriteSheet.remove('image1');
		equal(removedNode, null);
	});

	test('should fill slot for deleted images', 2, function(){
		var spriteSheet = new DynamicSpriteSheet(2048, 2048);
		var node1 = spriteSheet.add('image1', image);
		spriteSheet.remove('image1');
		var node2 = spriteSheet.add('image2', image);
		deepEqual(node1, node2);

		for(var i=0; i<24; i++) {
			if(i == 10)
				node1 = spriteSheet.add('image' + i, image);
			else
				spriteSheet.add('image' + i, image);
		}
		spriteSheet.remove('image10');
		node2 = spriteSheet.add('image100', image);
		deepEqual(node1, node2);
	});

}());