import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './ui/AppLayout.jsx'
import Home from './pages/Home.jsx'
import Tenders from './pages/Tenders.jsx'


export const router = createBrowserRouter([
{
path: '/',
element: <AppLayout />,
children: [
{ index: true, element: <Home /> },
{ path: 'tenders', element: <Tenders /> },
],
},
])