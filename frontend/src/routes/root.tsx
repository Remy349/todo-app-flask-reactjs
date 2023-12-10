import { Header } from '@/components/Header'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'

export const Root = () => {
  return (
    <>
      <Header />
      <main className='mt-16'>
        <Outlet />
      </main>
      <Toaster position='top-right' closeButton richColors />
    </>
  )
}
