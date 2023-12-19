import { TSignUpFormSchema, TUser } from '@/types/types'
import { API_URL } from '@/utils/globals'
import axios from 'axios'

export const createUser = async (data: TSignUpFormSchema) => {
  const res = await axios.post<TUser>(`${API_URL}/users`, {
    email: data.email,
    password: data.password,
  })

  return res.data
}
