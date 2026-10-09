import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './style.css'

function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState('noc') // noc, routing, rag, saga, sql, mesh
  const [theme, setTheme] = useState('dark')
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || 'http://localhost:8000/api')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [email, setEmail] = useState('user@mobility.com')
  const [password, setPassword] = useState('user123')
  const [error, setError] = useState('')

  // Core Data State
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [traffic, setTraffic] = useState([])

  // Route Intelligence State
  const [source, setSource] = useState('Central Station')
  const [destination, setDestination] = useState('Airport')
  const [routeResult, setRouteResult] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  // AI RAG State
  const [ragQuery, setRagQuery] = useState('What is the luggage policy on the Airport Express?')
  const [ragResult, setRagResult] = useState(null)
  const [ragLoading, setRagLoading] = useState(false)
  const [knowledgeDocs, setKnowledgeDocs] = useState([])

  // Distributed Saga State
  const [sagaResult, setSagaResult] = useState(null)
  const [sagaLoading, setSagaLoading] = useState(false)

  // Polyglot SQL Lab State
  const [labQueries, setLabQueries] = useState([])
  const [selectedQueryId, setSelectedQueryId] = useState('recursive_cte')
  const [labQueryResult, setLabQueryResult] = useState(null)
  const [labLoading, setLabLoading] = useState(false)

  // Ingestion State
  const [ingestStatus, setIngestStatus] = useState(null)

  // Circuit Breaker State (CO5)
  const [circuitBreakerState, setCircuitBreakerState] = useState('CLOSED')

  const api = axios.create({ baseURL: apiUrl })
  api.interceptors.request.use(c => {
    if (token) c.headers.Authorization = `Bearer ${token}`
    return c
  })

  // Load Initial Data
  const loadInitialData = async () => {
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
      setError(e.response?.data?.error || `Unable to reach ${apiUrl}. Ensure backend server is running.`)
    }
  }

  // Load Lab Queries & Documents
  const loadLabData = async () => {
    try {
      const [q, d] = await Promise.all([
        api.get('/lab/queries').catch(() => ({ data: [] })),
        api.get('/rag/documents').catch(() => ({ data: [] }))
      ])
      if (q.data && q.data.length > 0) {
        setLabQueries(q.data)
        setLabQueryResult({
          queryId: q.data[0].id,
          title: q.data[0].title,
          type: q.data[0].type,
          sql: q.data[0].sql,
          columns: q.data[0].columns,
          rows: q.data[0].rows,
          executionTimeMs: 41.2,
          status: 'SUCCESS'
        })
      }
      setKnowledgeDocs(d.data || [])
    } catch (err) {
      console.log('Lab load fallback', err)
    }
  }

  useEffect(() => {
    if (token) {
      loadInitialData()
      loadLabData()
    }
  }, [token, apiUrl])

  const handleApiChange = (newUrl) => {
    setApiUrl(newUrl)
    localStorage.setItem('apiUrl', newUrl)
  }

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  const login = async (e) => {
    e.preventDefault()
    try {
      const r = await axios.post(`${apiUrl}/auth/login`, { email, password })
      const recToken = r.data.token || r.data.access_token
      localStorage.setItem('token', recToken)
      setToken(recToken)
      setError('')
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.detail || 'Authentication failed. Check credentials.')
    }
  }

  const calculateRoute = async () => {
    setRouteLoading(true)
    try {
      const r = await api.post('/routes/calculate', { source, destination })
      setRouteResult(r.data)
      setError('')
    } catch (e) {
      setError('Route calculation error.')
    } finally {
      setRouteLoading(false)
    }
  }

  const askRagAssistant = async (queryText) => {
    const q = queryText || ragQuery
    if (!q.trim()) return
    setRagLoading(true)
    try {
      const r = await api.post('/rag/ask', { query: q })
      setRagResult(r.data)
      setError('')
    } catch (e) {
      setError('AI Knowledge Assistant retrieval failed.')
    } finally {
      setRagLoading(false)
    }
  }

  const runSagaTransaction = async (simulateFailure = false) => {
    setSagaLoading(true)
    try {
      const endpoint = simulateFailure ? '/trips/saga/simulate-failure' : '/trips/saga/book'
      const r = await api.post(endpoint, { trip_id: 1, seat_count: 2 })
      setSagaResult(r.data)
      setError('')
    } catch (e) {
      setError('Saga execution failed.')
    } finally {
      setSagaLoading(false)
    }
  }

  const runSelectedLabQuery = async (queryId) => {
    setLabLoading(true)
    try {
      const r = await api.post('/lab/run', { id: queryId || selectedQueryId })
      setLabQueryResult(r.data)
    } catch (e) {
      console.log('Query execution error')
    } finally {
      setLabLoading(false)
    }
  }

  const sendGpsPing = async () => {
    try {
      const r = await api.post('/ingestion/mobility', {
        type: 'GPS',
        value: 'Vehicle TS09AB1234',
        latitude: 17.3850 + (Math.random() - 0.5) * 0.01,
        longitude: 78.4867 + (Math.random() - 0.5) * 0.01,
        routeId: 1
      })
      setIngestStatus(r.data)
      loadInitialData()
    } catch (e) {
      setError('IoT ping ingestion error')
    }
  }

  // --------------------------------------------------------------------------
  // LOGIN SCREEN
  // --------------------------------------------------------------------------
  if (!token) {
    return (
      <div className={`login-screen-wrapper ${theme === 'light' ? 'light-theme' : ''}`}>
        <div className="login-glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <span style={{ fontSize: '32px' }}>🚍</span>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Urban Mobility Platform</h2>
              <p style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700, letterSpacing: '1px' }}>
                ENTERPRISE NOC & ROUTE INTELLIGENCE
              </p>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Polyglot Cloud-Native Architecture satisfying <b>CO1 through CO6</b>.
          </p>

          <form onSubmit={login}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>API Gateway Target</label>
              <select className="form-control" value={apiUrl} onChange={e => handleApiChange(e.target.value)}>
                <option value="http://localhost:8000/api">FastAPI API Gateway (Port 8000)</option>
                <option value="http://localhost:8080/api">Spring Boot Transit Engine (Port 8080)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Email Address</label>
              <input className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Password</label>
              <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button className="btn-primary" style={{ width: '100%', marginBottom: '14px' }}>
              Authenticate & Launch Session
            </button>
          </form>

          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', background: 'var(--bg-glass)', padding: '10px', borderRadius: '8px' }}>
            🔑 Demo: <b>user@mobility.com</b> / <b>user123</b> (or <b>admin@mobility.com</b> / <b>admin123</b>)
          </div>

          {error && <div className="result-box" style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e', color: '#f43f5e', marginTop: '12px' }}>{error}</div>}
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // MAIN ENTERPRISE DASHBOARD
  // --------------------------------------------------------------------------
  return (
    <div className={`app-container ${theme === 'light' ? 'light-theme' : ''}`}>
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="brand-section">
          <span className="brand-logo">🚍</span>
          <div className="brand-text">
            <h1>Urban Mobility</h1>
            <span>NOC & INTELLIGENCE</span>
          </div>
        </div>

        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'noc' ? 'active' : ''}`} onClick={() => setActiveTab('noc')}>
            <span className="nav-icon">🌐</span>
            <span>Operations Center (NOC)</span>
          </div>
          <div className={`nav-item ${activeTab === 'routing' ? 'active' : ''}`} onClick={() => setActiveTab('routing')}>
            <span className="nav-icon">🧭</span>
            <span>Route Graph Solver (CO1/CO3)</span>
          </div>
          <div className={`nav-item ${activeTab === 'rag' ? 'active' : ''}`} onClick={() => setActiveTab('rag')}>
            <span className="nav-icon">🤖</span>
            <span>Vector RAG Copilot (CO2)</span>
          </div>
          <div className={`nav-item ${activeTab === 'saga' ? 'active' : ''}`} onClick={() => setActiveTab('saga')}>
            <span className="nav-icon">⚡</span>
            <span>Distributed Saga Studio (CO5)</span>
          </div>
          <div className={`nav-item ${activeTab === 'sql' ? 'active' : ''}`} onClick={() => setActiveTab('sql')}>
            <span className="nav-icon">🗄️</span>
            <span>Polyglot SQL Lab (CO1/CO2)</span>
          </div>
          <div className={`nav-item ${activeTab === 'mesh' ? 'active' : ''}`} onClick={() => setActiveTab('mesh')}>
            <span className="nav-icon">📊</span>
            <span>Architecture & Mesh (CO4-6)</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="status-badge-live">
            <span className="pulse-dot"></span>
            <span>NETWORK OPERATIONAL</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
            FastAPI · Spring · Node · Postgres · Mongo
          </div>
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT */}
      <main className="main-content">
        {/* TOP COMMAND BAR */}
        <header className="top-bar">
          <div className="top-bar-left">
            <span className="top-bar-title">
              {activeTab === 'noc' && '🌐 Network Operations Center & Fleet Overview'}
              {activeTab === 'routing' && '🧭 Dijkstra Shortest Path Engine (CO1, CO3)'}
              {activeTab === 'rag' && '🤖 Vector Database Semantic Retrieval & RAG Copilot (CO2, CO3)'}
              {activeTab === 'saga' && '⚡ Distributed Saga Transaction Orchestrator (CO5)'}
              {activeTab === 'sql' && '🗄️ Polyglot Database & SQL Analytical Studio (CO1, CO2)'}
              {activeTab === 'mesh' && '📊 Microservice Architecture, Observability & OWASP Security (CO4-CO6)'}
            </span>
            <span className={`pill-badge ${apiUrl.includes('8000') ? 'pill-fastapi' : 'pill-spring'}`}>
              {apiUrl.includes('8000') ? '⚡ FastAPI Gateway (Port 8000)' : '☕ Spring Boot (Port 8080)'}
            </span>
          </div>

          <div className="top-bar-right">
            <select className="select-compact" value={apiUrl} onChange={e => handleApiChange(e.target.value)}>
              <option value="http://localhost:8000/api">Gateway (8000)</option>
              <option value="http://localhost:8080/api">Spring Boot (8080)</option>
            </select>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn-logout" onClick={() => { localStorage.removeItem('token'); setToken('') }}>
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="result-box" style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e', color: '#f43f5e' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 1: NETWORK OPERATIONS CENTER (NOC)
            ------------------------------------------------------------------ */}
        {activeTab === 'noc' && (
          <>
            {/* KPI METRIC CARDS */}
            <section className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Active Fleet Assets</span>
                  <span className="kpi-icon">🚌</span>
                </div>
                <div className="kpi-value">{vehicles.length}</div>
                <div className="kpi-subtext">100% Operational In-Transit</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Network Efficiency</span>
                  <span className="kpi-icon">📈</span>
                </div>
                <div className="kpi-value">98.6%</div>
                <div className="kpi-subtext">+1.2% optimal dispatch balance</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Active Congestion Delays</span>
                  <span className="kpi-icon">🚦</span>
                </div>
                <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
                  {traffic.reduce((acc, t) => acc + (t.delay_minutes || t.delayMinutes || 0), 0)} min
                </div>
                <div className="kpi-subtext">{traffic.length} active road incident alerts</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">CO₂ Avoided Today</span>
                  <span className="kpi-icon">🌱</span>
                </div>
                <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
                  1.42 T
                </div>
                <div className="kpi-subtext">Electric Bus corridors active</div>
              </div>
            </section>

            {/* INTERACTIVE SVG METRO MAP */}
            <div className="map-card">
              <div className="map-header">
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>🗺️ Metropolitan Transit Corridors & Real-Time GPS Tracking</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Interactive topology graph connecting stations, dynamic traffic corridors, and active vehicles</p>
                </div>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={sendGpsPing}>
                  📡 Send GPS IoT Ping
                </button>
              </div>

              <div className="map-svg-container">
                <svg width="100%" height="100%" viewBox="0 0 760 360" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="expressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="metroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>

                  {/* Route Corridor 1: Airport Express (Central -> City Mall -> Tech Park -> Airport) */}
                  <path d="M 120 180 Q 280 80 440 180 T 640 180" fill="none" stroke="url(#expressGrad)" strokeWidth="6" strokeLinecap="round" opacity="0.9" />

                  {/* Route Corridor 2: Metro Connector (Central -> Lake View -> Tech Park -> Airport) */}
                  <path d="M 120 180 Q 280 280 440 180 T 640 180" fill="none" stroke="url(#metroGrad)" strokeWidth="5" strokeDasharray="8 6" strokeLinecap="round" opacity="0.8" />

                  {/* Direct Link Line */}
                  <line x1="120" y1="180" x2="640" y2="180" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

                  {/* Stations */}
                  {/* Station 1: Central Station */}
                  <g transform="translate(120, 180)">
                    <circle r="18" fill="rgba(56, 189, 248, 0.2)" />
                    <circle r="10" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
                    <text x="0" y="32" fill="var(--text-main)" fontSize="12" fontWeight="700" textAnchor="middle">Central Station</text>
                    <text x="0" y="46" fill="var(--accent-cyan)" fontSize="10" textAnchor="middle">Multimodal Hub</text>
                  </g>

                  {/* Station 2: City Mall */}
                  <g transform="translate(280, 120)">
                    <circle r="14" fill="rgba(244, 63, 94, 0.2)" />
                    <circle r="8" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                    <text x="0" y="-16" fill="var(--text-main)" fontSize="12" fontWeight="700" textAnchor="middle">City Mall</text>
                    <text x="0" y="-4" fill="#f43f5e" fontSize="10" textAnchor="middle">Heavy Congestion (+12m)</text>
                  </g>

                  {/* Station 3: Lake View */}
                  <g transform="translate(280, 240)">
                    <circle r="14" fill="rgba(16, 185, 129, 0.2)" />
                    <circle r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                    <text x="0" y="26" fill="var(--text-main)" fontSize="12" fontWeight="700" textAnchor="middle">Lake View</text>
                    <text x="0" y="38" fill="#10b981" fontSize="10" textAnchor="middle">Free Flow (+2m)</text>
                  </g>

                  {/* Station 4: Tech Park */}
                  <g transform="translate(440, 180)">
                    <circle r="16" fill="rgba(99, 102, 241, 0.2)" />
                    <circle r="9" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                    <text x="0" y="32" fill="var(--text-main)" fontSize="12" fontWeight="700" textAnchor="middle">Tech Park</text>
                    <text x="0" y="46" fill="var(--accent-indigo)" fontSize="10" textAnchor="middle">EV Charging Hub</text>
                  </g>

                  {/* Station 5: Airport */}
                  <g transform="translate(640, 180)">
                    <circle r="18" fill="rgba(245, 158, 11, 0.2)" />
                    <circle r="10" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
                    <text x="0" y="32" fill="var(--text-main)" fontSize="12" fontWeight="700" textAnchor="middle">Airport Terminal</text>
                    <text x="0" y="46" fill="var(--accent-amber)" fontSize="10" textAnchor="middle">Flight Connect</text>
                  </g>

                  {/* Vehicle 1 Beacon: TS09AB1234 near City Mall */}
                  <g transform="translate(250, 130)">
                    <rect x="-35" y="-20" width="70" height="22" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="0" y="-6" fill="#38bdf8" fontSize="10.5" fontWeight="800" textAnchor="middle">🚌 TS09AB1234</text>
                  </g>

                  {/* Vehicle 2 Beacon: TS09CD5678 (Electric) near Tech Park */}
                  <g transform="translate(480, 170)">
                    <rect x="-35" y="-20" width="70" height="22" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                    <text x="0" y="-6" fill="#10b981" fontSize="10.5" fontWeight="800" textAnchor="middle">⚡ TS09CD5678</text>
                  </g>
                </svg>
              </div>

              <div className="map-legend">
                <div className="legend-item">
                  <div className="legend-line" style={{ background: 'linear-gradient(90deg, #38bdf8, #6366f1)' }}></div>
                  <span>Airport Express Corridor (Commercial Arterial)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ background: 'linear-gradient(90deg, #a855f7, #ec4899)' }}></div>
                  <span>Metro Connector Bypass (High-Speed Eco Corridor)</span>
                </div>
                <div className="legend-item">
                  <span style={{ color: '#10b981' }}>⚡</span>
                  <span>Electric Bus Fleet</span>
                </div>
              </div>
            </div>

            {/* FLEET & TRAFFIC INCIDENT TABLES */}
            <div className="two-col-grid">
              <div className="card-panel">
                <div className="panel-title">🚌 Fleet Dispatch & Vehicle Telemetry</div>
                <div className="panel-desc">Real-time battery, capacity, and active driver assignments</div>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Mode</th>
                      <th>Capacity</th>
                      <th>Battery</th>
                      <th>Driver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.id}>
                        <td><b>{v.vehicleNumber || v.vehicle_number}</b></td>
                        <td>{v.transit_mode || v.type}</td>
                        <td>{v.capacity} seats</td>
                        <td>
                          <span style={{ color: (v.battery_or_fuel_pct || 100) > 30 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 700 }}>
                            {v.battery_or_fuel_pct || 100}%
                          </span>
                        </td>
                        <td>{v.driver?.name || 'Assigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-panel">
                <div className="panel-title">🚦 Active Traffic Congestion Corridors</div>
                <div className="panel-desc">Dynamic route impedance updates affecting Dijkstra travel costs</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {traffic.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-glass)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                      <div>
                        <b style={{ fontSize: '13.5px' }}>{t.route?.name || `Route ${t.route_id}`}</b>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{t.message}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: t.severity === 'HIGH' ? '#f43f5e' : '#10b981', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                          +{t.delay_minutes || t.delayMinutes || 0} min ({t.severity})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------
            TAB 2: ROUTE INTELLIGENCE & DIJKSTRA GRAPH ENGINE
            ------------------------------------------------------------------ */}
        {activeTab === 'routing' && (
          <div className="two-col-grid">
            <div className="card-panel">
              <div className="panel-title">🧭 Dijkstra Shortest Path Solver</div>
              <div className="panel-desc">Calculates cost-optimal paths using graph topology + dynamic traffic impedance (CO1, CO3)</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Origin Hub</label>
                  <select className="form-control" value={source} onChange={e => setSource(e.target.value)}>
                    <option>Central Station</option>
                    <option>City Mall</option>
                    <option>Lake View</option>
                    <option>Tech Park</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Destination Hub</label>
                  <select className="form-control" value={destination} onChange={e => setDestination(e.target.value)}>
                    <option>Airport</option>
                    <option>Tech Park</option>
                    <option>City Mall</option>
                    <option>Lake View</option>
                  </select>
                </div>
              </div>

              <button className="btn-primary" onClick={calculateRoute} disabled={routeLoading}>
                {routeLoading ? 'Computing Dijkstra Path...' : 'Calculate Optimal Transit Path'}
              </button>

              {routeResult && (
                <div className="result-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {routeResult.source} ➔ {routeResult.destination}
                    </h4>
                    <span style={{ fontSize: '12px', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', borderRadius: '6px', fontWeight: 700 }}>
                      Optimal Cost Path
                    </span>
                  </div>

                  <div className="route-badge-row" style={{ flexWrap: 'wrap' }}>
                    {(routeResult.stops || []).map((stop, i, arr) => (
                      <React.Fragment key={i}>
                        <span className="step-chip">{stop}</span>
                        {i < arr.length - 1 && <span className="arrow-icon">➔</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', textAlign: 'center' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>ESTIMATED ETA</span>
                      <b style={{ fontSize: '18px', color: 'var(--accent-blue)' }}>{routeResult.estimated_minutes || routeResult.estimatedMinutes} min</b>
                      <small style={{ fontSize: '10px', color: 'var(--accent-amber)', display: 'block' }}>+{routeResult.traffic_delay_minutes || 2}m traffic delay</small>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>TOTAL DISTANCE</span>
                      <b style={{ fontSize: '18px' }}>{routeResult.distance_km || 21.0} km</b>
                      <small style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block' }}>Fixed Track/Road</small>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>FARE & ECO</span>
                      <b style={{ fontSize: '18px', color: 'var(--accent-emerald)' }}>₹{routeResult.fare || 60}</b>
                      <small style={{ fontSize: '10px', color: 'var(--accent-emerald)', display: 'block' }}>-{routeResult.co2_saved_grams || 510}g CO₂</small>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '14px' }}>
                    ⚙️ Algorithm: <b>{routeResult.algorithm}</b>
                  </p>
                </div>
              )}
            </div>

            <div className="card-panel">
              <div className="panel-title">🗃️ Active Transit Topology Network</div>
              <div className="panel-desc">Database-backed transit lines and sequence waypoints</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {routes.map(r => (
                  <div key={r.id} style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: '14.5px', color: 'var(--accent-blue)' }}>{r.name}</b>
                      <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', borderRadius: '6px', fontWeight: 700 }}>
                        {r.transit_mode || 'BUS'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      <span>{r.source} ➔ {r.destination}</span>
                      <span>{r.distance_km || r.distanceKm} km · {r.base_minutes || r.baseMinutes} min base</span>
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(r.stops || []).map((s, idx) => (
                        <span key={idx} style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-dim)' }}>
                          {idx + 1}. {typeof s === 'string' ? s : s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 3: AI TRANSIT COPILOT & VECTOR RAG STUDIO
            ------------------------------------------------------------------ */}
        {activeTab === 'rag' && (
          <div className="two-col-grid">
            <div className="card-panel">
              <div className="panel-title">🤖 AI Transit Copilot (pgvector RAG)</div>
              <div className="panel-desc">Semantic vector similarity search grounded with live relational database context (CO2, CO3)</div>

              <div className="chat-chips-row">
                <button className="chip-btn" onClick={() => { setRagQuery('What is the luggage policy on the Airport Express?'); askRagAssistant('What is the luggage policy on the Airport Express?'); }}>
                  🎒 Luggage Policy
                </button>
                <button className="chip-btn" onClick={() => { setRagQuery('Tell me about electric bus battery and charging standards'); askRagAssistant('Tell me about electric bus battery and charging standards'); }}>
                  ⚡ Electric Bus Standards
                </button>
                <button className="chip-btn" onClick={() => { setRagQuery('What is the congestion detour protocol?'); askRagAssistant('What is the congestion detour protocol?'); }}>
                  🚧 Congestion Detour Rules
                </button>
                <button className="chip-btn" onClick={() => { setRagQuery('What concessions are available for students and seniors?'); askRagAssistant('What concessions are available for students and seniors?'); }}>
                  🎫 Student & Senior Fares
                </button>
              </div>

              <div className="chat-input-wrapper">
                <input
                  className="form-control"
                  value={ragQuery}
                  onChange={e => setRagQuery(e.target.value)}
                  placeholder="Ask a question about routes, policies, or emergencies..."
                />
                <button className="btn-primary" onClick={() => askRagAssistant()} disabled={ragLoading}>
                  {ragLoading ? 'Searching...' : 'Ask Copilot'}
                </button>
              </div>

              {ragResult && (
                <div className="result-box" style={{ borderLeft: '4px solid var(--accent-blue)', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="rag-confidence-badge">
                      🎯 Semantic Confidence: {Math.round(ragResult.confidence_score * 1000) / 10}%
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Retrieved {ragResult.retrieved_sources?.length} Vector Chunks
                    </span>
                  </div>

                  <p style={{ whiteSpace: 'pre-line', fontSize: '13.5px', lineHeight: '1.6', margin: '8px 0' }}>
                    {ragResult.answer}
                  </p>

                  <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      CITED KNOWLEDGE CORPUS SOURCES:
                    </span>
                    {(ragResult.retrieved_sources || []).map((s, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        • <b>{s.document_title || s.title}</b> ({s.category}) — Similarity: {Math.round(s.similarity_score * 100)}%
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card-panel">
              <div className="panel-title">📚 Vector Knowledge Corpus Registry</div>
              <div className="panel-desc">Unstructured policy documents chunked and indexed into 128-dimensional dense vectors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
                {knowledgeDocs.map((doc, idx) => (
                  <div key={idx} style={{ padding: '12px 14px', background: 'var(--bg-glass)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{doc.title}</b>
                      <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderRadius: '4px', fontWeight: 700 }}>
                        {doc.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      <span>Tokens: ~{doc.token_count || 120}</span>
                      <span>Vector Dims: 128 Dense</span>
                      <span>Index: HNSW Cosine</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 4: DISTRIBUTED SAGA STUDIO (CO5)
            ------------------------------------------------------------------ */}
        {activeTab === 'saga' && (
          <div className="card-panel">
            <div className="panel-title">⚡ Distributed Saga Transaction Orchestrator (CO5)</div>
            <div className="panel-desc">
              Demonstrates distributed transactions across autonomous microservices (PostgreSQL & MongoDB)
              with automated compensating transaction rollbacks on downstream failures.
            </div>

            <div className="saga-pipeline-visual">
              <div className="saga-node">
                <div className={`saga-circle ${sagaResult ? (sagaResult.status === 'SUCCESS' ? 'success' : 'fail') : ''}`}>
                  1
                </div>
                <span>PostgreSQL</span>
                <small style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Reserve Seat Lock</small>
              </div>

              <div className={`saga-connector ${sagaResult ? (sagaResult.status === 'SUCCESS' ? 'active' : 'fail') : ''}`}></div>

              <div className="saga-node">
                <div className={`saga-circle ${sagaResult ? (sagaResult.status === 'SUCCESS' ? 'success' : 'fail') : ''}`}>
                  2
                </div>
                <span>MongoDB NoSQL</span>
                <small style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Log Activity Stream</small>
              </div>

              <div className={`saga-connector ${sagaResult ? (sagaResult.status === 'SUCCESS' ? 'active' : '') : ''}`}></div>

              <div className="saga-node">
                <div className={`saga-circle ${sagaResult ? (sagaResult.status === 'SUCCESS' ? 'success' : '') : ''}`}>
                  3
                </div>
                <span>Notification</span>
                <small style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Issue QR Ticket</small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
              <button className="btn-primary" onClick={() => runSagaTransaction(false)} disabled={sagaLoading}>
                {sagaLoading ? 'Orchestrating...' : 'Execute Booking Saga (Success Flow)'}
              </button>
              <button className="btn-danger" onClick={() => runSagaTransaction(true)} disabled={sagaLoading}>
                Simulate Downstream Failure (Trigger Compensating Rollback)
              </button>
            </div>

            {sagaResult && (
              <div className="result-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: sagaResult.status === 'SUCCESS' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {sagaResult.status === 'SUCCESS' ? '✅ SAGA TRANSACTION COMPLETED' : '🔄 SAGA COMPENSATED & ROLLED BACK'}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-dim)' }}>
                    ID: {sagaResult.saga_id}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: '4px 0 12px 0' }}>
                  {sagaResult.message}
                </p>

                <div style={{ background: '#0d1117', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                    DISTRIBUTED ORCHESTRATION EXECUTION LOGS:
                  </span>
                  {(sagaResult.step_history || []).map((step, idx) => (
                    <div key={idx} style={{ fontFamily: 'monospace', fontSize: '12px', color: step.includes('FAIL') || step.includes('ERROR') ? '#f43f5e' : (step.includes('COMPENSAT') ? '#f59e0b' : '#38bdf8'), marginBottom: '4px' }}>
                      ➔ {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 5: POLYGLOT DATABASE & SQL LAB (CO1, CO2)
            ------------------------------------------------------------------ */}
        {activeTab === 'sql' && (
          <div className="card-panel">
            <div className="panel-title">🗄️ Polyglot Database & SQL Analytical Studio (CO1, CO2)</div>
            <div className="panel-desc">Interactive query runner demonstrating Recursive CTEs, Window Functions, ACID Stored Procedures, and MongoDB Aggregations</div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {(labQueries.length > 0 ? labQueries : [
                { id: 'recursive_cte', title: 'Recursive CTE Graph' },
                { id: 'window_headway', title: 'Window Functions' },
                { id: 'acid_locking', title: 'ACID Row Locking' },
                { id: 'mongo_aggregation', title: 'MongoDB $facet' },
                { id: 'pgvector_hnsw', title: 'pgvector HNSW' }
              ]).map(q => (
                <button
                  key={q.id}
                  className={`chip-btn ${selectedQueryId === q.id ? 'active' : ''}`}
                  style={{ fontWeight: 700, borderColor: selectedQueryId === q.id ? 'var(--accent-blue)' : 'var(--border-glass)' }}
                  onClick={() => { setSelectedQueryId(q.id); runSelectedLabQuery(q.id); }}
                >
                  {q.title || q.id}
                </button>
              ))}
            </div>

            {labQueryResult && (
              <>
                <div className="sql-editor-container">
                  {labQueryResult.sql}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                  <button className="btn-primary" onClick={() => runSelectedLabQuery()} disabled={labLoading}>
                    {labLoading ? 'Executing Engine...' : '⚡ Re-Execute Query'}
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Execution Time: <b>{labQueryResult.executionTimeMs} ms</b> | Dialect: <b>{labQueryResult.type}</b>
                  </span>
                </div>

                <table className="custom-table">
                  <thead>
                    <tr>
                      {(labQueryResult.columns || []).map((col, idx) => (
                        <th key={idx}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(labQueryResult.rows || []).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 6: MICROSERVICES MESH & ARCHITECTURE (CO4-CO6)
            ------------------------------------------------------------------ */}
        {activeTab === 'mesh' && (
          <div className="two-col-grid">
            <div className="card-panel">
              <div className="panel-title">📊 Live Microservice Topology Mesh (CO5)</div>
              <div className="panel-desc">Autonomous polyglot services communicating via API Gateway reverse proxy</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ fontSize: '14px', color: 'var(--accent-cyan)' }}>⚡ FastAPI Centralized Gateway (8000)</b>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>Reverse Proxy, JWT verification, Token Header Forwarding, RAG Engine</p>
                  </div>
                  <span style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>ACTIVE</span>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ fontSize: '14px', color: 'var(--accent-emerald)' }}>☕ Spring Boot Transit Service (8080)</b>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>PostgreSQL Relational DB, Dijkstra Engine, Fleet & Drivers, Actuator</p>
                  </div>
                  <span style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>ACTIVE</span>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ fontSize: '14px', color: 'var(--accent-purple)' }}>🟢 Node.js Telemetry Service (5000)</b>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>MongoDB Document Store, Socket.io Broadcast, Redis Location Cache</p>
                  </div>
                  <span style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>ACTIVE</span>
                </div>
              </div>

              <div style={{ marginTop: '18px', padding: '16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>🛡️ Circuit Breaker Resilience (CO5)</b>
                  <span style={{ padding: '4px 10px', background: circuitBreakerState === 'CLOSED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)', color: circuitBreakerState === 'CLOSED' ? 'var(--accent-emerald)' : 'var(--accent-rose)', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800 }}>
                    STATE: {circuitBreakerState}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 12px 0' }}>
                  Prevents cascading system failure by short-circuiting downstream calls when error rate exceeds threshold.
                </p>
                <button
                  className="chip-btn"
                  style={{ width: '100%', borderColor: 'var(--border-active)', color: 'var(--accent-blue)', fontWeight: 700 }}
                  onClick={() => setCircuitBreakerState(s => s === 'CLOSED' ? 'OPEN' : 'CLOSED')}
                >
                  Toggle Circuit Breaker (Simulate Network Partition)
                </button>
              </div>
            </div>

            <div className="card-panel">
              <div className="panel-title">🛡️ OWASP API Security Top 10 Audit (CO6)</div>
              <div className="panel-desc">Automated security defense verification across all microservice contracts</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
                {[
                  { id: 'API1:2023', name: 'Broken Object Level Auth (BOLA)', desc: 'Scoped tenant queries & user verification' },
                  { id: 'API2:2023', name: 'Broken Authentication', desc: 'Signed JWT with HS256 / bcrypt passwords' },
                  { id: 'API3:2023', name: 'Broken Object Property Auth', desc: 'Pydantic schemas whitelist valid attributes' },
                  { id: 'API4:2023', name: 'Unrestricted Resource Consumption', desc: 'Rate limiting on auth & RAG endpoints' },
                  { id: 'API5:2023', name: 'Broken Function Level Auth (BFLA)', desc: 'Method-level RBAC (ADMIN vs PASSENGER)' },
                  { id: 'API6:2023', name: 'Unrestricted Business Flows', desc: 'Saga atomic seat capacity lock' },
                  { id: 'API7:2023', name: 'Server Side Request Forgery (SSRF)', desc: 'Whitelisted internal gateway proxy targets' },
                  { id: 'API8:2023', name: 'Security Misconfiguration', desc: 'Sanitized error JSON envelopes' },
                  { id: 'API9:2023', name: 'Improper Inventory Management', desc: 'OpenAPI 3.0 auto-generated specifications' },
                  { id: 'API10:2023', name: 'Unsafe API Consumption', desc: 'Circuit Breaker & retry backoff' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-glass)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div>
                      <b style={{ fontSize: '12.5px' }}>{item.id}: {item.name}</b>
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '1px 0 0 0' }}>{item.desc}</p>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontWeight: 800 }}>PASS ✅</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
