export type Locale = 'es' | 'en' | 'pt-BR'
export type Book = { id: string; title: string; author: string; isbn: string; format: string; status: string; year: number; category: string }
export const books: Book[] = [
  { id: 'cien-anos', title: 'Cien años de soledad', author: 'Gabriel García Márquez', isbn: '978-0307474728', format: 'Print', status: 'Available', year: 1967, category: 'Fiction' },
  { id: 'overstory', title: 'The Overstory', author: 'Richard Powers', isbn: '978-0393356687', format: 'Print', status: 'On loan', year: 2018, category: 'Fiction' },
  { id: 'dispossessed', title: 'The Dispossessed', author: 'Ursula K. Le Guin', isbn: '978-0061054884', format: 'Print', status: 'Available', year: 1974, category: 'Science fiction' },
  { id: 'pachinko', title: 'Pachinko', author: 'Min Jin Lee', isbn: '978-1455563937', format: 'Print', status: 'On loan', year: 2017, category: 'Historical fiction' },
]
export const members = [
  { id: 'MBR-10482', name: 'Sofia Alvarez', email: 'sofia.alvarez@example.com', type: 'Student', loans: 3, status: 'Active' },
  { id: 'MBR-10483', name: 'Mateo Silva', email: 'mateo.silva@example.com', type: 'Faculty', loans: 1, status: 'Active' },
  { id: 'MBR-10484', name: 'Ana Costa', email: 'ana.costa@example.com', type: 'Community', loans: 0, status: 'Active' },
]
export const navItems = [
  { label: 'Overview', href: '/dashboard' }, { label: 'Circulation', href: '/circulation' }, { label: 'Catalog', href: '/catalog' }, { label: 'Members', href: '/members' }, { label: 'Acquisitions', href: '/acquisitions' }, { label: 'Serials', href: '/serials' }, { label: 'Digital Library', href: '/digital' }, { label: 'Inventory', href: '/catalog/inventory' }, { label: 'Reports', href: '/reports' }, { label: 'Analytics', href: '/analytics' }, { label: 'Integrations', href: '/integrations' }, { label: 'Audit', href: '/audit' }, { label: 'Settings', href: '/settings' },
]
export const messages = {
  en: { search: 'Search books, members, authors, ISBN...', welcome: 'Good morning, Maya', overview: 'Overview', open: 'Open', viewAll: 'View all', catalog: 'Catalog', members: 'Members', circulation: 'Circulation', settings: 'Settings', language: 'Language', available: 'Available' },
  es: { search: 'Buscar libros, miembros, autores, ISBN...', welcome: 'Buenos días, Maya', overview: 'Resumen', open: 'Abrir', viewAll: 'Ver todo', catalog: 'Catálogo', members: 'Miembros', circulation: 'Circulación', settings: 'Configuración', language: 'Idioma', available: 'Disponible' },
  'pt-BR': { search: 'Buscar livros, membros, autores, ISBN...', welcome: 'Bom dia, Maya', overview: 'Visão geral', open: 'Abrir', viewAll: 'Ver tudo', catalog: 'Catálogo', members: 'Membros', circulation: 'Circulação', settings: 'Configurações', language: 'Idioma', available: 'Disponível' },
} as const
export const t = (locale: Locale, key: keyof typeof messages.en) => messages[locale][key]
export const routeTitle = (pathname: string) => navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? 'Workspace'
export const formatNumber = (value: number, locale: Locale) => new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : locale).format(value)
export type Permission = 'catalog.read' | 'catalog.write' | 'members.read' | 'circulation.write' | 'settings.read'
export const rolePermissions: Record<string, Permission[]> = { Administrator: ['catalog.read','catalog.write','members.read','circulation.write','settings.read'], Librarian: ['catalog.read','catalog.write','members.read','circulation.write'], Assistant: ['catalog.read','members.read','circulation.write'] }
export type AuditEvent = { id: string; action: string; actor: string; createdAt: string }
export const auditEvents: AuditEvent[] = [{ id: 'AUD-3001', action: 'Bibliographic record updated', actor: 'Maya Chen', createdAt: 'Today, 09:42' }, { id: 'AUD-3000', action: 'Loan registered', actor: 'Liam Okafor', createdAt: 'Today, 09:28' }]
export const repositories = { books: { list: () => books, find: (id: string) => books.find((book) => book.id === id) } }

