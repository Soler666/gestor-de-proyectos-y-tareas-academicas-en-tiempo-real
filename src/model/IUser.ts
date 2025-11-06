export type IUserCreate = {
  username: string
  role: string
  password: string
  status?: string
  email?: string
  firstName?: string
  lastName?: string
}

export type IUser = IUserCreate & {
  id: number
  status: string
  googleId?: string | null
  googleAccessToken?: string | null
  googleRefreshToken?: string | null
  googleTokenExpiry?: Date | null
  calendarId?: string | null
}

export type IEditUser = {
  username?: string
  role?: string
  status?: string
  password?: string
  googleId?: string | null
  googleAccessToken?: string | null
  googleRefreshToken?: string | null
  googleTokenExpiry?: Date | null
  calendarId?: string | null
}
