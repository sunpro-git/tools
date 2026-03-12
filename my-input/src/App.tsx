import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Star, Pin, AlertTriangle, SlidersHorizontal, ChevronDown, UserPlus, LogOut, Trash2, Pencil } from 'lucide-react'
import { SakuraIcon, ZzIcon } from './components/icons'
import ContentCard from './components/ContentCard'
import ContentDetail from './components/ContentDetail'
import InputSection from './components/InputSection'
import AppIcon from './components/AppIcon'
import UserSelectScreen from './components/UserSelectScreen'
import UserAvatar from './components/UserAvatar'
import UserEditModal from './components/UserEditModal'
import TeamManageModal from './components/TeamManageModal'
import InstallPrompt from './components/InstallPrompt'
import { fetchContents, addContent, processContent, getCategories, getAllTags, updateContentFeedback, fetchUsers, fetchLikesForContents, toggleLike, addUser, updateUser, deleteUser, fetchTeams, addTeam as apiAddTeam, updateTeam as apiUpdateTeam, deleteTeam as apiDeleteTeam } from './lib/api'
import { getPlatformLabel } from './lib/platform'
import type { Content, Platform, User, Team } from './types/database'

const STORAGE_KEY = 'my-input-user'

interface Filters {
  platform?: string
  category?: string
  tag?: string
  search?: string
  dateRange?: 'today' | 'week' | 'all'
  feedback?: string
  filterUserIds?: string[]
}

const platforms: Platform[] = ['note', 'x', 'instagram', 'youtube']

