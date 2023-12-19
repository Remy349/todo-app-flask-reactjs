import { useAuth } from '@/store/auth'
import { jwtDecode } from 'jwt-decode'

export const getUserIdFromAccessToken = () => {
  const token = useAuth.getState().authUser.access_token

  const { sub } = jwtDecode(token)

  return sub
}
