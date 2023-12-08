import { buttonVariants } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export const HomePage = () => {
  return (
    <section className='pt-16 pb-10'>
      <div className='container'>
        <div className='grid place-content-center'>
          <h1 className='text-center text-3xl font-semibold'>
            Unleash Your <span className='text-primary'>Potential:</span> Tasks
            to Do, <span className='text-primary'>Dreams</span> to Achieve
          </h1>
          <div className='flex justify-center mt-4'>
            <Link
              to='/auth/signup'
              className={buttonVariants({
                variant: 'link',
                className: 'text-lg',
              })}
            >
              Create your own account
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
