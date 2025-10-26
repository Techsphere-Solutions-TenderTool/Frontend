// src/router.jsx
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './ui/AppLayout.jsx';
import Home from './pages/Home.jsx';
import TendersPage from './routes/TendersPage.jsx';
import TenderDetailsPage from './routes/TenderDetailsPage.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tenders', element: <TendersPage /> },
      { path: 'tenders/:id', element: <TenderDetailsPage /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
    ],
  },
]);
