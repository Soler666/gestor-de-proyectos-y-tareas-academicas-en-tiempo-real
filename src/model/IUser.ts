export type IUser = {
  id: number
  username: string
  role: string
  password: string
}

export type IEditUser = {
  username?: string
  role?: string
  password?: string
}
