import { TAuthUser, TSignInFormSchema } from '@/types/types'
import { API_URL } from '@/utils/globals'
import axios from 'axios'

export const authenticateUser = async (data: TSignInFormSchema) => {
  const res = await axios.post<TAuthUser>(`${API_URL}/auth/signin`, {
    ...data,
  })

  return res.data
}
