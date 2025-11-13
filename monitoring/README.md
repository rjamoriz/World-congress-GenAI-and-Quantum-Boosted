# Monitoring Configuration

This directory contains monitoring and observability configurations for the Agenda Manager application.

## Structure

```
monitoring/
├── prometheus/
│   └── prometheus.yml          # Prometheus scrape configuration
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/        # Auto-configured datasources
│   │   │   └── prometheus.yml
│   │   └── dashboards/         # Dashboard provisioning
│   │       └── dashboards.yml
│   └── dashboards/             # Pre-built dashboards
│       ├── mongodb-dashboard.json
│       ├── redis-dashboard.json
│       └── system-overview.json
└── README.md
```

## Quick Start

1. **Start monitoring stack**:
   ```bash
   docker-compose up -d prometheus grafana mongodb-exporter redis-exporter
   ```

2. **Access Grafana**:
   - URL: http://localhost:3002
   - Username: `admin`
   - Password: `admin123`

3. **View dashboards**:
   - System Overview (general health)
   - MongoDB Monitoring (database metrics)
   - Redis Monitoring (cache metrics)

## Components

### Prometheus (Port 9090)
- Metrics collection and storage
- Scrapes MongoDB and Redis exporters every 15s
- Retention: 15 days (default)

### Grafana (Port 3002)
- Visualization and dashboards
- Auto-provisioned with Prometheus datasource
- Pre-loaded with 3 dashboards

### MongoDB Exporter (Port 9216)
- Exposes MongoDB metrics to Prometheus
- Monitors connections, operations, memory, network

### Redis Exporter (Port 9121)
- Exposes Redis metrics to Prometheus
- Monitors commands, memory, cache hits, keys

## Adding Custom Dashboards

1. Create dashboard JSON in `grafana/dashboards/`
2. Restart Grafana: `docker-compose restart grafana`
3. Dashboard will be auto-loaded

## Modifying Prometheus Config

1. Edit `prometheus/prometheus.yml`
2. Restart Prometheus: `docker-compose restart prometheus`
3. Verify targets at http://localhost:9090/targets

## See Also

- [Full Monitoring Guide](../docs/GRAFANA_MONITORING.md)
- [Docker Compose](../docker-compose.yml)
