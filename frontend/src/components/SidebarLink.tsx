import React from 'react'
import { Link } from 'react-router-dom'

type TSidebarLinkProps = {
  linkTo: string
  routeName: string
  children: React.ReactNode
}

export const SidebarLink = ({
  linkTo,
  routeName,
  children,
}: TSidebarLinkProps) => {
  return (
    <Link
      to={linkTo}
      className='flex items-center text-primary gap-x-2 font-semibold'
    >
      <div className='bg-primary w-9 h-9 flex items-center justify-center rounded-lg'>
        {children}
      </div>
      {routeName}
    </Link>
  )
}
