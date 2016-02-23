(function(){
	var TileRequest = function(request, timeout) {
		this.request = request;
		this.timeout = timeout;
	};

	TileRequest.prototype.cancel = function() {
		this.timeout.resolve("Request cancelled");
	};

	var TileProvider = function(dataSource, $http, $q) {
		this.dataSource = dataSource;
		this.$http = $http;
		this.$q = $q;
		this.tiles = {};
		this.promises = {};
	};

	TileProvider.prototype.getTileUrl = function(x, y, z) {
		return this.dataSource.url+"/"+z+"/"+x+"/"+y+"."+this.dataSource.fileExtension;
	};

	TileProvider.prototype.getTile = function(x, y, z) {
		var deferred = this.$q.defer();
		var url = this.getTileUrl(x, y, z);
		if(this.tiles[url]){
			deferred.resolve({url:url, data:this.tiles[url]});
		}else if(this.promises[url]){
			deferred.reject("Already being loaded.");
		}else{
			var self = this;
			var canceller = this.$q.defer();
			var request = this.$http.get(url, {responseType: this.dataSource.responseType, timeout: canceller.promise})
				.then(function(response){
					delete self.promises[url];
					self.tiles[url] = self.dataSource.parse(response.data);
					deferred.resolve({url:url, data:self.tiles[url]});
				}, function(reason){
					delete self.promises[url];
					deferred.reject(reason);
				});
			this.promises[url] = new TileRequest(request, canceller);
		}
		return deferred.promise;
	};

	TileProvider.prototype.deleteTile = function(x, y, z) {
		var url = this.getTileUrl(x, y, z);
		if(this.promises[url]) {
			this.promises[url].cancel();
			delete this.promises[url];
		}
		if(this.tiles[url]) delete this.tiles[url];
	};

	window.TileProvider = TileProvider;
}());