export function getLocale(): Locale { return 'en' }
export function setLocale(locale: Locale) { return locale }

export function getRouteStatus(pathname: string) { return pathname ? 'ready' : 'loading' }

export function can(role: string, permission: Permission) { return rolePermissions[role]?.includes(permission) ?? false }

export const routeGroups = {
  circulation: ['/circulation/loans','/circulation/returns','/circulation/renewals','/circulation/holds','/circulation/transfers'],
  catalog: ['/catalog/records','/catalog/items','/catalog/authorities','/catalog/collections','/catalog/inventory'],
  settings: ['/settings/general','/settings/libraries','/settings/branches','/settings/circulation','/settings/cataloging','/settings/security','/settings/notifications','/settings/languages','/settings/roles','/settings/permissions'],
}

export function searchBooks(query: string) { const q = query.toLowerCase(); return books.filter((book) => [book.title, book.author, book.isbn, book.category].some((value) => value.toLowerCase().includes(q))) }

export const routeDescriptions: Record<string, string> = { '/circulation': 'Manage loans, returns, renewals, holds, and transfers.', '/catalog': 'Search and manage the shared bibliographic catalog.', '/members': 'Manage member profiles, categories, and borrowing activity.', '/acquisitions': 'Track suggestions, orders, vendors, and budgets.', '/serials': 'Manage subscriptions and serial issues.', '/digital': 'Organize digital resources and access rights.', '/reports': 'Build operational reports for your library.', '/analytics': 'Understand collection and circulation performance.', '/integrations': 'Connect discovery, identity, and library services.', '/audit': 'Review a transparent history of staff actions.', '/settings': 'Configure your library workspace and permissions.' }

export const publicNav = [{ label: 'Discover', href: '/opac' }, { label: 'Search catalog', href: '/opac/search' }, { label: 'My account', href: '/account' }]

export const emptyMessage = 'No records match your current filters.'
export const errorMessage = 'This workspace could not load the requested data.'
export const permissionMessage = 'You do not have permission to view this workspace.'
export const offlineMessage = 'Offline mode: changes will sync when your connection returns.'
export const syncMessage = 'All changes synced just now.'

export const languages: { code: Locale; label: string }[] = [{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }, { code: 'pt-BR', label: 'Português (Brasil)' }]

export const quickActions = [{ label: 'New loan', href: '/circulation/loans' }, { label: 'New member', href: '/members/new' }, { label: 'New bibliographic record', href: '/catalog/records/new' }, { label: 'Open inventory', href: '/catalog/inventory' }]

export const kpis = [{ label: 'Active loans', value: '1,284', change: '+8.4%' }, { label: 'Overdue items', value: '37', change: '-12.1%' }, { label: 'New members', value: '84', change: '+16.7%' }, { label: 'Collection size', value: '48,291', change: '+2.3%' }]

export const recentActivity = [{ label: 'Loan registered', detail: 'The Overstory · Sofia Alvarez', time: '9:28 AM' }, { label: 'Record enriched', detail: 'Cien años de soledad · MARC import', time: '8:54 AM' }, { label: 'New member approved', detail: 'Ana Costa · Community', time: '8:31 AM' }]

export const pageSections = ['Overview', 'Activity', 'Alerts', 'Quick actions']

