import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { apiRequest } from './api'
import './App.css'

const demoAccounts = [
  {
    role: 'Admin',
    email: 'admin@finboard.local',
    detail: 'Full access to users, records, and summaries',
  },
  {
    role: 'Analyst',
    email: 'analyst@finboard.local',
    detail: 'Can inspect records and analytics but cannot edit data',
  },
  {
    role: 'Viewer',
    email: 'viewer@finboard.local',
    detail: 'Can only access dashboard-level summary information',
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

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

function formatMonth(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}-01`))
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function App() {
  const [session, setSession] = useState(() => {
    const saved = window.localStorage.getItem('finance-session')
    return saved ? JSON.parse(saved) : { token: '', user: null }
  })
  const [authLoading, setAuthLoading] = useState(() => Boolean(session.token))

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
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route element={<ProtectedRoute session={session} />}>
          <Route
            element={<AppShell session={session} onLogout={handleLogout} />}
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

function AppShell({ session, onLogout }) {
  const location = useLocation()

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
          <p className="eyebrow">Finance Assignment</p>
          <h1>Control Center</h1>
          <p className="sidebar-copy">
            Role-based access, summaries, validation, and persisted finance
            records in one submission.
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
          <p className="profile-role">{session.user.role}</p>
          <strong>{session.user.name}</strong>
          <span>{session.user.email}</span>
          <span className="status-pill">{session.user.status}</span>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Sign out
          </button>
        </div>

        <div className="path-hint">{location.pathname}</div>
      </aside>

      <main className="content-panel">
        <Outlet />
      </main>
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [loadingEmail, setLoadingEmail] = useState('')
  const [error, setError] = useState('')

  async function startDemoSession(email) {
    setLoadingEmail(email)
    setError('')

    try {
      await onLogin(email)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingEmail('')
    }
  }

  return (
    <div className="login-screen">
      <section className="login-hero">
        <p className="eyebrow">Finance Dashboard Backend</p>
        <h1>Backend assignment, presented through a routed dashboard.</h1>
        <p className="lead-copy">
          Pick a seeded account to see how the backend changes behavior by role.
          The UI uses <code>react-router-dom</code>, while the API enforces the
          real access checks.
        </p>
        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      <section className="account-grid">
        {demoAccounts.map((account) => (
          <article key={account.email} className="account-card">
            <p className="account-role">{account.role}</p>
            <h2>{account.email}</h2>
            <p>{account.detail}</p>
            <button
              type="button"
              className="primary-button"
              disabled={loadingEmail === account.email}
              onClick={() => startDemoSession(account.email)}
            >
              {loadingEmail === account.email ? 'Signing in...' : 'Use account'}
            </button>
          </article>
        ))}
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
      <section className="page-header">
        <div>
          <p className="eyebrow">Dashboard Summary APIs</p>
          <h2>At-a-glance financial performance</h2>
        </div>
        <p className="header-copy">
          This view is available to every active role, but the backend still
          controls what each user can do beyond summaries.
        </p>
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
            <h3>Category-wise totals</h3>
            <span>Income minus expenses by bucket</span>
          </div>
          <div className="list-stack">
            {summary.categoryTotals.map((item) => (
              <div key={item.category} className="list-row">
                <div>
                  <strong>{item.category}</strong>
                  <span>
                    In {formatCurrency(item.income)} / Out{' '}
                    {formatCurrency(item.expenses)}
                  </span>
                </div>
                <strong>{formatCurrency(item.total)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Monthly trend</h3>
            <span>Simple aggregated series for a dashboard chart feed</span>
          </div>
          <div className="list-stack">
            {summary.monthlyTrends.map((item) => (
              <div key={item.month} className="list-row">
                <div>
                  <strong>{formatMonth(item.month)}</strong>
                  <span>
                    Income {formatCurrency(item.income)} / Expense{' '}
                    {formatCurrency(item.expenses)}
                  </span>
                </div>
                <strong>{formatCurrency(item.net)}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="panel">
        <div className="panel-header">
          <h3>Recent activity</h3>
          <span>Most recent non-deleted records</span>
        </div>
        <div className="list-stack">
          {summary.recentActivity.map((record) => (
            <div key={record.id} className="list-row">
              <div>
                <strong>{record.category}</strong>
                <span>
                  {record.type} on {formatDate(record.date)}
                </span>
              </div>
              <strong>{formatCurrency(record.amount)}</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function RecordsPage({ session }) {
  const isAdmin = hasPermission(session.user, 'records:write')
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
    setEditingId(record.id)
    setForm({
      amount: String(record.amount),
      type: record.type,
      category: record.category,
      date: record.date,
      notes: record.notes,
    })
  }

  async function deleteRecord(id) {
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
          <h2>Filtered record access with backend pagination</h2>
        </div>
        <p className="header-copy">
          Analysts can read this data. Admins can create, update, and soft
          delete records.
        </p>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
      {notice ? <p className="success-banner">{notice}</p> : null}

      <section className="panel">
        <div className="panel-header">
          <h3>Filters</h3>
          <span>Type, category, date range, and paging</span>
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
              Include soft-deleted
            </label>
          ) : null}
        </div>
      </section>

      {isAdmin ? (
        <form className="panel form-panel" onSubmit={submitRecord}>
          <div className="panel-header">
            <h3>{editingId ? 'Update record' : 'Create record'}</h3>
            <span>Validation happens on the backend before persistence</span>
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
              Clear
            </button>
          </div>
        </form>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h3>Records</h3>
          <span>
            {loading
              ? 'Fetching records...'
              : `${pagination.totalItems} matching entries`}
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
                  <td>{record.deletedAt ? 'Soft-deleted' : 'Active'}</td>
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
          <h2>Admin-only role assignment and account status</h2>
        </div>
        <p className="header-copy">
          This is where the access model is managed. New users receive a mock
          token so the system stays easy to demo locally.
        </p>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
      {notice ? <p className="success-banner">{notice}</p> : null}

      <section className="two-column">
        <form className="panel form-panel" onSubmit={submitUser}>
          <div className="panel-header">
            <h3>{editingId ? 'Update user' : 'Create user'}</h3>
            <span>Roles: viewer, analyst, admin</span>
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
              Clear
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
                    {user.email} · {user.role} · {user.status}
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
      This role does not have access to the requested route.
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

export default App
