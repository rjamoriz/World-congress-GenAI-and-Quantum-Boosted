#!/bin/bash

# Script to generate quantum optimization metrics for Grafana

echo "🚀 Generating quantum optimization metrics..."

# Run QAOA optimization
echo "Running QAOA (IBM Qiskit) optimization..."
curl -X POST http://localhost:3001/api/schedule/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "quantum",
    "quantumConfig": {"backend": "qiskit"},
    "constraints": {
      "eventStartDate": "2025-11-14",
      "eventEndDate": "2025-11-15",
      "workingHoursStart": "09:00",
      "workingHoursEnd": "18:00",
      "meetingDurationMinutes": 30,
      "maxMeetingsPerDay": 8,
      "bufferMinutes": 15
    }
  }' -s | jq '.data.computationTimeMs, .data.metrics.scheduledCount'

echo ""
echo "✅ QAOA optimization complete"
echo ""
sleep 2

# Run D-Wave optimization
echo "Running D-Wave Quantum Annealing optimization..."
curl -X POST http://localhost:3001/api/schedule/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "quantum",
    "quantumConfig": {"backend": "dwave"},
    "constraints": {
      "eventStartDate": "2025-11-14",
      "eventEndDate": "2025-11-15",
      "workingHoursStart": "09:00",
      "workingHoursEnd": "18:00",
      "meetingDurationMinutes": 30,
      "maxMeetingsPerDay": 8,
      "bufferMinutes": 15
    }
  }' -s | jq '.data.computationTimeMs, .data.metrics.scheduledCount'

echo ""
echo "✅ D-Wave optimization complete"
echo ""
sleep 2

# Run Classical for comparison
echo "Running Classical optimization (for comparison)..."
curl -X POST http://localhost:3001/api/schedule/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "classical",
    "constraints": {
      "eventStartDate": "2025-11-14",
      "eventEndDate": "2025-11-15",
      "workingHoursStart": "09:00",
      "workingHoursEnd": "18:00",
      "meetingDurationMinutes": 30,
      "maxMeetingsPerDay": 8,
      "bufferMinutes": 15
    }
  }' -s | jq '.data.computationTimeMs, .data.metrics.scheduledCount'

echo ""
echo "✅ Classical optimization complete"
echo ""

echo "🎉 All optimizations complete!"
echo "📊 Check Grafana at http://localhost:3002 to see the metrics"
echo ""
echo "Dashboards to view:"
echo "  - 🚀 Unified System Overview"
echo "  - ⚡ Application Performance"
echo "  - 🎯 Business KPIs & Analytics"
