index_module.controller('ClusterDcShardUpdateCtl',
                        ['$rootScope', '$scope', '$stateParams', '$window', '$location', 'toastr', 'AppUtil',
                         'ClusterService', 'ShardService', 'RedisService', 'KeeperContainerService',
                         function ($rootScope, $scope, $stateParams, $window, $location, toastr, AppUtil,
                                   ClusterService, ShardService, RedisService, KeeperContainerService) {

                             $scope.dcs, $scope.dcActiveTab,
                                 $scope.hasMasterRedis = false, 
                                 $scope.createKeeperErrorMsg = '';
                             $scope.dcShards = {};
                             $scope.clusterName = $stateParams.clusterName;
                             $scope.shardName = $stateParams.shardName;

                             $scope.switchDc = switchDc;
                             $scope.loadCluster = loadCluster;
                             $scope.loadShard = loadShard;

                             $scope.preCreateRedis = preCreateRedis;
                             $scope.createRedis = createRedis;

                             $scope.preCreateKeeper = preCreateKeeper;
                             $scope.createKeeper = createKeeper;
                             $scope.addCreateBackupKeeperForm = addCreateBackupKeeperForm;
                             $scope.removeCreateBackupKeeperForm = removeCreateBackupKeeperForm;

                             $scope.preDeleteRedis = preDeleteRedis;
                             $scope.deleteRedis = deleteRedis;

                             $scope.submitUpdates = submitUpdates;

                             if ($scope.clusterName) {
                                 loadCluster();
                             }

                             function findKeeperContainers(dcName) {
                                 KeeperContainerService.findKeeperContainersByDc(dcName)
                                     .then(function (result) {
                                         $scope.keeperContainers = result;
                                     })

                             }

                             function switchDc(dc) {
                                 $scope.currentDcName = dc.dcName;
                                 findKeeperContainers($scope.currentDcName);

                                 var shard = $scope.dcShards[$scope.currentDcName];

                                 if (!shard){
                                     loadShard($scope.clusterName, dc.dcName, $scope.shardName);
                                 }

                             }

                             function loadCluster() {
                                 ClusterService.findClusterDCs($scope.clusterName)
                                     .then(function (result) {
                                         if (!result || result.length == 0) {
                                             $scope.dcs = [];
                                             return;
                                         }
                                         $scope.dcs = result;
                                         $scope.currentDcName = $scope.dcs[0].dcName;
                                         findKeeperContainers($scope.currentDcName);
                                         loadShard($scope.clusterName, $scope.dcs[0].dcName, $scope.shardName);

                                     }, function (result) {
                                         toastr.error(AppUtil.errorMsg(result));
                                     });

                             }

                             function loadShard(clusterName, dcName, shardName) {
                                 ShardService.findClusterDcShard(clusterName, dcName, shardName)
                                     .then(function (result) {
                                         $scope.dcShards[dcName] = result;

                                         refreshShardStatus();

                                     }, function (result) {
                                         toastr.error(AppUtil.errorMsg(result));
                                     });
                             }

                             function preCreateRedis() {
                                 $scope.toCreateRedis = {};

                                 $('#createRedisModal').modal('show');
                             }

                             function createRedis() {
                                 $scope.toCreateRedis.id = 0;
                                 if($scope.hasRedisMaster == true) $scope.toCreateRedis.redisMaster = -1;
                                 var shard = $scope.dcShards[$scope.currentDcName];
                                 shard.redises.push($scope.toCreateRedis);
                                 $scope.toCreateRedis = {};
                                 $('#createRedisModal').modal('hide');

                                 refreshShardStatus();
                             }

                             function addCreateBackupKeeperForm() {
                                 $scope.toCreateOtherKeepers.push({});
                             }

                             function removeCreateBackupKeeperForm(index) {
                                 $scope.toCreateOtherKeepers.splice(index, 1);
                             }

                             function preCreateKeeper() {
                                 $scope.toCreateFirstKeeper = {};

                                 // init backup container
                                 $scope.toCreateOtherKeepers = [];
                                 $scope.toCreateOtherKeepers.push({});

                                 $('#createKeeperModal').modal('show');
                             }

                             function createKeeper() {
                                 $scope.createKeeperErrorMsg = '';
                                 var shard = $scope.dcShards[$scope.currentDcName];

                                     if (!validKeeper($scope.toCreateFirstKeeper)){
                                         $scope.createKeeperErrorMsg = "valid form content please check";
                                         return;
                                     }else {
                                    	 var keeperContainerId = $scope.toCreateFirstKeeper.keepercontainerId;
                                    	 for(var i = 0 ; i != $scope.keeperContainers.length; ++i) {
                                    		 if($scope.keeperContainers[i].keepercontainerId === parseInt(keeperContainerId)) {
                                    			 $scope.toCreateFirstKeeper.redisIp = $scope.keeperContainers[i].keepercontainerIp;
                                    			 break;
                                    		 }
                                    	 }
                                    	 $scope.toCreateFirstKeeper.id = 0;
                                         shard.keepers.push($scope.toCreateFirstKeeper);
                                     }

                                 $scope.toCreateOtherKeepers.forEach(function (otherKeeper) {
                                     if (!validKeeper(otherKeeper)){
                                         $scope.createKeeperErrorMsg = "valid form content please check";
                                         return;
                                     }else {
                                    	 var keeperContainerId = otherKeeper.keepercontainerId;
                                    	 for(var i = 0 ; i != $scope.keeperContainers.length; ++i) {
                                    		 if($scope.keeperContainers[i].keepercontainerId === parseInt(keeperContainerId)) {
                                    			 otherKeeper.redisIp = $scope.keeperContainers[i].keepercontainerIp;
                                    			 break;
                                    		 }
                                    	 }
                                    	 otherKeeper.id = 0;
                                         shard.keepers.push(otherKeeper);
                                     }
                                 });

                                 if (!$scope.createKeeperErrorMsg){
                                     $('#createKeeperModal').modal('hide');
                                     refreshShardStatus();
                                 }

                             }

                             function validKeeper(keeper) {
                                 return keeper && keeper.redisPort;
                             }

                             function preDeleteRedis(redis) {
                                 $scope.toDeleteRedis = {};
                                 $scope.toDeleteRedis = redis;
                                 $('#deleteRedisConfirm').modal('show');
                             }

                             function deleteRedis() {
                                 var shard = $scope.dcShards[$scope.currentDcName];
                                 var index = -1;
                                 for (var cnt_redis = 0; cnt_redis != shard.redises.length; ++cnt_redis) {
                                     if ($scope.toDeleteRedis == shard.redises[cnt_redis]) {
                                         index = cnt_redis;
                                         break;
                                     }
                                 }
                                 if (index != -1) {
                                     shard.redises.splice(index, 1);
                                     $scope.toDeleteRedis = {};
                                     refreshShardStatus();
                                     return;
                                 }

                                 for (var cnt_keeper = 0; cnt_keeper != shard.keepers.length; ++cnt_keeper) {
                                     if ($scope.toDeleteRedis == shard.keepers[cnt_keeper]) {
                                         index = cnt_keeper;
                                         break;
                                     }
                                 }
                                 if (index != -1) {
                                     shard.keepers.splice(index, 1);
                                     $scope.toDeleteRedis = {};
                                     refreshShardStatus();
                                     return;
                                 }

                             }

                             function submitUpdates() {

                                 var shard = $scope.dcShards[$scope.currentDcName];

                                 RedisService.updateShardRedis($scope.clusterName, $scope.currentDcName, shard.id, shard)
                                     .then(function (result) {
                                         toastr.success("operation success");
                                         $window.location.href =
                                             "/#/cluster_dc_shards?clusterName=" + $scope.clusterName;
                                     }, function (result) {
                                         toastr.error(AppUtil.errorMsg(result), "operation fail");
                                     });

                             }

                             function refreshShardStatus() {
                                 $scope.hasRedisMaster = false;

                                 var shard = $scope.dcShards[$scope.currentDcName];

                                 if (shard.redises && shard.redises.length) {
                                     shard.redises.forEach(function (redis) {
                                         if (redis.redisMaster == 0) {
                                             $scope.hasRedisMaster = true;
                                         }
                                     })
                                 }
                                 
                                 if(shard.upstream === "0.0.0.0:0000") {
                                	 $scope.hasRedisMaster = true;
                                 }

                             }

                         }]);
