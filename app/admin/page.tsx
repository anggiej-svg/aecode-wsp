'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GroupsConfig, Group } from '@/lib/groups'

const GH_OWNER = 'anggiej-svg'
const GH_REPO = 'aecode-wsp'
const GROUPS_PATH = 'data/groups.json'
const ACCESS_PATH = 'data/access.json'

// ── Crypto: el token se cifra con la contraseña (AES-256-GCM + PBKDF2) ──

async function deriveKey(password: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('aecode-admin-2026'), iterations: 120000, hash: 'SHA-256' },
    raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

async function encryptToken(token: string, password: string) {
  const key = await deriveKey(password)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token))
  return {
    ct: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

async function decryptToken(ct: string, iv: string, password: string): Promise<string> {
  const key = await deriveKey(password)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)) },
    key,
    Uint8Array.from(atob(ct), c => c.charCodeAt(0))
  )
  return new TextDecoder().decode(decrypted)
}

// ── Types ──

type Screen = 'checking' | 'setup' | 'login' | 'main'
type DeployStatus = 'idle' | 'deploying' | 'success' | 'error'
type EditingGroup = Group & { isNew?: boolean }
type AccessData = { ct: string; iv: string }

let sessionToken: string | null = null  // en memoria, no persiste entre sesiones

