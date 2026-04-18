import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { route } from './routes/routes'

const App = () => {
  return (
    <div >
      <RouterProvider router={route}/>
    </div>
  )
}

export default App