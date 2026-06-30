'use client'

import { useEffect } from 'react'
import type { Group, GroupsConfig } from '@/lib/groups'

interface Props {
  group: Group
  brand: GroupsConfig['brand']
}

const IconWA = () => (
  <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
)

const IconChat = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#4285F4">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
  </svg>
)

const IconArrow = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0 mt-0.5" style={{ transform: 'rotate(45deg)' }}>
    <path d="M7 17L17 7M17 7H7M17 7v10" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function WALanding({ group, brand }: Props) {
  useEffect(() => {
    // intento de apertura directa en app (igual que la página real de WA)
    const t = setTimeout(() => {
      window.location.href = group.link
    }, 500)
    return () => clearTimeout(t)
  }, [group.link])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F2F5' }}>

      {/* Banner in-app browser */}
      <div style={{ background: '#111B21' }} className="px-4 py-3 text-white text-sm">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-bold text-base leading-snug">
            Para unirte al grupo sigue 2 pasos:
          </p>
          <IconArrow />
        </div>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span
              className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 text-white"
              style={{ background: '#00A884' }}
            >
              1
            </span>
            <p className="text-[13px] leading-snug text-gray-200">
              Toca los{' '}
              <span className="inline-flex items-center bg-gray-600 px-1.5 py-0.5 rounded text-xs font-bold tracking-widest">
                ···
              </span>{' '}
              arriba a la derecha y elige{' '}
              <strong className="text-white">"Abrir en navegador"</strong> o{' '}
              <strong className="text-white">"Abrir en Safari"</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span
              className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 text-white"
              style={{ background: '#00A884' }}
            >
              2
            </span>
            <p className="text-[13px] leading-snug text-gray-200">
              Cuando cargue la página en Safari, toca el botón verde{' '}
              <span
                className="inline-flex items-center text-white text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#25D366' }}
              >
                Unirme al chat
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex items-start justify-center pt-8 px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm overflow-hidden">

          {/* Iconos superpuestos */}
          <div className="flex justify-center pt-10 pb-5">
            <div className="relative flex items-center">
              {/* Ícono WhatsApp */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center z-10"
                style={{ background: '#25D366' }}
              >
                <IconWA />
              </div>
              {/* Ícono chat azul */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-white -ml-3"
                style={{ background: '#E8F0FE' }}
              >
                <IconChat />
              </div>
            </div>
          </div>

          {/* Info del grupo */}
          <div className="px-6 pb-6 text-center">
            <h1 className="text-[22px] font-extrabold text-black leading-tight mb-1">
              {group.name}
            </h1>
            <p className="text-gray-500 text-sm mb-7">
              {group.subtitle ?? 'Invitación a grupo de WhatsApp'}
            </p>

            {/* Botón principal */}
            <a
              href={group.link}
              className="block w-full font-semibold py-3.5 rounded-lg text-center text-base text-white transition-opacity active:opacity-80"
              style={{ background: '#25D366' }}
            >
              Unirme al chat
            </a>

            {/* Divisor */}
            <div className="border-t border-gray-100 my-6" />

            {/* Fallback link */}
            <p className="text-gray-400 text-xs mb-2.5">
              Si no se abre automáticamente,
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-left">
              <p className="text-xs text-gray-500 font-mono break-all leading-relaxed">
                {group.link}
              </p>
            </div>
          </div>

          {/* Footer marca */}
          <div className="bg-gray-50 border-t border-gray-100 py-3 text-center">
            <p className="text-gray-400 text-xs">
              {brand.name} · {brand.tagline}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
