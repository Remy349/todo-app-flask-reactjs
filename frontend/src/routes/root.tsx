import { Header } from '@/components/Header'
import { Outlet } from 'react-router-dom'

export const Root = () => {
  return (
    <>
      <Header />
      <main className='mt-16'>
        <Outlet />
      </main>
    </>
  )
}
