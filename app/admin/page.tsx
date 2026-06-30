'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GroupsConfig, Group } from '@/lib/groups'

const GITHUB_OWNER = 'anggiej-svg'
const GITHUB_REPO = 'aecode-wsp'
const GROUPS_PATH = 'data/groups.json'

type Screen = 'setup' | 'login' | 'main'
type DeployStatus = 'idle' | 'deploying' | 'success' | 'error'
type EditingGroup = Group & { isNew?: boolean }

function emptyGroup(): EditingGroup {
  return { slug: '', name: '', link: '', subtitle: 'Invitación a grupo de WhatsApp', isNew: true }
}

async function hashPwd(pwd: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('aecode2026:' + pwd))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const IconWA = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
)

export default function AdminPage() {
  const [screen, setScreen] = useState<Screen>('login')
  const [config, setConfig] = useState<GroupsConfig | null>(null)
  const [editing, setEditing] = useState<EditingGroup | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle')
  const [deployMsg, setDeployMsg] = useState('')
  const [inputPwd, setInputPwd] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [siteBase, setSiteBase] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteBase(window.location.href.replace(/\/admin\/?.*$/, ''))
      const hash = localStorage.getItem('ac-admin-hash')
      setScreen(hash ? 'login' : 'setup')
    }
  }, [])

  const loadConfig = useCallback(async () => {
    // Intentar cargar desde GitHub primero (estado real del repo)
    const token = localStorage.getItem('ac-gh-token')
    if (token) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GROUPS_PATH}`,
          { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'AECODE-Admin' } }
        )
        if (res.ok) {
          const data = await res.json()
          const decoded = JSON.parse(atob(data.content.replace(/\n/g, '')))
          setConfig(decoded)
          localStorage.setItem('ac-config', JSON.stringify(decoded))
          return
        }
      } catch { /* ignorar */ }
    }
    // Fallback: localStorage o JSON del build
    const local = localStorage.getItem('ac-config')
    if (local) { try { setConfig(JSON.parse(local)); return } catch { /* ignorar */ } }
    import('@/data/groups.json').then(m => setConfig(m.default as GroupsConfig))
  }, [])

  async function handleSetup() {
    if (!inputPwd.trim() || !inputToken.trim()) {
      setLoginError('Ingresa contraseña y token de GitHub.')
      return
    }
    const hash = await hashPwd(inputPwd)
    localStorage.setItem('ac-admin-hash', hash)
    localStorage.setItem('ac-gh-token', inputToken.trim())
    setScreen('main')
    loadConfig()
  }

  async function handleLogin() {
    const saved = localStorage.getItem('ac-admin-hash')
    const hash = await hashPwd(inputPwd)
    if (hash !== saved) { setLoginError('Contraseña incorrecta.'); return }
    setScreen('main')
    loadConfig()
  }

  const persist = useCallback((cfg: GroupsConfig) => {
    setConfig(cfg)
    localStorage.setItem('ac-config', JSON.stringify(cfg))
  }, [])

  async function publishToGitHub(cfg: GroupsConfig) {
    const token = localStorage.getItem('ac-gh-token')
    if (!token) { setDeployStatus('error'); setDeployMsg('No hay token. Ve a Configuración.'); return }
    setDeployStatus('deploying')
    setDeployMsg('Subiendo cambios a GitHub...')
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'AECODE-Admin',
        'Content-Type': 'application/json',
      }
      const fileRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GROUPS_PATH}`,
        { headers }
      )
      const fileData = await fileRes.json()
      if (!fileRes.ok) throw new Error(fileData.message)
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(cfg, null, 2))))
      const updateRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GROUPS_PATH}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ message: 'Update groups via admin panel', content, sha: fileData.sha }),
        }
      )
      if (!updateRes.ok) { const e = await updateRes.json(); throw new Error(e.message) }
      setDeployStatus('success')
      setDeployMsg('¡Publicado! Redesplegando en GitHub... (~2 min)')
      setTimeout(() => setDeployStatus('idle'), 10000)
    } catch (err) {
      setDeployStatus('error')
      setDeployMsg(`Error: ${err instanceof Error ? err.message : 'Desconocido'}`)
    }
  }

  function startEdit(idx: number) {
    if (!config) return
    setEditing({ ...config.groups[idx] })
    setEditIdx(idx)
  }

  function cancelEdit() { setEditing(null); setEditIdx(null) }

  function saveEdit() {
    if (!config || !editing) return
    const clean: Group = {
      slug: editing.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim(),
      name: editing.name.trim(),
      link: editing.link.trim(),
      subtitle: editing.subtitle?.trim() || 'Invitación a grupo de WhatsApp',
    }
    if (!clean.slug || !clean.name || !clean.link) { alert('Todos los campos son obligatorios.'); return }
    const groups = [...config.groups]
    if (editIdx === null) {
      if (groups.find(g => g.slug === clean.slug)) { alert(`Ya existe "/${clean.slug}".`); return }
      groups.push(clean)
    } else {
      groups[editIdx] = clean
    }
    persist({ ...config, groups })
    cancelEdit()
  }

  function deleteGroup(idx: number) {
    if (!config || !confirm('¿Eliminar este grupo?')) return
    persist({ ...config, groups: config.groups.filter((_, i) => i !== idx) })
  }

  // ── SETUP ──
  if (screen === 'setup') return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#25D366' }}><IconWA /></div>
          <h1 className="font-bold text-gray-900 text-lg">Primera configuración</h1>
          <p className="text-gray-400 text-sm mt-1">Solo se hace una vez por dispositivo</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Contraseña del panel</label>
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={inputPwd} onChange={e => setInputPwd(e.target.value)} placeholder="Elige una contraseña" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Token de GitHub (ghp_...)</label>
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={inputToken} onChange={e => setInputToken(e.target.value)} placeholder="ghp_..." />
          <p className="text-xs text-gray-400 mt-1">Queda guardado solo en este navegador</p>
        </div>
        {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
        <button onClick={handleSetup} className="w-full text-white font-semibold py-3 rounded-xl text-sm" style={{ background: '#25D366' }}>Configurar</button>
      </div>
    </div>
  )

  // ── LOGIN ──
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
        <button onClick={handleLogin} className="w-full text-white font-semibold py-3 rounded-xl text-sm" style={{ background: '#25D366' }}>Entrar</button>
      </div>
    </div>
  )

  // ── CARGANDO ──
  if (!config) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5]">
      <p className="text-gray-400 text-sm">Cargando grupos...</p>
    </div>
  )

  // ── PANEL PRINCIPAL ──
  return (
    <div className="min-h-screen bg-[#F0F2F5] p-4 pb-16">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#25D366' }}><IconWA /></div>
            <div className="flex-1">
              <h1 className="font-bold text-gray-900 text-base">Panel de Grupos</h1>
              <p className="text-gray-400 text-xs">AECODE WhatsApp</p>
            </div>
            <button onClick={() => setShowSettings(s => !s)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">⚙</button>
            <button onClick={() => { setScreen('login'); setInputPwd('') }} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">Salir</button>
          </div>

          {showSettings && (
            <div className="mt-4 border-t pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 mb-2">Configuración</p>
              <button onClick={async () => {
                const p = prompt('Nueva contraseña:')
                if (!p) return
                localStorage.setItem('ac-admin-hash', await hashPwd(p))
                alert('Contraseña actualizada.')
              }} className="w-full text-left text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
                Cambiar contraseña del panel
              </button>
              <button onClick={() => {
                const t = prompt('Nuevo token de GitHub (ghp_...):')
                if (!t) return
                localStorage.setItem('ac-gh-token', t)
                alert('Token actualizado.')
              }} className="w-full text-left text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
                Cambiar token de GitHub
              </button>
              <button onClick={() => {
                localStorage.removeItem('ac-admin-hash')
                localStorage.removeItem('ac-gh-token')
                localStorage.removeItem('ac-config')
                setScreen('setup')
              }} className="w-full text-left text-xs text-red-400 border border-red-100 px-3 py-2 rounded-lg hover:bg-red-50">
                Resetear configuración
              </button>
            </div>
          )}
        </div>

        {/* Estado del deploy */}
        {deployStatus !== 'idle' && (
          <div className={`rounded-2xl p-4 text-sm font-medium ${
            deployStatus === 'deploying' ? 'bg-blue-50 text-blue-700' :
            deployStatus === 'success'   ? 'bg-green-50 text-green-700' :
                                           'bg-red-50 text-red-600'
          }`}>
            {deployStatus === 'deploying' && '⏳ '}
            {deployStatus === 'success'   && '✓ '}
            {deployStatus === 'error'     && '✕ '}
            {deployMsg}
          </div>
        )}

        {/* Marca */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">Marca / Footer</h2>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={config.brand.name} onChange={e => persist({ ...config, brand: { ...config.brand, name: e.target.value } })} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tagline</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" value={config.brand.tagline} onChange={e => persist({ ...config, brand: { ...config.brand, tagline: e.target.value } })} />
            </div>
          </div>
        </div>

        {/* Grupos */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Grupos ({config.groups.length})</h2>
            <button onClick={() => { setEditing(emptyGroup()); setEditIdx(null) }} className="text-xs font-semibold text-white px-3 py-1.5 rounded-full" style={{ background: '#25D366' }}>+ Agregar</button>
          </div>
          {config.groups.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Sin grupos. Agrega el primero.</p>}
          <div className="divide-y divide-gray-100">
            {config.groups.map((g, i) => (
              <div key={g.slug} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">/{g.slug}</span>
                    <p className="font-bold text-gray-900 text-sm mt-1 leading-snug">{g.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{g.link}</p>
                    <a href={`${siteBase}/${g.slug}/`} target="_blank" rel="noreferrer" className="text-xs mt-1 inline-block" style={{ color: '#25D366' }}>
                      Ver página →
                    </a>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 mt-1">
                    <button onClick={() => startEdit(i)} className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg">Editar</button>
                    <button onClick={() => deleteGroup(i)} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botón publicar */}
        <button
          onClick={() => publishToGitHub(config)}
          disabled={deployStatus === 'deploying'}
          className="w-full text-white font-bold py-4 rounded-2xl text-base shadow-sm disabled:opacity-60"
          style={{ background: '#25D366' }}
        >
          {deployStatus === 'deploying' ? '⏳ Publicando...' : '🚀 Publicar cambios'}
        </button>
        <p className="text-center text-xs text-gray-400 pb-4">
          Al publicar, GitHub redespliega automáticamente en ~2 min
        </p>
      </div>

      {/* Modal edición */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={cancelEdit}>
          <div className="bg-white rounded-t-2xl w-full max-w-xl p-5 pb-8 space-y-3 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-base">{editIdx !== null ? 'Editar grupo' : 'Nuevo grupo'}</h3>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Slug (parte de la URL)</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-300">
                <span className="px-3 text-gray-400 text-sm bg-gray-50 border-r border-gray-200 py-2.5">/</span>
                <input className="flex-1 px-3 py-2.5 text-sm focus:outline-none" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="bim, ia, summit..." autoFocus disabled={editIdx !== null} />
              </div>
              {editIdx !== null && <p className="text-xs text-gray-400 mt-1">El slug no se puede cambiar.</p>}
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
              <button onClick={cancelEdit} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 text-white font-semibold py-3 rounded-xl text-sm" style={{ background: '#25D366' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
