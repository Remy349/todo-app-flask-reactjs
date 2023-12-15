import { cn } from '@/lib/utils'
import { useSidebar } from '@/store/sidebar'
import { SidebarLink } from './SidebarLink'
import { Bookmark, Home } from 'lucide-react'

export const Sidebar = () => {
  const { isSidebarOpen } = useSidebar()

  return (
    <div
      className={cn(
        'absolute top-0 bg-white border-r w-[16rem] min-h-[calc(100vh-4rem)] duration-300 lg:left-0 lg:w-[20rem]',
        isSidebarOpen ? 'left-0' : '-left-full',
      )}
    >
      <div className='px-8 py-12 flex flex-col gap-y-4'>
        <SidebarLink linkTo='/profile' routeName='Home'>
          <Home className='w-5 h-5 text-white' />
        </SidebarLink>
        <SidebarLink linkTo='/profile/categories' routeName='Categories'>
          <Bookmark className='w-5 h-5 text-white' />
        </SidebarLink>
      </div>
    </div>
  )
}
