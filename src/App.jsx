import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom'
import { apiRequest } from './api'
import './App.css'

const demoAccounts = [
  {
    name: 'Riya Kapoor',
    role: 'Admin',
    email: 'riya.kapoor@finboard.local',
    detail: 'Full operational access across records, reporting, and user administration.',
  },
  {
    name: 'Aarav Mehta',
    role: 'Admin',
    email: 'aarav.mehta@finboard.local',
    detail: 'Administrative access for platform operations, data updates, and user management.',
  },
  {
    name: 'Neha Sharma',
    role: 'Analyst',
    email: 'neha.sharma@finboard.local',
    detail: 'Access to operational records and reporting for review and analysis.',
  },
  {
    name: 'Priya Nair',
    role: 'Viewer',
    email: 'priya.nair@finboard.local',
    detail: 'Read-only access to executive reporting and portfolio-level metrics.',
  },
  {
    name: 'Karan Iyer',
    role: 'Viewer',
    email: 'karan.iyer@finboard.local',
    detail: 'Inactive demo account for validating access restrictions.',
  },
]

const blankRecordForm = {
  amount: '',
  type: 'income',
  category: '',
  date: '',
  notes: '',
}

const blankUserForm = {
  name: '',
  email: '',
  role: 'viewer',
  status: 'active',
}

function hasPermission(user, permission) {
  return user?.permissions?.includes(permission)
}

