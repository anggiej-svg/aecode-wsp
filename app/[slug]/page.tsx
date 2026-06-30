import { notFound } from 'next/navigation'
import { getGroup, getBrand, getAllGroups } from '@/lib/groups'
import WALanding from '@/components/WALanding'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllGroups().map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const group = getGroup(slug)
  if (!group) return {}
  return {
    title: `${group.name} — AECODE`,
    description: group.subtitle ?? 'Únete al grupo de WhatsApp',
    openGraph: {
      title: group.name,
      description: 'Invitación a grupo de WhatsApp',
    },
  }
}

export default async function GroupPage({ params }: Props) {
  const { slug } = await params
  const group = getGroup(slug)
  if (!group) notFound()
  const brand = getBrand()
  return <WALanding group={group} brand={brand} />
}
