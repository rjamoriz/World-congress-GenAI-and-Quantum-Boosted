# Grafana Monitoring Setup Guide

## Overview

This project includes comprehensive monitoring and observability using:
- **Grafana** - Visualization and dashboards
- **Prometheus** - Metrics collection and storage
- **MongoDB Exporter** - MongoDB metrics
- **Redis Exporter** - Redis cache metrics
- **Arize Phoenix** - AI/LLM observability and tracing

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Or start only monitoring services
docker-compose up -d prometheus grafana mongodb-exporter redis-exporter
```

### 2. Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3002 | admin / admin123 |
| **Prometheus** | http://localhost:9090 | - |
| **Phoenix** | http://localhost:6006 | - |
| **Mongo Express** | http://localhost:8081 | admin / admin123 |
| **RedisInsight** | http://localhost:8001 | - |

### 3. View Pre-configured Dashboards

Grafana comes with 3 pre-configured dashboards:

1. **System Overview** - High-level view of all services
2. **MongoDB Monitoring** - Detailed MongoDB metrics
3. **Redis Monitoring** - Detailed Redis cache metrics

## Architecture

```
┌─────────────────┐
│   Application   │
│  (Backend/API)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼───┐
│MongoDB│ │Redis │
└───┬───┘ └──┬───┘
    │        │
┌───▼────────▼───┐
│   Exporters    │
│ (9216 / 9121)  │
└────────┬────────┘
         │
    ┌────▼────┐
    │Prometheus│
    │  :9090   │
    └────┬─────┘
         │
    ┌────▼────┐
    │ Grafana │
    │  :3002  │
    └─────────┘
```

## Available Metrics

### MongoDB Metrics
- **Connection stats** - Current, available connections
- **Operation counters** - Insert, query, update, delete, command rates
- **Memory usage** - Resident and virtual memory
- **Network traffic** - Bytes in/out
- **Database status** - Up/down state
- **Replication lag** (if applicable)

### Redis Metrics
- **Connected clients** - Active client connections
- **Commands processed** - Commands/second rate
- **Memory usage** - Used vs max memory
- **Cache hit rate** - Hit/miss ratio
- **Key statistics** - Total keys, eviction, expiration
- **Network I/O** - Input/output bytes
- **Database keys** - Keys per database

### System Metrics
- **Service health** - Up/down status for all services
- **Resource usage** - Memory, CPU, network
- **Performance trends** - Historical data over time

## Configuration

### Prometheus Configuration

Edit `monitoring/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Datasources

Auto-provisioned from `monitoring/grafana/provisioning/datasources/prometheus.yml`:
- Prometheus datasource configured automatically
- No manual setup required

### Custom Dashboards

Add custom dashboards to:
```
monitoring/grafana/dashboards/
```

Grafana will automatically load JSON dashboard files from this directory.

## Monitoring Best Practices

### 1. Set Up Alerts

Create alerts for critical metrics:
- MongoDB connection failures
- Redis memory exhaustion
- High cache miss rates
- Slow query performance

### 2. Monitor Trends

Watch for:
- Memory growth over time
- Connection pool saturation
- Cache hit rate degradation
- Increasing query latency

### 3. Capacity Planning

Use metrics to plan:
- Database scaling needs
- Cache size requirements
- Connection pool sizing
- Storage requirements

## Adding Application Metrics

### Node.js Backend Integration

To expose custom application metrics, install prom-client:

```bash
cd backend
npm install prom-client
```

Create metrics endpoint in `backend/src/routes/metrics.ts`:

```typescript
import { Router } from 'express';
import client from 'prom-client';

const router = Router();

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
```

Update Prometheus config to scrape backend:

```yaml
scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['host.docker.internal:3001']
```

## Troubleshooting

### Grafana Can't Connect to Prometheus

1. Check Prometheus is running:
   ```bash
   docker ps | grep prometheus
   ```

2. Verify Prometheus targets:
   ```
   http://localhost:9090/targets
   ```

3. Check Grafana datasource settings:
   - URL should be: `http://prometheus:9090`
   - Access mode: `proxy`

### No Metrics Showing

1. Verify exporters are running:
   ```bash
   docker-compose ps
   ```

2. Check exporter logs:
   ```bash
   docker-compose logs mongodb-exporter
   docker-compose logs redis-exporter
   ```

3. Test exporter endpoints:
   ```bash
   curl http://localhost:9216/metrics  # MongoDB
   curl http://localhost:9121/metrics  # Redis
   ```

### Dashboard Not Loading

1. Check dashboard JSON syntax
2. Verify datasource name matches
3. Check Grafana logs:
   ```bash
   docker-compose logs grafana
   ```

## Integration with Other Tools

### Phoenix Integration

Phoenix (AI observability) runs alongside Grafana:
- **Phoenix**: AI/LLM tracing and evaluation
- **Grafana**: Infrastructure and database metrics

Both provide complementary monitoring:
- Phoenix: Application-level AI operations
- Grafana: System-level infrastructure metrics

### External Monitoring

Export metrics to external services:
- **Datadog**: Use Prometheus integration
- **New Relic**: Prometheus remote write
- **Grafana Cloud**: Connect local instance

## Backup and Recovery

### Export Dashboards

```bash
# Export all dashboards
curl -u admin:admin123 http://localhost:3002/api/search?query=& | \
  jq -r '.[] | .uid' | \
  xargs -I {} curl -u admin:admin123 http://localhost:3002/api/dashboards/uid/{} > backup.json
```

### Backup Prometheus Data

```bash
docker-compose stop prometheus
docker cp agenda-manager-prometheus:/prometheus ./prometheus-backup
docker-compose start prometheus
```

## Advanced Features

### Custom Variables

Add dashboard variables for:
- Environment selection
- Time range presets
- Service filtering

### Annotations

Mark events on dashboards:
- Deployments
- Incidents
- Configuration changes

### Alerting

Configure alert notifications:
- Email
- Slack
- PagerDuty
- Webhooks

## Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [MongoDB Exporter](https://github.com/percona/mongodb_exporter)
- [Redis Exporter](https://github.com/oliver006/redis_exporter)
- [Arize Phoenix](https://docs.arize.com/phoenix)

## Next Steps

1. ✅ Start monitoring stack
2. ✅ Access Grafana at http://localhost:3002
3. ✅ View pre-configured dashboards
4. 📊 Create custom dashboards for your use case
5. 🚨 Set up alerts for critical metrics
6. 📈 Analyze trends and optimize performance
