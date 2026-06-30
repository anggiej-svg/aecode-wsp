'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GroupsConfig, Group } from '@/lib/groups'

type EditingGroup = Group & { isNew?: boolean }

function emptyGroup(): EditingGroup {
  return { slug: '', name: '', link: '', subtitle: 'Invitación a grupo de WhatsApp', isNew: true }
}

export default function AdminPage() {
  const [config, setConfig] = useState<GroupsConfig | null>(null)
  const [editing, setEditing] = useState<EditingGroup | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const [jsonOpen, setJsonOpen] = useState(false)

  // Carga inicial: localStorage primero, luego datos embebidos del build
  useEffect(() => {
    const local = localStorage.getItem('aecode-wsp-config')
    if (local) {
      try {
        setConfig(JSON.parse(local))
        return
      } catch { /* ignorar */ }
    }
    // Fallback: datos del JSON embebido en el build
    import('@/data/groups.json').then((m) => setConfig(m.default as GroupsConfig))
  }, [])

  const persist = useCallback((cfg: GroupsConfig) => {
    setConfig(cfg)
    localStorage.setItem('aecode-wsp-config', JSON.stringify(cfg))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  function startEdit(idx: number) {
    if (!config) return
    setEditing({ ...config.groups[idx] })
    setEditIdx(idx)
  }

  function startAdd() {
    setEditing(emptyGroup())
    setEditIdx(null)
  }

  function cancelEdit() {
    setEditing(null)
    setEditIdx(null)
  }

  function saveEdit() {
    if (!config || !editing) return
    const groups = [...config.groups]
    const clean: Group = {
      slug: editing.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim(),
      name: editing.name.trim(),
      link: editing.link.trim(),
      subtitle: editing.subtitle?.trim() || 'Invitación a grupo de WhatsApp',
    }
    if (!clean.slug || !clean.name || !clean.link) {
      alert('Slug, nombre y link son obligatorios.')
      return
    }
    if (editIdx !== null) {
      groups[editIdx] = clean
    } else {
      if (groups.find((g) => g.slug === clean.slug)) {
        alert(`Ya existe un grupo con el slug "${clean.slug}".`)
        return
      }
      groups.push(clean)
    }
    persist({ ...config, groups })
    cancelEdit()
  }

  function deleteGroup(idx: number) {
    if (!config) return
    if (!confirm('¿Eliminar este grupo?')) return
    const groups = config.groups.filter((_, i) => i !== idx)
    persist({ ...config, groups })
  }

  function updateBrand(field: 'name' | 'tagline', val: string) {
    if (!config) return
    persist({ ...config, brand: { ...config.brand, [field]: val } })
  }

  function downloadJson() {
    if (!config) return
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'groups.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetToDeployed() {
    if (!confirm('¿Descartar cambios locales y recargar desde el deploy?')) return
    localStorage.removeItem('aecode-wsp-config')
    fetch('/api/groups')
      .then((r) => r.json())
      .then((data: GroupsConfig) => setConfig(data))
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5]">
        <p className="text-gray-400 text-sm">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-4 pb-16">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#25D366' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Panel de Grupos</h1>
              <p className="text-gray-400 text-xs">AECODE WhatsApp</p>
            </div>
            {saved && (
              <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#E6F9EE', color: '#25D366' }}>
                ✓ Guardado
              </span>
            )}
          </div>

          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
            <strong>ℹ️ Cómo funciona:</strong> Los cambios se guardan en este navegador. Para que sean <strong>permanentes</strong> en producción, descarga el JSON y reemplaza el archivo <code className="bg-amber-100 px-1 rounded">data/groups.json</code> en tu repositorio.
          </div>
        </div>

        {/* Marca */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">Marca / Footer</h2>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre de la marca</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                value={config.brand.name}
                onChange={(e) => updateBrand('name', e.target.value)}
                placeholder="AECODE"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tagline</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                value={config.brand.tagline}
                onChange={(e) => updateBrand('tagline', e.target.value)}
                placeholder="Educación online efectiva"
              />
            </div>
          </div>
        </div>

        {/* Lista de grupos */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Grupos ({config.groups.length})</h2>
            <button
              onClick={startAdd}
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-full"
              style={{ background: '#25D366' }}
            >
              + Agregar
            </button>
          </div>

          {config.groups.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Sin grupos aún. Agrega el primero.</p>
          )}

          <div className="divide-y divide-gray-100">
            {config.groups.map((g, i) => (
              <div key={g.slug} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        /{g.slug}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-snug">{g.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{g.link}</p>
                    <a
                      href={`/${g.slug}`}
                      target="_blank"
                      className="text-xs mt-1 inline-block"
                      style={{ color: '#25D366' }}
                    >
                      Ver página →
                    </a>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(i)}
                      className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteGroup(i)}
                      className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones finales */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
          <button
            onClick={downloadJson}
            className="w-full border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            ⬇ Descargar groups.json
          </button>
          <button
            onClick={() => setJsonOpen(!jsonOpen)}
            className="w-full border border-gray-200 text-gray-500 text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {jsonOpen ? 'Ocultar JSON' : 'Ver JSON actual'}
          </button>
          {jsonOpen && (
            <pre className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 overflow-auto max-h-60 whitespace-pre-wrap break-all">
              {JSON.stringify(config, null, 2)}
            </pre>
          )}
          <button
            onClick={resetToDeployed}
            className="w-full text-red-400 text-xs py-1.5 hover:text-red-600 transition-colors"
          >
            Descartar cambios locales
          </button>
        </div>

      </div>

      {/* Modal de edición */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-0" onClick={cancelEdit}>
          <div
            className="bg-white rounded-t-2xl w-full max-w-xl p-5 pb-8 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900 text-base mb-1">
              {editIdx !== null ? 'Editar grupo' : 'Nuevo grupo'}
            </h3>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Slug (URL) — solo letras, números y guiones
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-300">
                <span className="px-3 text-gray-400 text-sm bg-gray-50 border-r border-gray-200 py-2.5">/</span>
                <input
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 focus:outline-none"
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="bim, ia, revit…"
                  autoFocus={editIdx === null}
                  disabled={editIdx !== null}
                />
              </div>
              {editIdx !== null && (
                <p className="text-xs text-gray-400 mt-1">El slug no se puede cambiar (es la URL).</p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre del grupo</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="BIM PARA LA CONSTRUCCIÓN"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Link de WhatsApp</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                value={editing.link}
                onChange={(e) => setEditing({ ...editing, link: e.target.value })}
                placeholder="https://chat.whatsapp.com/…"
                inputMode="url"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Subtítulo (opcional)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                value={editing.subtitle ?? ''}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                placeholder="Invitación a grupo de WhatsApp"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={cancelEdit}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 text-white font-semibold py-3 rounded-xl text-sm"
                style={{ background: '#25D366' }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
