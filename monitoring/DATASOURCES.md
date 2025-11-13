# Grafana Additional Data Sources Configuration

## 1. GitHub Data Source (via Infinity Plugin)

Already configured for commit tracking. Can be extended to:
- Pull requests
- Issues
- Deployments
- Release notes

## 2. Loki for Log Aggregation

Add to docker-compose.yml to collect and query logs from all services:
```yaml
loki:
  image: grafana/loki:latest
  ports:
    - "3100:3100"
  volumes:
    - ./monitoring/loki:/etc/loki
    - loki_data:/loki
  command: -config.file=/etc/loki/loki-config.yml

promtail:
  image: grafana/promtail:latest
  volumes:
    - /var/log:/var/log
    - ./backend/logs:/logs/backend
    - ./monitoring/promtail:/etc/promtail
  command: -config.file=/etc/promtail/promtail-config.yml
```

Benefits:
- Centralized log viewing
- Correlation between metrics and logs
- Full-text log search
- Error pattern detection

## 3. PostgreSQL/MongoDB Direct Connection

Query database directly for business intelligence:
- Custom analytics queries
- Historical data trends
- User behavior analysis
- Data quality monitoring

Configuration:
```yaml
datasources:
  - name: MongoDB
    type: grafana-mongodb-datasource
    url: mongodb://mongodb:27017
    database: agenda-manager
```

## 4. JSON API Data Source (via Infinity)

Already have GitHub. Can add:
- OpenAI API usage stats
- D-Wave API usage/credits
- External weather API (for event planning)
- Calendar API integration
- Slack notifications stats

## 5. CloudWatch/Azure Monitor (if deploying to cloud)

Monitor cloud infrastructure:
- Lambda/Azure Functions metrics
- CloudFront/CDN performance
- S3/Blob storage stats
- Cost tracking

## 6. Elasticsearch (for advanced search)

If you store meeting data in Elasticsearch:
- Full-text search dashboards
- Aggregation visualizations
- Real-time analytics
- Geographic data (attendee locations)

## 7. Jaeger/Tempo for Distributed Tracing

Trace requests through the entire system:
- Backend → MongoDB → Redis → D-Wave API
- Performance bottleneck identification
- Service dependency mapping

## 8. Alerting Integrations

Connect alerts to:
- **Slack**: Real-time alerts in channels
- **PagerDuty**: On-call incident management
- **Email**: Alert notifications
- **Webhook**: Custom integrations
- **Microsoft Teams**: Team notifications

Example alert rules:
- API response time > 2s
- Error rate > 5%
- Quantum optimization failure
- MongoDB connection lost
- Cache hit rate < 50%

## 9. TestData DB (for demos)

Built-in data source for impressive live demos without real data:
```yaml
datasources:
  - name: TestData
    type: testdata
```

## 10. External Metrics Services

- **DataDog**: If you want premium APM
- **New Relic**: Full-stack observability
- **Sentry**: Error tracking and performance
- **Google Analytics**: Website metrics (for frontend)
