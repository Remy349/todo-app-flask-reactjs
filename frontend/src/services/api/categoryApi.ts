import { TCategory, TCreateCategoryFormSchema } from '@/types/types'
import { API_URL } from '@/utils/globals'
import { getUserIdFromAccessToken } from '@/utils/helpers'
import axios from 'axios'

export const getCategories = async () => {
  const userId = getUserIdFromAccessToken()

  const res = await axios.get<TCategory[]>(
    `${API_URL}/users/${userId}/categories`,
  )

  return res.data
}

export const createCategory = async (data: TCreateCategoryFormSchema) => {
  const userId = getUserIdFromAccessToken()

  const res = await axios.post<TCategory>(`${API_URL}/categories`, {
    category_name: data.category_name,
    user_id: userId,
  })

  return res.data
}
