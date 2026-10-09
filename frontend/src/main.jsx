import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './style.css'

function App() {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || 'http://localhost:8000/api')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [email, setEmail] = useState('user@mobility.com')
  const [password, setPassword] = useState('user123')
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [traffic, setTraffic] = useState([])
  const [source, setSource] = useState('Central Station')
  const [destination, setDestination] = useState('Airport')
  const [result, setResult] = useState(null)
  const [ingest, setIngest] = useState(null)
  const [error, setError] = useState('')

  // RAG State
  const [ragQuery, setRagQuery] = useState('What is the luggage policy on the Airport Express?')
  const [ragResult, setRagResult] = useState(null)
  const [ragLoading, setRagLoading] = useState(false)

  // Distributed Saga State
  const [sagaResult, setSagaResult] = useState(null)
  const [sagaLoading, setSagaLoading] = useState(false)

  const api = axios.create({ baseURL: apiUrl })
  api.interceptors.request.use(c => {
    if (token) c.headers.Authorization = `Bearer ${token}`
    return c
  })

  const load = async () => {
    try {
      const [r, v, t] = await Promise.all([
        api.get('/routes'),
        api.get('/vehicles'),
        api.get('/traffic')
      ])
      setRoutes(r.data)
      setVehicles(v.data)
      setTraffic(t.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.error || `Cannot connect to ${apiUrl}. Ensure backend is running.`)
    }
  }

  useEffect(() => {
    if (token) load()
  }, [token, apiUrl])

  const handleApiChange = (newUrl) => {
    setApiUrl(newUrl)
    localStorage.setItem('apiUrl', newUrl)
  }

  const login = async (e) => {
    e.preventDefault()
    try {
      const r = await axios.post(`${apiUrl}/auth/login`, { email, password })
      const receivedToken = r.data.token || r.data.access_token
      localStorage.setItem('token', receivedToken)
      setToken(receivedToken)
      setError('')
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.detail || 'Login failed. Verify credentials.')
    }
  }

  const calculate = async () => {
    try {
      const r = await api.post('/routes/calculate', { source, destination })
      setResult(r.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.error || 'Route calculation failed')
    }
  }

  const ingestData = async () => {
    try {
      const r = await api.post('/ingestion/mobility', {
        type: 'GPS',
        value: 'Vehicle TS09AB1234',
        latitude: 17.385,
        longitude: 78.4867,
        routeId: 1
      })
      setIngest(r.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.error || 'Ingestion failed')
    }
  }

  const askRag = async () => {
    if (!ragQuery.trim()) return
    setRagLoading(true)
    try {
      const r = await api.post('/rag/ask', { query: ragQuery })
      setRagResult(r.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.error || 'RAG query failed')
    } finally {
      setRagLoading(false)
    }
  }

  const runSaga = async (simulateFailure = false) => {
    setSagaLoading(true)
    try {
      const endpoint = simulateFailure ? '/trips/saga/simulate-failure' : '/trips/saga/book'
      const r = await api.post(endpoint, { trip_id: 1, seat_count: 2 })
      setSagaResult(r.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.error || 'Saga execution failed')
    } finally {
      setSagaLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="brand">🚍 Urban Mobility</div>
          <h1>Route Intelligence Platform</h1>
          <p>Polyglot Backend & Distributed DBMS Architecture</p>

          <label>Target Backend Engine</label>
          <select value={apiUrl} onChange={e => handleApiChange(e.target.value)}>
            <option value="http://localhost:8000/api">FastAPI API Gateway (Port 8000)</option>
            <option value="http://localhost:8080/api">Spring Boot Backend (Port 8080)</option>
          </select>

          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />

          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />

          <button style={{ marginTop: '15px' }}>Login</button>
          <small>Demo accounts: user@mobility.com / user123 (or admin@mobility.com / admin123)</small>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <div>
          <b>🚍 Urban Mobility Platform</b>
          <span>Polyglot Microservices & Route Intelligence</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={apiUrl}
            onChange={e => handleApiChange(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
          >
            <option value="http://localhost:8000/api">FastAPI Gateway (8000)</option>
            <option value="http://localhost:8080/api">Spring Boot (8080)</option>
          </select>
          <button className="logout" onClick={() => { localStorage.removeItem('token'); setToken('') }}>Logout</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">ENTERPRISE URBAN TRANSIT PLATFORM (CO1 - CO6)</p>
            <h1>Intelligent Cities Move Better.</h1>
            <p>
              Integrated across PostgreSQL (ACID & pgvector), MongoDB (IoT Telemetry), Redis Caching,
              FastAPI Gateway, Spring Boot Transit Engine, and Node.js Streams.
            </p>
          </div>
          <div className="hero-icon">🗺️</div>
        </section>

        {error && <div className="error">{error}</div>}

        <section className="stats">
          <div><b>{routes.length}</b><span>Active Routes</span></div>
          <div><b>{vehicles.length}</b><span>Fleet Vehicles</span></div>
          <div><b>{traffic.length}</b><span>Live Traffic Alerts</span></div>
          <div><b>pgvector + Saga</b><span>RAG & Microservices</span></div>
        </section>

        {/* 1. ROUTE INTELLIGENCE & TRAFFIC MONITOR */}
        <section className="grid">
          <div className="card route-card">
            <h2>🧭 Route Intelligence</h2>
            <p className="muted">Dijkstra Shortest Path with Dynamic Traffic Penalties (CO1, CO3)</p>
            <div className="row">
              <div>
                <label>From</label>
                <select value={source} onChange={e => setSource(e.target.value)}>
                  <option>Central Station</option>
                  <option>City Mall</option>
                  <option>Lake View</option>
                  <option>Tech Park</option>
                </select>
              </div>
              <div>
                <label>To</label>
                <select value={destination} onChange={e => setDestination(e.target.value)}>
                  <option>Airport</option>
                  <option>Tech Park</option>
                  <option>City Mall</option>
                  <option>Lake View</option>
                </select>
              </div>
            </div>
            <button onClick={calculate}>Calculate Optimized Route</button>
            {result && (
              <div className="result">
                <div className="route-result"><b>{result.source}</b> → <b>{result.destination}</b></div>
                <p>⏱ Estimated: <b>{result.estimated_minutes || result.estimatedMinutes} min</b> (Traffic Delay: +{result.traffic_delay_minutes || 0} min)</p>
                <p>🛣 Path: {(result.stops || []).join(' → ')}</p>
                <p>🌱 CO₂ Saved: <b>{result.co2_saved_grams || 510}g</b> | Fare: ₹{result.fare || 55}</p>
                <p style={{ fontSize: '12px', color: '#657086' }}>⚙️ {result.algorithm}</p>
              </div>
            )}
          </div>

          <div className="card">
            <h2>🚦 Live Traffic Monitor</h2>
            <p className="muted">Real-Time Corridors with Active Congestion Delays</p>
            {traffic.map(t => (
              <div className="list-item" key={t.id}>
                <div>
                  <b>{t.route?.name || `Route ${t.route_id}`}</b>
                  <span>{t.message} (+{t.delay_minutes || t.delayMinutes || 0} min)</span>
                </div>
                <strong className={(t.severity || 'LOW').toLowerCase()}>{t.severity}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* 2. AI TRANSIT ASSISTANT (RAG) & DISTRIBUTED SAGA */}
        <section className="grid">
          <div className="card">
            <h2>🤖 AI Transit Assistant (Vector RAG)</h2>
            <p className="muted">Semantic Search over Transit Policy & Live Database (CO2, CO3)</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                value={ragQuery}
                onChange={e => setRagQuery(e.target.value)}
                placeholder="Ask about luggage, fares, electric buses..."
              />
              <button onClick={askRag} disabled={ragLoading}>
                {ragLoading ? 'Searching...' : 'Ask AI'}
              </button>
            </div>
            {ragResult && (
              <div className="result" style={{ background: '#f8fafc', borderLeft: '4px solid #1769e0' }}>
                <p style={{ whiteSpace: 'pre-line', margin: '0 0 10px 0' }}>{ragResult.answer}</p>
                <small style={{ color: '#657086', display: 'block' }}>
                  🎯 Semantic Confidence: <b>{(ragResult.confidence_score * 100).toFixed(1)}%</b> | Retrieved from {ragResult.retrieved_sources?.length} Vector Chunks
                </small>
              </div>
            )}
          </div>

          <div className="card">
            <h2>⚡ Distributed Saga Transactions (CO5)</h2>
            <p className="muted">Multi-Service Coordination with Automated Rollback Compensation</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button onClick={() => runSaga(false)} disabled={sagaLoading}>
                Book Trip (Saga Success)
              </button>
              <button
                onClick={() => runSaga(true)}
                disabled={sagaLoading}
                style={{ background: '#d32f2f' }}
              >
                Simulate Failure (Compensate)
              </button>
            </div>
            {sagaResult && (
              <div className="result" style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <b>Status: <span style={{ color: sagaResult.status === 'SUCCESS' ? '#25855a' : '#c53030' }}>{sagaResult.status}</span></b>
                  <small>{sagaResult.saga_id}</small>
                </div>
                <p style={{ margin: '4px 0', fontSize: '13px' }}>{sagaResult.message}</p>
                <details style={{ marginTop: '8px', fontSize: '12px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Inspect Step History ({sagaResult.step_history?.length} steps)</summary>
                  <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
                    {sagaResult.step_history?.map((step, idx) => (
                      <li key={idx} style={{ fontFamily: 'monospace' }}>{step}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
        </section>

        {/* 3. FLEET & DATA INGESTION */}
        <section className="grid">
          <div className="card">
            <h2>🚌 Vehicles & Drivers</h2>
            {vehicles.map(v => (
              <div className="list-item" key={v.id}>
                <div>
                  <b>{v.vehicleNumber || v.vehicle_number}</b>
                  <span>{v.type} · {v.capacity} seats · Battery: {v.battery_or_fuel_pct || 100}%</span>
                </div>
                <span>{v.driver?.name || 'Assigned'}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>📡 IoT Telemetry Ingestion</h2>
            <p className="muted">Simulate high-velocity GPS breadcrumbs & real-time anomaly detection.</p>
            <button onClick={ingestData}>Send GPS Sensor Ping</button>
            {ingest && <pre className="json">{JSON.stringify(ingest, null, 2)}</pre>}
          </div>
        </section>

        {/* 4. DATABASE ROUTES TABLE */}
        <section className="card">
          <h2>🗃️ Relational Database Routes (PostgreSQL / MySQL)</h2>
          <div className="route-table">
            {routes.map(r => (
              <div className="route-row" key={r.id}>
                <b>{r.name}</b>
                <span>{r.source} → {r.destination}</span>
                <span>{r.distanceKm || r.distance_km} km</span>
                <span>{r.baseMinutes || r.base_minutes} min base (₹{r.baseFare || r.base_fare || 50})</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        Urban Mobility Data Integration & Route Intelligence Platform · Comprehensive Engineering (CO1 to CO6)
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
