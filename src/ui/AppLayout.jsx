import { Outlet, NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'


export default function AppLayout() {
return (
<div className="min-h-screen bg-base-200">
<div className="navbar bg-base-100 shadow">
<div className="flex-1">
<NavLink to="/" className="btn btn-ghost text-xl">Tender Tool</NavLink>
</div>
<div className="flex-none gap-2">
<NavLink to="/tenders" className={({isActive}) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}>Tenders</NavLink>
<ThemeToggle />
</div>
</div>
<main className="p-6 max-w-6xl mx-auto">
<Outlet />
</main>
</div>
)
}