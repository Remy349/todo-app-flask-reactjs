import React from 'react'
import { FiMoon } from 'react-icons/fi'

export const Header = () => {
  return (
    <header className='header'>
      <nav className='nav container'>
        <a href='#' className='nav__logo'>
          TODOApp
        </a>
        <div className='nav__darkmode'>
          <button type='button' className='nav__darkmode-btn'>
            <FiMoon className='nav__darkmode-btn_moon' />
          </button>
        </div>
      </nav>
    </header>
  )
}
