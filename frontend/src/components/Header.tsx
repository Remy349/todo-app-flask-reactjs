import { Link } from 'react-router-dom'
import { buttonVariants } from './ui/button'

export const Header = () => {
  return (
    <header className='fixed top-0 left-0 z-50 w-full bg-white border-b'>
      <nav className='container flex items-center justify-between h-16'>
        <Link to='/' className='font-bold text-xl'>
          TODOApp
        </Link>
        <div>
          <Link
            to='/auth/signin'
            className={buttonVariants({ variant: 'default' })}
          >
            Sign In
          </Link>
        </div>
      </nav>
    </header>
  )
}
