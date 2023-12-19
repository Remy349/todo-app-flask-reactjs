import { getCategories } from '@/services/api/categoryApi'
import { TCategory } from '@/types/types'
import { useEffect, useState } from 'react'

export const useCategory = () => {
  const [categories, setCategories] = useState<TCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCategories()
      .then((data) => {
        setCategories(data)
      })
      .catch((err) => {
        console.log(err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return { categories, isLoading }
}
