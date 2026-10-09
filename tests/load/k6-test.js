import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Ramp up to 20 virtual users
    { duration: '30s', target: 100 }, // Stress test at 100 VUs
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'], // 95% of requests must complete within 250ms
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'Health status is 200': (r) => r.status === 200 });

  // 2. Fetch routes
  const routesRes = http.get(`${BASE_URL}/api/routes`);
  check(routesRes, { 'Routes returned 200': (r) => r.status === 200 });

  // 3. Dijkstra Route calculation
  const calcPayload = JSON.stringify({
    source: 'Central Station',
    destination: 'Airport',
  });
  const calcRes = http.post(`${BASE_URL}/api/routes/calculate`, calcPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(calcRes, {
    'Dijkstra Calc succeeded': (r) => r.status === 200 && r.body.includes('estimated_minutes'),
  });

  // 4. RAG Assistant Query
  const ragPayload = JSON.stringify({
    query: 'What is the luggage policy on the Airport Express?',
  });
  const ragRes = http.post(`${BASE_URL}/api/rag/ask`, ragPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(ragRes, {
    'RAG query succeeded': (r) => r.status === 200 && r.body.includes('confidence_score'),
  });

  sleep(1);
}
