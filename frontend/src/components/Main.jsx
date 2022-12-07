import React from 'react'
import { Article } from './Article'

export const Main = () => {
  return (
    <main className='main container'>
      <h1 className='main__title'>Welcome to TODOApp</h1>
      <p className='main__text'>
        Keep notes of what you have to do in your day
      </p>
      <Article />
    </main>
  )
}