/** Read content ID from URL hash (#content/{id}) */
function getHashContentId(): string | null {
  const match = window.location.hash.match(/^#content\/(.+)$/)
  return match ? match[1] : null
}

function getSavedUser(): { userId: string; userName: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function App() {
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [userLoading, setUserLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [viewMode, setViewMode] = useState<string>('mine') // 'mine' | 'all' | team UUID
  const [showAddUserForm, setShowAddUserForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [showTeamManageModal, setShowTeamManageModal] = useState(false)

  // Content state
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(getHashContentId)
  const [filters, setFilters] = useState<Filters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Responsive check
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Date-based content sections (client-side filtering)
  const isLandingView = !filters.platform && !filters.category && !filters.tag && !filters.search && !filters.dateRange && !filters.feedback && (!filters.filterUserIds || filters.filterUserIds.length === 0)

  const todayContents = useMemo(() => {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    return contents.filter(c => new Date(c.created_at) >= twentyFourHoursAgo)
  }, [contents])

  const weekContents = useMemo(() => {
    const now = new Date()
    const day = now.getDay() // 0=Sun
    const mondayOffset = day === 0 ? 6 : day - 1
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
    return contents.filter(c => new Date(c.created_at) >= startOfWeek)
  }, [contents])

  // Week contents excluding today's items (for landing view section only)
  const weekExcludingTodayContents = useMemo(() => {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    return weekContents.filter(c => new Date(c.created_at) < twentyFourHoursAgo)
  }, [weekContents])

  // Landing view: exclude items already shown in today/week sections
  const landingAllContents = useMemo(() => {
    const shownIds = new Set<string>()
    // Items shown in "今日のインプット" section (up to 4)
    todayContents.slice(0, 4).forEach(c => shownIds.add(c.id))
    // Items shown in "今週のインプット" section (up to 4)
    weekExcludingTodayContents.slice(0, 4).forEach(c => shownIds.add(c.id))
    return contents.filter(c => !shownIds.has(c.id))
  }, [contents, todayContents, weekExcludingTodayContents])

  const displayedContents = useMemo(() => {
    if (filters.dateRange === 'today') return todayContents
    if (filters.dateRange === 'week') return weekContents
    return contents
  }, [contents, todayContents, weekContents, filters.dateRange])

  function handleViewMore(range: 'today' | 'week') {
    setFilters(prev => ({ ...prev, dateRange: range }))
  }

  // URL registration (always visible in header)
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Navigate to detail — push browser history
  const navigateToDetail = useCallback((id: string) => {
    setSelectedId(id)
    window.history.pushState({ contentId: id }, '', `#content/${id}`)
  }, [])

  // Navigate back to list — use history.back() if possible, otherwise just clear
  const navigateToList = useCallback(() => {
    setSelectedId(null)
    // Replace current hash so URL stays clean
    window.history.pushState(null, '', window.location.pathname + window.location.search)
  }, [])

  // Listen for browser back/forward
  useEffect(() => {
    function handlePopState() {
      const id = getHashContentId()
      setSelectedId(id)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ---- User initialization ----
  useEffect(() => {
    async function initUser() {
      setUserLoading(true)
      try {
        const [allUsers, allTeams] = await Promise.all([fetchUsers(), fetchTeams()])
        setUsers(allUsers)
        setTeams(allTeams)

        const saved = getSavedUser()
        if (saved) {
          const found = allUsers.find(u => u.id === saved.userId)
          if (found) {
            setCurrentUser(found)
          }
        }
      } catch (err) {
        console.error('Failed to fetch users:', err)
      } finally {
        setUserLoading(false)
      }
    }
    initUser()
  }, [])

  function handleUserSelect(user: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: user.id, userName: user.name }))
    setCurrentUser(user)
  }

  function handleSwitchUser(user: User) {
    handleUserSelect(user)
    setShowUserMenu(false)
    // Reset view to mine
    setViewMode('mine')
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(null)
    setShowUserMenu(false)
    setViewMode('mine')
  }

  async function handleDeleteUser(user: User) {
    if (!confirm(`「${user.name}」を削除しますか？このユーザーのコンテンツも全て削除されます。`)) return
    try {
      await deleteUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      if (currentUser?.id === user.id) {
        handleLogout()
      }
      setShowUserMenu(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ユーザーの削除に失敗しました')
    }
  }

  async function handleAddUserFromMenu(data: { name: string; color: string; icon: string; teamId: string | null }) {
    setEditSaving(true)
    setEditError('')
    try {
      const user = await addUser(data.name, data.color, data.icon, data.teamId)
      setUsers(prev => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)))
      handleSwitchUser(user)
      setShowAddUserForm(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '追加に失敗しました')
      throw err
    } finally {
      setEditSaving(false)
    }
  }

  async function handleAddUserFromSelect(name: string, color: string, icon: string, teamId?: string | null): Promise<User> {
    const user = await addUser(name, color, icon, teamId)
    setUsers(prev => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)))
    return user
  }

  async function handleEditUser(id: string, data: { name: string; color: string; icon: string; teamId: string | null }) {
    setEditSaving(true)
    setEditError('')
    try {
      const { teamId, ...rest } = data
      const updated = await updateUser(id, { ...rest, team_id: teamId })
      setUsers(prev => prev.map(u => u.id === id ? updated : u).sort((a, b) => a.name.localeCompare(b.name)))
      if (currentUser?.id === id) {
        setCurrentUser(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: updated.id, userName: updated.name }))
      }
      setEditingUser(null)
      setShowEditModal(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新に失敗しました')
      throw err
    } finally {
      setEditSaving(false)
    }
  }

  async function handleEditUserFromSelect(id: string, data: { name: string; color: string; icon: string; teamId: string | null }) {
    const { teamId, ...rest } = data
    const updated = await updateUser(id, { ...rest, team_id: teamId })
    setUsers(prev => prev.map(u => u.id === id ? updated : u).sort((a, b) => a.name.localeCompare(b.name)))
    if (currentUser?.id === id) {
      setCurrentUser(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: updated.id, userName: updated.name }))
    }
  }

  // ---- Team handlers ----
  async function handleAddTeam(name: string) {
    const team = await apiAddTeam(name)
    setTeams(prev => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function handleUpdateTeam(id: string, name: string) {
    const updated = await apiUpdateTeam(id, name)
    setTeams(prev => prev.map(t => t.id === id ? updated : t).sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function handleDeleteTeam(id: string) {
    await apiDeleteTeam(id)
    setTeams(prev => prev.filter(t => t.id !== id))
    // Refresh users to clear team assignments
    const allUsers = await fetchUsers()
    setUsers(allUsers)
    if (currentUser) {
      const refreshed = allUsers.find(u => u.id === currentUser.id)
      if (refreshed) setCurrentUser(refreshed)
    }
  }

  // ---- Data loading ----
  const apiFilters = useMemo(() => {
    let userId: string | undefined
    let userIds: string[] | undefined

    if (viewMode === 'mine' && currentUser) {
      userId = currentUser.id
    } else if (viewMode === 'all') {
      if (filters.filterUserIds && filters.filterUserIds.length > 0) {
        userIds = filters.filterUserIds
      }
    } else {
      // Team mode: filter by users in that team
      const teamUserIds = users.filter(u => u.team_id === viewMode).map(u => u.id)
      if (teamUserIds.length > 0) {
        userIds = teamUserIds
      } else {
        // No users in team — use impossible ID to return empty
        userIds = ['00000000-0000-0000-0000-000000000000']
      }
    }

    return { ...filters, userId, userIds }
  }, [filters, viewMode, currentUser, users])

  const loadContents = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const data = await fetchContents(apiFilters)
      // Load likes for all fetched contents
      const ids = data.map(c => c.id)
      const likes = await fetchLikesForContents(ids, currentUser.id)
      const enriched = data.map(c => ({
        ...c,
        likes_count: likes[c.id]?.count || 0,
        is_liked_by_me: likes[c.id]?.likedByMe || false,
      }))
      setContents(enriched)
    } catch (err) {
      console.error('Failed to load contents:', err)
      setContents([])
    } finally {
      setLoading(false)
    }
  }, [apiFilters, currentUser])

  // Feedback handler (optimistic update + API)
  const handleFeedbackChange = useCallback(async (id: string, fields: Partial<Content>) => {
    setContents(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c))
    try {
      const updated = await updateContentFeedback(id, fields)
      setContents(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
    } catch {
      // Revert on error — reload from server
      loadContents()
    }
  }, [loadContents])

  // Like handler (optimistic update)
  const handleLikeToggle = useCallback(async (contentId: string) => {
    if (!currentUser) return
    const content = contents.find(c => c.id === contentId)
    if (!content) return

    const wasLiked = content.is_liked_by_me
    // Optimistic
    setContents(prev => prev.map(c => c.id === contentId ? {
      ...c,
      is_liked_by_me: !wasLiked,
      likes_count: (c.likes_count || 0) + (wasLiked ? -1 : 1),
    } : c))

    try {
      await toggleLike(contentId, currentUser.id)
    } catch {
      // Revert
      setContents(prev => prev.map(c => c.id === contentId ? {
        ...c,
        is_liked_by_me: wasLiked,
        likes_count: (c.likes_count || 0) + (wasLiked ? 1 : -1),
      } : c))
    }
  }, [currentUser, contents])

  useEffect(() => {
    if (currentUser) loadContents()
  }, [loadContents, currentUser])

  useEffect(() => {
    getCategories().then(setCategories).catch((err) => console.error('Failed to load categories:', err))
    getAllTags().then(setTags).catch((err) => console.error('Failed to load tags:', err))
  }, [])

  // Poll for processing items
  useEffect(() => {
    const hasProcessing = contents.some((c) => c.status === 'processing' || c.status === 'pending')
    if (!hasProcessing) return
    const interval = setInterval(loadContents, 5000)
    return () => clearInterval(interval)
  }, [contents, loadContents])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchQuery || undefined }))
  }

  function toggleFilter(key: keyof Filters, value: string) {
    setFilters((prev) => {
      if (prev[key] === value) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newUrl.trim() || !currentUser) return
    setAdding(true)
    setAddError('')
    try {
      const content = await addContent(newUrl, currentUser.id)
      setNewUrl('')
      // Add new content to the list immediately (status=processing triggers polling)
      setContents(prev => [{ ...content, likes_count: 0, is_liked_by_me: false } as Content, ...prev])
      // Fire-and-forget: processContent saves transcript & triggers AI analysis.
      // The 5s polling (useEffect on processing status) will pick up updates automatically.
      processContent(content.id).catch(err => console.error('processContent failed:', err))
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  const hasFilters = filters.platform || filters.category || filters.tag || filters.dateRange || filters.feedback

  // ---- User selection screen ----
  if (!currentUser) {
    return <UserSelectScreen users={users} teams={teams} onSelect={handleUserSelect} onAddUser={handleAddUserFromSelect} onEditUser={handleEditUserFromSelect} onAddTeam={handleAddTeam} onUpdateTeam={handleUpdateTeam} onDeleteTeam={handleDeleteTeam} loading={userLoading} />
  }

  // ---- Detail view ----
  if (selectedId) {
    return (
      <div className="min-h-screen bg-white">
        <ContentDetail
          contentId={selectedId}
          currentUserId={currentUser.id}
          users={users}
          onBack={() => {
            navigateToList()
            loadContents()
          }}
          onDeleted={() => {
            navigateToList()
            loadContents()
          }}
        />
      </div>
    )
  }

  const showUser = viewMode !== 'mine'

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header - YouTube style */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-2 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
          {/* Logo */}
          <h1 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-1.5 shrink-0">
            <AppIcon className="w-8 h-8 sm:w-9 sm:h-9" />
            <span className="text-sm sm:text-base">MY INPUT</span>
          </h1>

          {/* URL Registration - fills available space */}
          <form onSubmit={handleAdd} className="flex flex-1 min-w-0 max-w-xl">
            <div className="flex items-stretch w-full">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={isMobile ? 'URLを入力' : 'URLを入力して登録...'}
                className="w-full pl-4 pr-2 py-1.5 border border-[#188b65] border-r-0 rounded-l-full text-base focus:ring-1 focus:ring-[#188b65] focus:border-[#188b65] outline-none text-gray-900"
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !newUrl.trim()}
                className="px-3 sm:px-4 bg-[#188b65] border border-[#188b65] rounded-r-full hover:bg-[#147553] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                登録
              </button>
            </div>
            {addError && <p className="text-xs text-red-500 mt-1 pl-4">{addError}</p>}
          </form>

          {/* Actions */}
          <div className="flex items-center shrink-0 -ml-1">
            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title={currentUser.name}
              >
                <UserAvatar user={currentUser} users={users} size="md" />
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => { setShowUserMenu(false) }} />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">ログイン中</p>
                        <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                      </div>
                      <button
                        onClick={() => { setEditingUser(currentUser); setShowEditModal(true); setEditError(''); setShowUserMenu(false) }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="プロフィール編集"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {users.filter(u => u.id !== currentUser.id).map(user => (
                      <div key={user.id} className="flex items-center hover:bg-gray-50 group">
                        <button
                          onClick={() => handleSwitchUser(user)}
                          className="flex-1 text-left px-3 py-2 text-sm text-gray-700 flex items-center gap-2"
                        >
                          <UserAvatar user={user} users={users} size="sm" />
                          {user.name}に切り替え
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="px-2 py-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={`${user.name}を削除`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => { setShowAddUserForm(true); setEditError(''); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4 text-gray-400" />
                        ユーザーを追加
                      </button>
                    </div>
                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        ユーザー選択を解除
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="sticky top-14 z-10 bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* View mode toggle: 自分のみ / みんな / チーム */}
          <div className="flex shrink-0 border border-[#188b65] rounded-full overflow-hidden">
            {[
              { key: 'mine', label: '自分のみ' },
              { key: 'all', label: 'みんな' },
              ...teams.map(t => ({ key: t.id, label: t.name })),
            ].map((item, i) => (
              <button
                key={item.key}
                onClick={() => setViewMode(item.key)}
                className={`px-3.5 py-1 text-sm font-medium whitespace-nowrap transition-all ${
                  i > 0 ? 'border-l border-[#188b65] ' : ''
                }${
                  viewMode === item.key
                    ? 'bg-[#188b65] text-white'
                    : 'bg-white text-[#188b65] hover:bg-[#188b65]/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              showFilterPanel || hasFilters || (filters.filterUserIds && filters.filterUserIds.length > 0)
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            絞込み
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
          </button>
          </div>

        {/* Expandable filter panel */}
        {showFilterPanel && (
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pb-4 border-t border-gray-100">
            {/* Search + Clear */}
            <div className="flex items-center gap-3 pt-3 pb-2">
              <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <div className="flex">
                  <div className="relative flex-1 min-w-0">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="キーワードで検索..."
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setFilters(prev => { const next = { ...prev }; delete next.search; return next }) }}
                      className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
              {(hasFilters || (filters.filterUserIds && filters.filterUserIds.length > 0) || searchQuery) && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setFilters(() => ({ search: undefined })) }}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  フィルターをクリア
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
              {/* 期間 */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">期間</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'today' as const, label: '今日' },
                    { key: 'week' as const, label: '今週' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setFilters(prev => {
                          if (prev.dateRange === key) {
                            const next = { ...prev }; delete next.dateRange; return next
                          }
                          return { ...prev, dateRange: key }
                        })
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        filters.dateRange === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ステータス */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ステータス</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'adopted', label: '採用した', icon: SakuraIcon, color: 'text-pink-500' },
                    { key: 'stocked', label: 'ストック', icon: Pin, color: 'text-blue-500' },
                    { key: 'furui', label: 'もう古い', icon: ZzIcon, color: 'text-slate-500' },
                    { key: 'bimyou', label: 'もう微妙', icon: AlertTriangle, color: 'text-amber-500' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => toggleFilter('feedback', key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                        filters.feedback === key
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${filters.feedback === key ? 'text-white' : color}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ☆評価 */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">☆評価</h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => toggleFilter('feedback', 'rated')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                      filters.feedback === 'rated'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${filters.feedback === 'rated' ? 'text-white' : 'text-yellow-500'}`} />
                    評価あり
                  </button>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => toggleFilter('feedback', `rating_${n}`)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-0.5 ${
                        filters.feedback === `rating_${n}`
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
                    </button>
                  ))}
                </div>
              </div>

              {/* プラットフォーム */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">プラットフォーム</h3>
                <div className="flex flex-wrap gap-1.5">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleFilter('platform', p)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                        filters.platform === p
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {getPlatformLabel(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* スタッフ */}
              {users.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">スタッフ</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setFilters(prev => {
                            const ids = prev.filterUserIds || []
                            const has = ids.includes(u.id)
                            const next = has ? ids.filter(id => id !== u.id) : [...ids, u.id]
                            return { ...prev, filterUserIds: next.length > 0 ? next : undefined }
                          })
                          // スタッフ選択時は自動的に「みんな」に切り替え
                          setViewMode('all')
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                          filters.filterUserIds?.includes(u.id)
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* カテゴリ */}
              {categories.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">カテゴリ</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleFilter('category', cat)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                          filters.category === cat
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* タグ */}
              {tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">タグ</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 12).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleFilter('tag', tag)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                          filters.tag === tag
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content - Grid */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-20">
            <AppIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-gray-500 text-lg">
              {viewMode === 'mine' ? 'まだコンテンツがありません' : 'コンテンツがありません'}
            </p>
            {viewMode === 'mine' && (
              <p className="text-sm text-gray-400 mt-2">
                上のテキストボックスにURLを入力して登録してください
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Time-based highlight sections (landing view only) */}
            {isLandingView && (
              <>
                {todayContents.length > 0 && (
                  <InputSection
                    title="今日のインプット"
                    items={todayContents.slice(0, 4)}
                    totalCount={todayContents.length}
                    onViewMore={() => handleViewMore('today')}
                    onCardClick={navigateToDetail}
                    onFeedbackChange={handleFeedbackChange}
                    onLikeToggle={handleLikeToggle}
                    currentUserId={currentUser.id}
                    showUser={showUser}
                    users={users}
                  />
                )}
                {weekExcludingTodayContents.length > 0 && (
                  <InputSection
                    title="今週のインプット"
                    items={weekExcludingTodayContents.slice(0, 4)}
                    totalCount={weekContents.length}
                    onViewMore={() => handleViewMore('week')}
                    onCardClick={navigateToDetail}
                    onFeedbackChange={handleFeedbackChange}
                    onLikeToggle={handleLikeToggle}
                    currentUserId={currentUser.id}
                    showUser={showUser}
                    users={users}
                  />
                )}
              </>
            )}

            {/* Main content grid */}
            <div>
              {isLandingView && (todayContents.length > 0 || weekContents.length > 0) ? (
                <InputSection
                  title="すべてのインプット"
                  items={landingAllContents.slice(0, 4)}
                  totalCount={contents.length}
                  onViewMore={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
                  onCardClick={navigateToDetail}
                  onFeedbackChange={handleFeedbackChange}
                  onLikeToggle={handleLikeToggle}
                  currentUserId={currentUser.id}
                  showUser={showUser}
                  users={users}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                  {displayedContents.map((content) => (
                    <ContentCard
                      key={content.id}
                      content={content}
                      onClick={() => navigateToDetail(content.id)}
                      onFeedbackChange={handleFeedbackChange}
                      onLikeToggle={handleLikeToggle}
                      isOwner={content.user_id === currentUser.id}
                      showUser={showUser}
                      users={users}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Edit user modal */}
      {showEditModal && editingUser && (
        <UserEditModal
          user={editingUser}
          teams={teams}
          onSave={async (data) => { await handleEditUser(editingUser.id, data) }}
          onCancel={() => { setShowEditModal(false); setEditingUser(null); setEditError('') }}
          onManageTeams={() => setShowTeamManageModal(true)}
          saving={editSaving}
          error={editError}
        />
      )}

      {/* Add user modal (from menu) */}
      {showAddUserForm && (
        <UserEditModal
          teams={teams}
          onSave={handleAddUserFromMenu}
          onCancel={() => { setShowAddUserForm(false); setEditError('') }}
          onManageTeams={() => setShowTeamManageModal(true)}
          saving={editSaving}
          error={editError}
        />
      )}

      {/* Team manage modal */}
      {showTeamManageModal && (
        <TeamManageModal
          teams={teams}
          users={users}
          onAdd={handleAddTeam}
          onUpdate={handleUpdateTeam}
          onDelete={handleDeleteTeam}
          onClose={() => setShowTeamManageModal(false)}
        />
      )}

      <InstallPrompt />
    </div>
  )
}