export function slugToLabel(slug: string) { return slug.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ') }

export const appName = 'BiblioNexus'
export const appTagline = 'Library intelligence'

export const isPublicPath = (pathname: string) => pathname === '/' || pathname.startsWith('/opac') || pathname.startsWith('/account')

export const settingsSections = ['General', 'Libraries', 'Branches', 'Circulation', 'Cataloging', 'Security', 'Notifications', 'Languages', 'Roles', 'Permissions']
export const catalogSections = ['Records', 'Items', 'Authorities', 'Collections', 'Inventory']
export const circulationSections = ['Loans', 'Returns', 'Renewals', 'Holds', 'Transfers']

export const statuses = ['Available', 'On loan', 'Missing', 'Processing']
export const memberTypes = ['Student', 'Faculty', 'Community']

export const currentUser = { name: 'Maya Chen', role: 'Administrator', initials: 'MC' }
export const currentBranch = 'Central Library'

export const footerLinks = [{ label: 'Privacy', href: '#' }, { label: 'Accessibility', href: '#' }, { label: 'Help center', href: '#' }]

export const recentSearches = ['One Hundred Years of Solitude', 'ISBN 978-0307474728', 'Sofia Alvarez']

export const tableColumns = ['Title', 'Author', 'ISBN', 'Format', 'Status']

export const navIconNames = ['layout', 'repeat', 'library', 'users', 'shopping', 'newspaper', 'monitor', 'boxes', 'bar-chart', 'chart', 'plug', 'history', 'settings']

export const localeStorageKey = 'biblionexus-locale'
export const sidebarStorageKey = 'biblionexus-sidebar-collapsed'

export function getBookCover(book: Book) { return `https://images.unsplash.com/${book.id === 'cien-anos' ? 'photo-1544947950-fa07a98d237f' : book.id === 'overstory' ? 'photo-1543002588-bfa74002ed7e' : book.id === 'dispossessed' ? 'photo-1512820790803-83ca734da794' : 'photo-1511108690759-009324a90311'}?w=240&h=320&fit=crop` }

export const systemStates = { loading: 'Loading workspace…', empty: emptyMessage, error: errorMessage, denied: permissionMessage, offline: offlineMessage, synced: syncMessage }

export function normalizeLocale(value: string | null): Locale { return value === 'es' || value === 'pt-BR' ? value : 'en' }

export const breadcrumbLabels: Record<string, string> = { dashboard: 'Overview', circulation: 'Circulation', catalog: 'Catalog', members: 'Members', settings: 'Settings', opac: 'Discover', account: 'My account' }

export function getBreadcrumbs(pathname: string) { return pathname.split('/').filter(Boolean).map((segment) => breadcrumbLabels[segment] ?? slugToLabel(segment)) }

export const version = '0.1 foundation'

export const defaultSort = 'title'
export const defaultBranch = currentBranch
export const defaultRole = currentUser.role

export const navSearchTerms = navItems.flatMap((item) => [item.label, item.href])

export const allRoutes = [...navItems.map((item) => item.href), ...routeGroups.circulation, ...routeGroups.catalog, ...routeGroups.settings, '/opac', '/opac/search', '/account']

export const supports = ['MARC21', 'Dublin Core', 'Z39.50', 'SIP2']

export const recordSections = ['Bibliographic data', 'Holdings', 'Items', 'Usage']
export const memberSections = ['Profile', 'Loans', 'Holds', 'Fines']

export const dateLabel = (locale: Locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date())

export const statusTone = (status: string) => status === 'Available' ? 'success' : status === 'On loan' ? 'warning' : 'neutral'

export const productDescription = 'A calm, connected workspace for libraries.'

export const searchCategories = ['Books', 'Authors', 'Members', 'Items', 'Branches', 'Collections', 'Orders', 'Vendors', 'Reports', 'Commands']

export const roleDescriptions = { Administrator: 'Full workspace access', Librarian: 'Cataloging and circulation', Assistant: 'Front desk operations' }

export const permissionDescriptions = { 'catalog.read': 'View catalog records', 'catalog.write': 'Create and edit catalog records', 'members.read': 'View member accounts', 'circulation.write': 'Register loans and returns', 'settings.read': 'View workspace settings' }

export const routeKey = (pathname: string) => pathname.replace(/^\//, '').replaceAll('/', '.') || 'home'

export const stats = { catalog: books.length, members: members.length, loans: 1284 }

export function getBook(id: string) { return repositories.books.find(id) }

export const recordId = 'cien-anos'

export const helpText = 'Need a hand? Open the command palette with ⌘ K.'

export const publicDescription = 'Discover your library’s collection, save favorites, and manage your account.'

export const adminDescription = 'Operational clarity for every collection, member, and circulation desk.'

export const routeStatus = 'Operational'

export const appVersion = '2026.09'

export const accessibilityLabel = 'BiblioNexus library management platform'

export const navGroupLabels = ['Workspace', 'Circulation', 'Collection', 'People', 'Intelligence']

export const end = true
