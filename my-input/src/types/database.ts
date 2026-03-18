export type Platform = 'note' | 'x' | 'instagram' | 'youtube' | 'pixiv' | 'threads' | 'other'
export type ContentStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  name: string
  color: string | null
  icon: string | null
  team_id: string | null
  team?: Team
  created_at: string
}

export interface Content {
  id: string
  url: string
  platform: Platform
  title: string | null
  full_text: string | null
  summary: string | null
  category: string | null
  tags: string[] | null
  thumbnail_url: string | null
  image_urls: string[] | null
  author: string | null
  published_at: string | null
  created_at: string
  status: ContentStatus
  error_message: string | null
  // User
  user_id: string
  user?: User
  // Feedback fields
  rating: number | null
  is_favorite: boolean
  is_adopted: boolean
  is_mou_bimyou: boolean
  is_mou_furui: boolean
  is_stocked: boolean
  comment: string | null
  // Like (populated client-side)
  likes_count?: number
  is_liked_by_me?: boolean
  liked_user_ids?: string[]
}

export interface Database {
  public: {
    Tables: {
      contents: {
        Row: Content
        Insert: Omit<Content, 'id' | 'created_at' | 'rating' | 'is_favorite' | 'is_adopted' | 'is_mou_bimyou' | 'is_stocked' | 'comment' | 'user' | 'likes_count' | 'is_liked_by_me'> & {
          id?: string
          created_at?: string
          rating?: number | null
          is_favorite?: boolean
          is_adopted?: boolean
          is_mou_bimyou?: boolean
          is_mou_furui?: boolean
          is_stocked?: boolean
          comment?: string | null
        }
        Update: Partial<Content>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'team'> & {
          id?: string
          color?: string | null
          icon?: string | null
          team_id?: string | null
          created_at?: string
        }
        Update: Partial<Omit<User, 'team'>>
      }
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Team>
      }
    }
  }
}
