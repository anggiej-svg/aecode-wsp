export type Group = {
  slug: string
  name: string
  link: string
  subtitle?: string
}

export type GroupsConfig = {
  groups: Group[]
  brand: {
    name: string
    tagline: string
  }
}

export function getConfig(): GroupsConfig {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/data/groups.json') as GroupsConfig
}

export function getGroup(slug: string): Group | undefined {
  return getConfig().groups.find((g) => g.slug === slug)
}

export function getAllGroups(): Group[] {
  return getConfig().groups
}

export function getBrand() {
  return getConfig().brand
}