export default function AdminPage() {
  const [screen, setScreen] = useState<Screen>('checking')
  const [config, setConfig] = useState<GroupsConfig | null>(null)
  const [editing, setEditing] = useState<EditingGroup | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle')
  const [deployMsg, setDeployMsg] = useState('')
  const [inputPwd, setInputPwd] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [loginError, setLoginError] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [siteBase, setSiteBase] = useState('')
  const [accessData, setAccessData] = useState<AccessData | null>(null)

  // Al cargar: verificar si access.json existe en el repo
  useEffect(() => {
    setSiteBase(typeof window !== 'undefined' ? window.location.href.replace(/\/admin\/?.*$/, '') : '')
    fetch(`https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${ACCESS_PATH}?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: AccessData | null) => {
        if (data?.ct && data?.iv) { setAccessData(data); setScreen('login') }
        else setScreen('setup')
      })
      .catch(() => setScreen('setup'))
  }, [])

  const loadConfig = useCallback(async (token: string) => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GROUPS_PATH}`,
        { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'AECODE-Admin' } }
      )
      if (res.ok) {
        const d = await res.json()
        setConfig(JSON.parse(atob(d.content.replace(/\n/g, ''))))
        return
      }
    } catch { /* ignorar */ }
    import('@/data/groups.json').then(m => setConfig(m.default as GroupsConfig))
  }, [])

  async function ghCommit(token: string, path: string, content: string) {
    const h = { Authorization: `Bearer ${token}`, 'User-Agent': 'AECODE-Admin', 'Content-Type': 'application/json' }
    const current = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, { headers: h })
    const sha = current.ok ? (await current.json()).sha : undefined
    const body: Record<string, string> = { message: `Update ${path}`, content: btoa(unescape(encodeURIComponent(content))) }
    if (sha) body.sha = sha
    const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, { method: 'PUT', headers: h, body: JSON.stringify(body) })
    if (!res.ok) { const e = await res.json(); throw new Error(e.message) }
  }

  // ── Setup: solo lo hace el admin una vez ──
  async function handleSetup() {
    if (!inputPwd.trim() || !inputToken.trim()) { setLoginError('Ingresa contraseña y token de GitHub.'); return }
    setSetupLoading(true); setLoginError('')
    try {
      const encrypted = await encryptToken(inputToken.trim(), inputPwd.trim())
      await ghCommit(inputToken.trim(), ACCESS_PATH, JSON.stringify(encrypted, null, 2))
      setAccessData(encrypted)
      sessionToken = inputToken.trim()
      setScreen('main')
      loadConfig(inputToken.trim())
    } catch (err) {
      setLoginError(`Error: ${err instanceof Error ? err.message : 'Verifica tu token'}`)
    } finally { setSetupLoading(false) }
  }

  // ── Login: solo necesita contraseña ──
  async function handleLogin() {
    if (!accessData) return
    try {
      const token = await decryptToken(accessData.ct, accessData.iv, inputPwd.trim())
      sessionToken = token
      setScreen('main')
      setLoginError('')
      loadConfig(token)
    } catch { setLoginError('Contraseña incorrecta.') }
  }

  const persist = useCallback((cfg: GroupsConfig) => setConfig(cfg), [])

  async function publishToGitHub(cfg: GroupsConfig) {
    if (!sessionToken) { setDeployStatus('error'); setDeployMsg('Sesión expirada. Vuelve a entrar.'); return }
    setDeployStatus('deploying'); setDeployMsg('Publicando en GitHub...')
    try {
      await ghCommit(sessionToken, GROUPS_PATH, JSON.stringify(cfg, null, 2))
      setDeployStatus('success'); setDeployMsg('¡Publicado! Redesplegando en ~2 minutos...')
      setTimeout(() => setDeployStatus('idle'), 10000)
    } catch (err) {
      setDeployStatus('error'); setDeployMsg(`Error: ${err instanceof Error ? err.message : 'Desconocido'}`)
    }
  }

  function saveEdit() {
    if (!config || !editing) return
    const clean: Group = {
      slug: editing.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim(),
      name: editing.name.trim(), link: editing.link.trim(),
      subtitle: editing.subtitle?.trim() || 'Invitación a grupo de WhatsApp',
    }
    if (!clean.slug || !clean.name || !clean.link) { alert('Todos los campos son obligatorios.'); return }
    const groups = [...config.groups]
    if (editIdx === null) {
      if (groups.find(g => g.slug === clean.slug)) { alert(`Ya existe "/${clean.slug}".`); return }
      groups.push(clean)
    } else { groups[editIdx] = clean }
    persist({ ...config, groups }); setEditing(null); setEditIdx(null)
  }

  const IconWA = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )

  const GreenBtn = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} className="w-full text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60" style={{ background: '#25D366' }}>{children}</button>
  )

  // ── CHECKING ──
  if (screen === 'checking') return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5]">
      <p className="text-gray-400 text-sm">Verificando...</p>
    </div>
  )

  // ── SETUP (admin, una sola vez) ──
  if (screen === 'setup') return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#25D366' }}><IconWA /></div>
          <h1 className="font-bold text-gray-900 text-lg">Configurar panel</h1>
          <p className="text-gray-400 text-xs mt-1">Solo tú haces esto — una vez</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Contraseña (la que compartes con tu equipo)</label>
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={inputPwd} onChange={e => setInputPwd(e.target.value)} placeholder="Elige una contraseña" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Token de GitHub</label>
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={inputToken} onChange={e => setInputToken(e.target.value)} placeholder="ghp_..." />
          <p className="text-xs text-gray-400 mt-1">Se cifra con tu contraseña. Tus compañeras nunca lo verán.</p>
        </div>
        {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
        <GreenBtn onClick={handleSetup} disabled={setupLoading}>{setupLoading ? 'Guardando...' : 'Configurar y guardar'}</GreenBtn>
      </div>
    </div>
  )

  // ── LOGIN (todos — solo contraseña) ──
  if (screen === 'login') return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#25D366' }}><IconWA /></div>
          <h1 className="font-bold text-gray-900 text-lg">Panel AECODE</h1>
          <p className="text-gray-400 text-sm mt-1">Grupos de WhatsApp</p>
        </div>
        <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={inputPwd} onChange={e => setInputPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Contraseña" autoFocus />
        {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
        <GreenBtn onClick={handleLogin}>Entrar</GreenBtn>
      </div>
    </div>
  )

  if (!config) return <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5]"><p className="text-gray-400 text-sm">Cargando...</p></div>

  // ── PANEL PRINCIPAL ──
  return (
    <div className="min-h-screen bg-[#F0F2F5] p-4 pb-16">
      <div className="max-w-xl mx-auto space-y-4">

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#25D366' }}><IconWA /></div>
            <div className="flex-1">
              <h1 className="font-bold text-gray-900 text-base">Panel de Grupos</h1>
              <p className="text-gray-400 text-xs">AECODE WhatsApp</p>
            </div>
            <button onClick={() => setShowSettings(s => !s)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">⚙</button>
            <button onClick={() => { sessionToken = null; setScreen('login'); setInputPwd('') }} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">Salir</button>
          </div>
          {showSettings && (
            <div className="mt-4 border-t pt-4">
              <button onClick={() => { if (!confirm('¿Reconfigurar? Tendrás que volver a ingresar el token.')) return; sessionToken = null; setAccessData(null); setScreen('setup') }}
                className="w-full text-left text-xs text-red-400 border border-red-100 px-3 py-2 rounded-lg hover:bg-red-50">
                Reconfigurar token y contraseña
              </button>
            </div>
          )}
        </div>

        {deployStatus !== 'idle' && (
          <div className={`rounded-2xl p-4 text-sm font-medium ${deployStatus === 'deploying' ? 'bg-blue-50 text-blue-700' : deployStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {deployStatus === 'deploying' ? '⏳ ' : deployStatus === 'success' ? '✓ ' : '✕ '}{deployMsg}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">Marca / Footer</h2>
          <div className="space-y-2">
            {(['name', 'tagline'] as const).map(f => (
              <div key={f}>
                <label className="text-xs text-gray-400 mb-1 block capitalize">{f === 'name' ? 'Nombre' : 'Tagline'}</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={config.brand[f]} onChange={e => persist({ ...config, brand: { ...config.brand, [f]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Grupos ({config.groups.length})</h2>
            <button onClick={() => { setEditing({ slug: '', name: '', link: '', subtitle: 'Invitación a grupo de WhatsApp', isNew: true }); setEditIdx(null) }}
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-full" style={{ background: '#25D366' }}>+ Agregar</button>
          </div>
          {config.groups.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Sin grupos aún.</p>}
          <div className="divide-y divide-gray-100">
            {config.groups.map((g, i) => (
              <div key={g.slug} className="px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">/{g.slug}</span>
                  <p className="font-bold text-gray-900 text-sm mt-1">{g.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{g.link}</p>
                  <a href={`${siteBase}/${g.slug}/`} target="_blank" rel="noreferrer" className="text-xs mt-1 inline-block" style={{ color: '#25D366' }}>Ver página →</a>
                </div>
                <div className="flex gap-2 flex-shrink-0 mt-1">
                  <button onClick={() => { setEditing({ ...config.groups[i] }); setEditIdx(i) }} className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg">Editar</button>
                  <button onClick={() => { if (!confirm('¿Eliminar?')) return; persist({ ...config, groups: config.groups.filter((_, j) => j !== i) }) }} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => publishToGitHub(config)} disabled={deployStatus === 'deploying'}
          className="w-full text-white font-bold py-4 rounded-2xl text-base shadow-sm disabled:opacity-60" style={{ background: '#25D366' }}>
          {deployStatus === 'deploying' ? '⏳ Publicando...' : '🚀 Publicar cambios'}
        </button>
        <p className="text-center text-xs text-gray-400 pb-4">GitHub redespliega en ~2 min</p>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => { setEditing(null); setEditIdx(null) }}>
          <div className="bg-white rounded-t-2xl w-full max-w-xl p-5 pb-8 space-y-3 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-base">{editIdx !== null ? 'Editar grupo' : 'Nuevo grupo'}</h3>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Slug (URL)</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-300">
                <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2.5">/</span>
                <input className="flex-1 px-3 py-2.5 text-sm focus:outline-none" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="bim, ia, summit..." autoFocus disabled={editIdx !== null} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre del grupo</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="BIM PARA LA CONSTRUCCIÓN" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Link de WhatsApp</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={editing.link} onChange={e => setEditing({ ...editing, link: e.target.value })} placeholder="https://chat.whatsapp.com/..." inputMode="url" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setEditing(null); setEditIdx(null) }} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 text-white font-semibold py-3 rounded-xl text-sm" style={{ background: '#25D366' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
