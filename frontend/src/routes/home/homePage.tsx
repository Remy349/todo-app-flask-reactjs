import { buttonVariants } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export const HomePage = () => {
  return (
    <section className='pt-16 pb-10 lg:pt-[6rem] lg:pb-[4.5rem]'>
      <div className='container'>
        <div className='grid place-content-center'>
          <h1 className='text-center text-3xl font-semibold lg:text-4xl lg:max-w-3xl lg:mx-auto xl:text-5xl'>
            Unleash Your <span className='text-primary'>Potential:</span> Tasks
            to Do, <span className='text-primary'>Dreams</span> to Achieve
          </h1>
          <div className='flex justify-center mt-4 md:mt-8'>
            <Link
              to='/auth/signup'
              className={buttonVariants({
                variant: 'link',
                className: '!text-lg',
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
