export const dynamic = 'force-static'

import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/groups'

export function GET() {
  return NextResponse.json(getConfig())
}
