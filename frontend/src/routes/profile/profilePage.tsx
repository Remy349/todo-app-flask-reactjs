import { cn } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import { useSidebar } from '@/store/sidebar'
import { Navigate } from 'react-router-dom'

export const ProfilePage = () => {
  const { isActive } = useAuth()
  const { isSidebarOpen } = useSidebar()

  if (!isActive) {
    return <Navigate to='/auth/signin' />
  }

  return (
    <section className='relative'>
      <div
        className={cn(
          'absolute top-0 bg-white border-r w-[16rem] min-h-[calc(100vh-4rem)] duration-300 lg:left-0 lg:w-[20rem]',
          isSidebarOpen ? 'left-0' : '-left-full',
        )}
      >
        SIDEBAR
      </div>
      <div className='lg:pl-[20rem] lg:w-[calc(100%-20rem)]'>
        <h1>CONTENT HERE</h1>
      </div>
    </section>
  )
}
