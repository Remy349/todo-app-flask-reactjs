import { ErrorMessageForm } from '@/components/ErrorMessageForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createUser } from '@/services/api/userApi'
import { SignUpFormSchema, TSignUpFormSchema } from '@/types/types'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export const SignUpPage = () => {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<TSignUpFormSchema>({ resolver: zodResolver(SignUpFormSchema) })
  const navigate = useNavigate()

  const onSubmit = async (formData: TSignUpFormSchema) => {
    await createUser(formData)
      .then(() => {
        toast.success('Account successfully created.')

        navigate('/auth/signin')
      })
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 409) {
            toast.error('Account already created.')
          }
        }
      })
  }

  return (
    <section className='pt-16 pb-10 lg:pt-[6rem] lg:pb-[4.5rem]'>
      <div className='container'>
        <div>
          <h1 className='text-center font-semibold text-3xl lg:text-4xl lg:max-w-3xl lg:mx-auto'>
            The <span className='text-primary'>Essential</span> Tool for Your
            Daily <span className='text-primary'>Success:</span> Sign Up Now
          </h1>
          <div className='mt-8 md:flex md:justify-center md:mt-16'>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='grid gap-y-6 w-full md:w-[468px]'
            >
              <div className='flex flex-col gap-y-2'>
                <Label
                  htmlFor='email'
                  className={cn(
                    'text-base',
                    errors.email ? 'text-red-500' : '',
                  )}
                >
                  Email
                </Label>
                <Input
                  {...register('email')}
                  type='text'
                  id='email'
                  autoComplete='off'
                  className={errors.email ? 'focus-visible:ring-red-500' : ''}
                />
                {errors.email && (
                  <ErrorMessageForm message={errors.email.message} />
                )}
              </div>
              <div className='flex flex-col gap-y-2'>
                <Label
                  htmlFor='password'
                  className={cn(
                    'text-base',
                    errors.password ? 'text-red-500' : '',
                  )}
                >
                  Password
                </Label>
                <Input
                  {...register('password')}
                  type='password'
                  id='password'
                  className={
                    errors.password ? 'focus-visible:ring-red-500' : ''
                  }
                />
                {errors.password && (
                  <ErrorMessageForm message={errors.password.message} />
                )}
              </div>
              <div className='flex flex-col gap-y-2'>
                <Label
                  htmlFor='confirmPassword'
                  className={cn(
                    'text-base',
                    errors.confirmPassword ? 'text-red-500' : '',
                  )}
                >
                  Confirm password
                </Label>
                <Input
                  {...register('confirmPassword')}
                  type='password'
                  id='confirmPassword'
                  className={
                    errors.confirmPassword ? 'focus-visible:ring-red-500' : ''
                  }
                />
                {errors.confirmPassword && (
                  <ErrorMessageForm message={errors.confirmPassword.message} />
                )}
              </div>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className='mr-2 w-5 h-5 animate-spin' />
                )}
                Sign Up
              </Button>
              <Link to='/auth/signin' className='text-center text-base'>
                Already have an account?
                <br />
                Sign In
              </Link>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
