import { useAuth } from '@/store/auth'
import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'

export const ProfilePage = () => {
  const { isActive } = useAuth()

  if (!isActive) {
    return <Navigate to='/auth/signin' />
  }

  return (
    <section className='relative'>
      <Sidebar />
      <div className='pt-8 lg:pl-[20rem]'>
        <div className='container'>
          <Outlet />
        </div>
      </div>
    </section>
  )
}
