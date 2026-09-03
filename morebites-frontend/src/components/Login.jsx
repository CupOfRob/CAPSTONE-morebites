import { useState } from 'react'
import { authApi, setSession } from '../api/client'
import logo from '../assets/logo.png'
import loginBg from '../assets/OVEN.webp'
import './Login.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@morebites.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setSession(data.token, data.user)
      onLogin?.(data.user)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" style={{ backgroundImage: `url(${loginBg})` }} />
      <div className="login-overlay" />

      <form className="login-card" onSubmit={handleSubmit}>
        <img src={logo} alt="Lynloves morebites Food Corner" className="login-logo" />

        <h1 className="login-title">Welcome back!</h1>
        <p className="login-subtitle">Sign in to manage your store</p>

        {error && <div className="login-error">{error}</div>}

        <label className="login-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="login-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