function formatRole(value) {
  if (!value) {
    return ''
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatStatus(value) {
  if (!value) {
    return ''
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

function formatMonth(value) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}-01`))
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem('finance-theme')

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [session, setSession] = useState(() => {
    const saved = window.localStorage.getItem('finance-session')
    return saved ? JSON.parse(saved) : { token: '', user: null }
  })
  const [authLoading, setAuthLoading] = useState(() => Boolean(session.token))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('finance-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!session.token) {
      return
    }

    let cancelled = false

    apiRequest('/auth/me', { token: session.token })
      .then((payload) => {
        if (!cancelled) {
          const nextSession = { token: session.token, user: payload.user }
          setSession(nextSession)
          window.localStorage.setItem(
            'finance-session',
            JSON.stringify(nextSession),
          )
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession({ token: '', user: null })
          window.localStorage.removeItem('finance-session')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [session.token])

  async function handleLogin(email) {
    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email },
    })

    const nextSession = {
      token: payload.token,
      user: payload.user,
    }

    setSession(nextSession)
    window.localStorage.setItem('finance-session', JSON.stringify(nextSession))
  }

  function handleLogout() {
    setSession({ token: '', user: null })
    window.localStorage.removeItem('finance-session')
  }

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  if (authLoading) {
    return <div className="screen-state">Restoring session...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session.user ? (
              <Navigate to="/overview" replace />
            ) : (
              <LoginPage onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />
            )
          }
        />
        <Route element={<ProtectedRoute session={session} />}>
          <Route
            element={
              <AppShell
                session={session}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            <Route
              path="/overview"
              element={<OverviewPage token={session.token} />}
            />
            <Route
              path="/records"
              element={
                <PermissionRoute
                  allowed={hasPermission(session.user, 'records:read')}
                >
                  <RecordsPage session={session} />
                </PermissionRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PermissionRoute
                  allowed={hasPermission(session.user, 'users:manage')}
                >
                  <UsersPage session={session} />
                </PermissionRoute>
              }
            />
            <Route path="/forbidden" element={<ForbiddenPage />} />
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <Navigate to={session.user ? '/overview' : '/login'} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedRoute({ session }) {
  return session.user ? <Outlet /> : <Navigate to="/login" replace />
}

function PermissionRoute({ allowed, children }) {
  return allowed ? children : <Navigate to="/forbidden" replace />
}

function AppShell({ session, onLogout, theme, onToggleTheme }) {
  const navigation = useMemo(
    () =>
      [
        { to: '/overview', label: 'Overview' },
        hasPermission(session.user, 'records:read')
          ? { to: '/records', label: 'Records' }
          : null,
        hasPermission(session.user, 'users:manage')
          ? { to: '/users', label: 'Users' }
          : null,
      ].filter(Boolean),
    [session.user],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Finance Operations</p>
          <h1>Operations Console</h1>
          <p className="sidebar-copy">
            A unified workspace for reporting, financial records, access
            controls, and operational oversight.
          </p>
        </div>

        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />

        <div className="sidebar-accent">
          <span className="accent-label">Access Profile</span>
          <strong>{formatRole(session.user.role)} workspace</strong>
          <p>
            Navigation adapts to the signed-in account, while the API enforces
            the underlying authorization policy.
          </p>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="profile-card">
          <p className="profile-role">{formatRole(session.user.role)}</p>
          <strong>{session.user.name}</strong>
          <span>{session.user.email}</span>
          <span className="status-pill">{formatStatus(session.user.status)}</span>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="content-panel">
        <Outlet />
      </main>
    </div>
  )
}

function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submitLogin(event) {
    event.preventDefault()

    if (!email.trim()) {
      setError('Enter a valid email address to continue.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onLogin(email)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  function useDemoEmail(nextEmail) {
    setEmail(nextEmail)
    setError('')
  }

  return (
    <div className="login-screen">
      <section className="login-hero">
        <div className="login-copy">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
          <p className="eyebrow">Finance Operations Platform</p>
          <h1>Professional financial oversight with secure, role-aware workflows.</h1>
          <p className="lead-copy">
            Sign in with a seeded workspace account to review reporting,
            operational records, and governed access controls. The interface
            adapts to the user profile while the API enforces every permission.
          </p>
          <div className="hero-chips">
            <span>Access Control</span>
            <span>Reporting</span>
            <span>Pagination</span>
            <span>Audit-Safe Deletes</span>
          </div>
          <div className="hero-stat-grid">
            <div className="hero-stat">
              <strong>3</strong>
              <span>Active roles</span>
            </div>
            <div className="hero-stat">
              <strong>8</strong>
              <span>Seeded records</span>
            </div>
            <div className="hero-stat">
              <strong>1</strong>
              <span>Unified API</span>
            </div>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-panel-head">
            <p className="eyebrow">Workspace Access</p>
            <h2>Sign in to continue</h2>
          </div>
          {error ? <p className="error-banner">{error}</p> : null}
          <form className="login-form" onSubmit={submitLogin}>
            <label className="login-field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="login-demo-head">
            <p className="eyebrow">Demo Credentials</p>
            <span>Select an email below to autofill the sign-in form.</span>
          </div>
          <section className="account-grid">
            {demoAccounts.map((account) => (
              <article key={account.email} className="account-card">
                <p className="account-role">{account.role}</p>
                <h2>{account.name}</h2>
                <p>
                  <strong>{account.email}</strong>
                </p>
                <p>{account.detail}</p>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => useDemoEmail(account.email)}
                >
                  Use this email
                </button>
              </article>
            ))}
          </section>
        </div>
      </section>
    </div>
  )
}

function OverviewPage({ token }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    apiRequest('/summary', { token })
      .then((payload) => {
        if (!cancelled) {
          setSummary(payload)
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  if (error) {
    return <div className="screen-state error-banner">{error}</div>
  }

  if (!summary) {
    return <div className="screen-state">Loading dashboard summary...</div>
  }

  return (
    <div className="page-stack">
      <section className="overview-hero">
        <div className="page-header">
          <div>
            <p className="eyebrow">Executive Overview</p>
            <h2>Financial performance at a glance</h2>
          </div>
          <p className="header-copy">
            A consolidated summary of portfolio activity, category performance,
            and recent financial movement.
          </p>
        </div>

        <div className="spotlight-grid">
          <article className="spotlight-card spotlight-primary">
            <span>Net operating position</span>
            <strong>{formatCurrency(summary.totals.netBalance)}</strong>
            <p>
              Calculated from all active income and expense entries currently in
              the system.
            </p>
          </article>

          <article className="spotlight-card">
            <span>Income coverage</span>
            <strong>
              {summary.totals.expenses === 0
                ? 'N/A'
                : `${(summary.totals.income / summary.totals.expenses).toFixed(1)}x`}
            </strong>
            <p>Simple ratio useful for a compact executive summary.</p>
          </article>

          <article className="spotlight-card">
            <span>Latest activity</span>
            <strong>{summary.recentActivity.length} items</strong>
            <p>Recent transactions surfaced for faster operational review.</p>
          </article>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard
          label="Total income"
          value={formatCurrency(summary.totals.income)}
        />
        <MetricCard
          label="Total expenses"
          value={formatCurrency(summary.totals.expenses)}
        />
        <MetricCard
          label="Net balance"
          value={formatCurrency(summary.totals.netBalance)}
        />
        <MetricCard label="Active records" value={summary.totals.recordsCount} />
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="panel-header">
            <h3>Category performance</h3>
            <span>Net contribution by category after expense allocation</span>
          </div>
          <div className="list-stack">
            {summary.categoryTotals.map((item) => (
              <div key={item.category} className="list-row category-row">
                <div>
                  <strong>{item.category}</strong>
                  <span>
                    In {formatCurrency(item.income)} / Out{' '}
                    {formatCurrency(item.expenses)}
                  </span>
                </div>
                <div className="trend-meta">
                  <div className="mini-bar">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.abs(item.total) /
                            Math.max(summary.totals.income, summary.totals.expenses, 1) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <strong>{formatCurrency(item.total)}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Monthly trend</h3>
              <span>Monthly movement comparing income and expense trends</span>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <i className="legend-dot legend-income"></i>
                Income
              </span>
              <span className="legend-item">
                <i className="legend-dot legend-expense"></i>
                Expense
              </span>
            </div>
          </div>
          <div className="list-stack">
            {summary.monthlyTrends.map((item) => (
              <div key={item.month} className="trend-block">
                <div className="list-row trend-heading">
                  <div>
                    <strong>{formatMonth(item.month)}</strong>
                    <span>
                      Income {formatCurrency(item.income)} / Expense{' '}
                      {formatCurrency(item.expenses)}
                    </span>
                  </div>
                  <strong>{formatCurrency(item.net)}</strong>
                </div>
                <div className="trend-bars">
                  <div className="trend-row">
                    <span className="trend-label">Income</span>
                    <div className="trend-bar trend-income">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            (item.income /
                              Math.max(summary.totals.income, summary.totals.expenses, 1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                    <strong className="trend-value">
                      {formatCurrency(item.income)}
                    </strong>
                  </div>
                  <div className="trend-row">
                    <span className="trend-label">Expense</span>
                    <div className="trend-bar trend-expense">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            (item.expenses /
                              Math.max(summary.totals.income, summary.totals.expenses, 1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                    <strong className="trend-value">
                      {formatCurrency(item.expenses)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="panel">
        <div className="panel-header">
          <h3>Recent activity</h3>
          <span>Most recent active records</span>
        </div>
        <div className="activity-grid">
          {summary.recentActivity.map((record) => (
            <div key={record.id} className="activity-card">
              <span className={`type-badge type-badge-${record.type}`}>
                {record.type}
              </span>
              <strong>{record.category}</strong>
              <p>{record.notes || 'No description provided.'}</p>
              <div className="activity-meta">
                <span>{formatDate(record.date)}</span>
                <strong>{formatCurrency(record.amount)}</strong>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function RecordsPage({ session }) {
  const isAdmin = hasPermission(session.user, 'records:write')
  const recordFormRef = useRef(null)
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    totalItems: 0,
    totalPages: 1,
  })
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 5,
    type: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    includeDeleted: false,
  })
  const [form, setForm] = useState(blankRecordForm)
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchRecords() {
      try {
        const payload = await apiRequest('/records', {
          token: session.token,
          params: {
            page: filters.page,
            pageSize: filters.pageSize,
            type: filters.type,
            category: filters.category,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            includeDeleted: filters.includeDeleted,
          },
        })

        if (!cancelled) {
          setRecords(payload.data)
          setPagination(payload.pagination)
          setError('')
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchRecords()

    return () => {
      cancelled = true
    }
  }, [
    session.token,
    reloadKey,
    filters.page,
    filters.pageSize,
    filters.type,
    filters.category,
    filters.dateFrom,
    filters.dateTo,
    filters.includeDeleted,
  ])

  function updateFilter(name, value) {
    setLoading(true)
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: name === 'page' ? value : 1,
    }))
  }

  function resetForm() {
    setEditingId('')
    setForm(blankRecordForm)
  }

  async function submitRecord(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const payload = await apiRequest(
        editingId ? `/records/${editingId}` : '/records',
        {
          method: editingId ? 'PUT' : 'POST',
          token: session.token,
          body: {
            ...form,
            amount: Number(form.amount),
          },
        },
      )

      setNotice(payload.message)
      resetForm()
      setReloadKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
      setLoading(false)
    }
  }

  function beginEdit(record) {
    setError('')
    setNotice(`Editing ${record.category} dated ${record.date}.`)
    setEditingId(record.id)
    setForm({
      amount: String(record.amount),
      type: record.type,
      category: record.category,
      date: record.date,
      notes: record.notes,
    })

    window.requestAnimationFrame(() => {
      recordFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  async function deleteRecord(id) {
    const confirmed = window.confirm(
      'Delete this record? It will be archived and removed from active reporting.',
    )

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')
    setLoading(true)

    try {
      const payload = await apiRequest(`/records/${id}`, {
        method: 'DELETE',
        token: session.token,
      })

      setNotice(payload.message)
      if (editingId === id) {
        resetForm()
      }
      setReloadKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Financial Records</p>
          <h2>Operational records workspace</h2>
        </div>
        <p className="header-copy">
          Search, review, and maintain financial records with server-side
          validation, filtering, and pagination.
        </p>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
      {notice ? <p className="success-banner">{notice}</p> : null}

      <section className="panel">
        <div className="panel-header">
          <h3>Filters</h3>
          <span>Refine the record set by type, category, date, and status</span>
        </div>
        <div className="filter-grid">
          <select
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value)}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input
            type="text"
            placeholder="Category"
            value={filters.category}
            onChange={(event) => updateFilter('category', event.target.value)}
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
          />
          {isAdmin ? (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={filters.includeDeleted}
                onChange={(event) =>
                  updateFilter('includeDeleted', event.target.checked)
                }
              />
              Include archived records
            </label>
          ) : null}
        </div>
      </section>

      {isAdmin ? (
        <form ref={recordFormRef} className="panel form-panel" onSubmit={submitRecord}>
          <div className="panel-header">
            <h3>{editingId ? 'Update record' : 'Create record'}</h3>
            <span>All changes are validated by the API before they are stored</span>
          </div>
          <div className="form-grid">
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
            />
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              type="text"
              placeholder="Category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            />
            <input
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
            />
            <textarea
              rows="3"
              placeholder="Notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>
          <div className="button-row">
            <button type="submit" className="primary-button">
              {editingId ? 'Save changes' : 'Create record'}
            </button>
            <button type="button" className="ghost-button" onClick={resetForm}>
              Reset form
            </button>
          </div>
        </form>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h3>Records</h3>
          <span>
            {loading
              ? 'Loading records...'
              : `${pagination.totalItems} matching records`}
          </span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Notes</th>
                <th>Status</th>
                {isAdmin ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.date)}</td>
                  <td>{record.category}</td>
                  <td className={`type-pill type-${record.type}`}>{record.type}</td>
                  <td>{formatCurrency(record.amount)}</td>
                  <td>{record.notes || '-'}</td>
                  <td>{record.deletedAt ? 'Archived' : 'Active'}</td>
                  {isAdmin ? (
                    <td className="action-cell">
                      <button
                        type="button"
                        className="ghost-button small-button"
                        disabled={Boolean(record.deletedAt)}
                        onClick={() => beginEdit(record)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost-button small-button danger-button"
                        disabled={Boolean(record.deletedAt)}
                        onClick={() => deleteRecord(record.id)}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-row">
          <button
            type="button"
            className="ghost-button"
            disabled={pagination.page <= 1}
            onClick={() => updateFilter('page', pagination.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="ghost-button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => updateFilter('page', pagination.page + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  )
}

function UsersPage({ session }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(blankUserForm)
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchUsers() {
      try {
        const payload = await apiRequest('/users', { token: session.token })

        if (!cancelled) {
          setUsers(payload.data)
          setError('')
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [session.token])

  function resetForm() {
    setEditingId('')
    setForm(blankUserForm)
  }

  function startEdit(user) {
    setEditingId(user.id)
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    })
  }

  async function submitUser(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const payload = await apiRequest(
        editingId ? `/users/${editingId}` : '/users',
        {
          method: editingId ? 'PUT' : 'POST',
          token: session.token,
          body: form,
        },
      )

      setNotice(
        payload.token
          ? `${payload.message} Generated token: ${payload.token}`
          : payload.message,
      )
      resetForm()
      const nextPayload = await apiRequest('/users', { token: session.token })
      setUsers(nextPayload.data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">User & Role Management</p>
          <h2>Access and account administration</h2>
        </div>
        <p className="header-copy">
          Manage workspace access, account status, and responsibility levels
          from a single administrative view.
        </p>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
      {notice ? <p className="success-banner">{notice}</p> : null}

      <section className="two-column">
        <form className="panel form-panel" onSubmit={submitUser}>
          <div className="panel-header">
            <h3>{editingId ? 'Update user' : 'Create user'}</h3>
            <span>Assign the appropriate access profile and account status</span>
          </div>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <select
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value }))
              }
            >
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="button-row">
            <button type="submit" className="primary-button">
              {editingId ? 'Save user' : 'Create user'}
            </button>
            <button type="button" className="ghost-button" onClick={resetForm}>
              Reset form
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-header">
            <h3>Current users</h3>
            <span>{loading ? 'Loading users...' : `${users.length} configured accounts`}</span>
          </div>
          <div className="list-stack">
            {users.map((user) => (
              <div key={user.id} className="list-row">
                <div>
                  <strong>{user.name}</strong>
                  <span>
                    {user.email} - {formatRole(user.role)} - {formatStatus(user.status)}
                  </span>
                </div>
                <button
                  type="button"
                  className="ghost-button small-button"
                  onClick={() => startEdit(user)}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  )
}

function ForbiddenPage() {
  return (
    <div className="screen-state">
      You do not have access to this area with the current account.
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ThemeToggle({ theme, onToggleTheme }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

export default App
