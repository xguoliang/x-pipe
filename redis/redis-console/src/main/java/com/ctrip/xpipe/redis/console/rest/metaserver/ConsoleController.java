package com.ctrip.xpipe.redis.console.rest.metaserver;

import com.ctrip.xpipe.api.codec.Codec;
import com.ctrip.xpipe.codec.JsonCodec;
import com.ctrip.xpipe.redis.console.model.ClusterTbl;
import com.ctrip.xpipe.redis.console.model.DcTbl;
import com.ctrip.xpipe.redis.console.model.ShardTbl;
import com.ctrip.xpipe.redis.console.service.ClusterService;
import com.ctrip.xpipe.redis.console.service.DcService;
import com.ctrip.xpipe.redis.console.service.ShardService;
import com.ctrip.xpipe.redis.console.service.meta.ClusterMetaService;
import com.ctrip.xpipe.redis.console.service.meta.DcMetaService;
import com.ctrip.xpipe.redis.console.service.meta.RedisMetaService;
import com.ctrip.xpipe.redis.console.service.meta.ShardMetaService;
import com.ctrip.xpipe.redis.core.entity.ClusterMeta;
import com.ctrip.xpipe.redis.core.entity.DcMeta;
import com.ctrip.xpipe.redis.core.entity.KeeperMeta;
import com.ctrip.xpipe.redis.core.entity.ShardMeta;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedList;
import java.util.List;

/**
 * @author zhangle
 *
 */
@RestController
@RequestMapping("/api")
public class ConsoleController {
	private static Codec coder = new JsonCodec();
	private Logger logger = LoggerFactory.getLogger(getClass());
	
	@Autowired
	private DcService dcService;
	@Autowired
	private ClusterService clusterService;
	@Autowired
	private ShardService shardService;
	@Autowired
	private DcMetaService dcMetaService;
	@Autowired
	private ClusterMetaService clusterMetaService;
	@Autowired 
	private ShardMetaService shardMetaService;
	@Autowired
	private RedisMetaService redisMetaService;

	@RequestMapping(value = "/dc/{dcId}", method = RequestMethod.GET, produces={MediaType.APPLICATION_JSON_UTF8_VALUE})
	public String getDcMeta(@PathVariable String dcId, @RequestParam(value="format", required = false) String format) {
		DcMeta result = dcMetaService.getDcMeta(dcId);
		return (format != null && format.equals("xml"))? result.toString() : coder.encode(result);
	}
	
	@RequestMapping(value = "/dc/{dcId}/cluster/{clusterId}", method = RequestMethod.GET, produces={MediaType.APPLICATION_JSON_UTF8_VALUE})
	public String getDcClusterMeta(@PathVariable String dcId,@PathVariable String clusterId, @RequestParam(value="format", required = false) String format) {
		ClusterMeta result = clusterMetaService.getClusterMeta(dcId, clusterId);
		return (format != null && format.equals("xml"))? result.toString() : coder.encode(result);
	}
	
	@RequestMapping(value = "/dc/{dcId}/cluster/{clusterId}/shard/{shardId}", method = RequestMethod.GET, produces={MediaType.APPLICATION_JSON_UTF8_VALUE})
	public String getDcClusterShardMeta(@PathVariable String dcId,@PathVariable String clusterId,
			@PathVariable String shardId, @RequestParam(value="format", required = false) String format) {
		ShardMeta result = shardMetaService.getShardMeta(dcId, clusterId, shardId);
		return (format != null && format.equals("xml"))? result.toString() : coder.encode(result);
	}
	
	@RequestMapping(value = "/dcids", method = RequestMethod.GET)
	public List<String> getAllDcs(){
		List<String> result = new LinkedList<String>();
		
		if(null != dcService.findAllDcNames()) {
			for(DcTbl dc : dcService.findAllDcNames()) {
				result.add(dc.getDcName());
			}
		}

		return result;
	}
	
	@RequestMapping(value = "/clusterids", method = RequestMethod.GET)
	public List<String> getAllClusters() {
		List<String> result = new LinkedList<String>();
		
		if(null != clusterService.findAllClusterNames()) {
			for(ClusterTbl cluster : clusterService.findAllClusterNames()) {
				result.add(cluster.getClusterName());
			}
		}
		
		return result;
	}
	
	@RequestMapping(value = "/cluster/{clusterId}/shardids", method = RequestMethod.GET)
	public List<String> getAllShards(@PathVariable String clusterId) {
		List<String> result = new LinkedList<String>();
		
		if(null != shardService.findAllShardNamesByClusterName(clusterId)) {
			for(ShardTbl shard : shardService.findAllShardNamesByClusterName(clusterId)) {
				result.add(shard.getShardName());
			}
		}
		
		return result;
	}

	@RequestMapping(value = "/dc/{dcId}/cluster/{clusterId}/shard/{shardId}/keepers/adjustment", method = RequestMethod.PUT)
	public void updateKeeperStatus(@PathVariable String dcId, @PathVariable String clusterId,
								   @PathVariable String shardId, @RequestBody(required = false) KeeperMeta newActiveKeeper){
		if(null != newActiveKeeper) {
			redisMetaService.updateKeeperStatus(dcId, clusterId, shardId, newActiveKeeper);
		} else {
			logger.error("[updateKeeperStatus][Null Active Keeper]dc:{} cluster:{} shard:{}",dcId,clusterId,shardId);
		}
	}

}
