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