# ELK + Beats for Sonet

This directory contains configuration for:
- Elasticsearch (single-node, security disabled for local dev)
- Kibana
- Logstash (pipeline for Beats input and basic parsing)
- Filebeat (container autodiscover for Docker logs, ships to Logstash)
- Metricbeat (system and Docker metrics, ships to Elasticsearch)

How to use:
1. From `sonet/`, run:
   ```bash
   docker-compose up -d elasticsearch kibana logstash filebeat metricbeat
   ```
2. Access Kibana at http://localhost:5601 and add index patterns:
   - `sonet-logs-*` for logs
   - `metricbeat-*` for metrics
3. Start the rest of the stack (gateway and services). Filebeat will autodiscover containers and ship logs.

Notes:
- Filebeat uses Docker autodiscover and adds Docker metadata to events.
- Logstash tries JSON parsing first, then a grok fallback for common spdlog patterns.
- Metricbeat collects system and Docker metrics. Adjust `metricbeat.yml` for more modules.