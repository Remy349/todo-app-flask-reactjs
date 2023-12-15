import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Root } from './routes/root'
import { HomePage } from './routes/home/homePage'
import { SignInPage } from './routes/auth/signInPage'
import { SignUpPage } from './routes/auth/signUpPage'
import { ProfilePage } from './routes/profile/profilePage'
import { ProfileHomePage } from './routes/profile/profileHomePage'
import { ProfileCategoriesPage } from './routes/profile/profileCategoriesPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'auth',
        children: [
          {
            path: 'signin',
            element: <SignInPage />,
          },
          {
            path: 'signup',
            element: <SignUpPage />,
          },
        ],
      },
      {
        path: 'profile',
        element: <ProfilePage />,
        children: [
          {
            index: true,
            element: <ProfileHomePage />,
          },
          {
            path: 'categories',
            element: <ProfileCategoriesPage />,
          },
        ],
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
