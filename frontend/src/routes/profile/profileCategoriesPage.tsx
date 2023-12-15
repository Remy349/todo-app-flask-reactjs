import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
} from '@/components/ui/dialog'
import { PlusSquare } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export const ProfileCategoriesPage = () => {
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
              <form className='grid w-full gap-y-6'>
                <div className='flex flex-col gap-y-2'>
                  <Label htmlFor='categoryName'>Category name</Label>
                  <Input type='text' id='categoryName' autoComplete='off' />
                </div>
                <Button type='submit'>Confirm</Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </header>
    </div>
  )
}
