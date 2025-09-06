export interface Tree {
  id: string
  name: string
  model: string
  birthDate: string
  deathDate: string
  youtubeUrl?: string
  images: string[]
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface User {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

export interface TreeFormData {
  name: string
  model: string
  birthDate: string
  deathDate: string
  youtubeUrl: string
  images: File[]
}
