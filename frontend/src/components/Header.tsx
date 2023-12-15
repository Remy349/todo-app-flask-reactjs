import { Link } from 'react-router-dom'
import { Button, buttonVariants } from './ui/button'
import { useAuth } from '@/store/auth'
import { Menu, X } from 'lucide-react'
import { useSidebar } from '@/store/sidebar'

export const Header = () => {
  const { isActive, cleanAuthUser } = useAuth()
  const { toggleSidebar, isSidebarOpen } = useSidebar()

  return (
    <header className='fixed top-0 left-0 z-50 w-full bg-white border-b'>
      <nav className='container flex items-center justify-between h-16'>
        <Link to={isActive ? '/profile' : '/'} className='font-bold text-xl'>
          TODOApp
        </Link>
        {isActive ? (
          <div className='flex items-center gap-x-2'>
            <Button
              onClick={toggleSidebar}
              variant='ghost'
              size='icon'
              className='lg:hidden'
            >
              {isSidebarOpen ? (
                <X className='text-primary w-8 h-8' />
              ) : (
                <Menu className='text-primary w-8 h-8' />
              )}
            </Button>
            <Link
              to='/auth/signin'
              className={buttonVariants({ variant: 'default' })}
              onClick={cleanAuthUser}
            >
              Logout
            </Link>
          </div>
        ) : (
          <div>
            <Link
              to='/auth/signin'
              className={buttonVariants({ variant: 'default' })}
            >
              Sign In
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
