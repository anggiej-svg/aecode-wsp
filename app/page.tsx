import { redirect } from 'next/navigation'
import { getAllGroups } from '@/lib/groups'

export default function Home() {
  const groups = getAllGroups()
  if (groups.length > 0) {
    redirect(`/${groups[0].slug}`)
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-wa-bg">
      <p className="text-gray-500 text-sm">No hay grupos configurados aún.</p>
    </div>
  )
}
