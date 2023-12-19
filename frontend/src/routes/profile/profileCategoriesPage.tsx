import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
} from '@/components/ui/dialog'
import { PlusSquare } from 'lucide-react'
import { LoadingData } from '@/components/LoadingData'
import { EmptyData } from '@/components/EmptyData'
import { useCategory } from '@/hooks/useCategory'
import { CreateCategoryForm } from './components/CreateCategoryForm'

export const ProfileCategoriesPage = () => {
  const { isLoading, categories } = useCategory()

  return (
    <div>
      <header className='flex items-center justify-between'>
        <h2 className='font-semibold text-3xl'>Categories</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button size='icon'>
              <PlusSquare className='w-5 h-5' />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className='text-xl'>Create new category</DialogTitle>
            </DialogHeader>
            <div className='mt-4'>
              <CreateCategoryForm />
            </div>
          </DialogContent>
        </Dialog>
      </header>
      <div>
        {isLoading ? (
          <LoadingData />
        ) : (
          <div>
            {categories.length === 0 ? (
              <EmptyData title='No categories created yet' />
            ) : (
              <div></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
