import { NavLink, Outlet, useLocation } from "react-router-dom";

export default function AppLayout() {
  const { pathname } = useLocation();
  const linkClasses = (base, path) =>
    ["navlink", base, pathname === path ? "is-active" : ""].filter(Boolean).join(" ");

  return (
    <div data-theme="techsphere" className="min-h-screen bg-tech-pro">
      <div className="navbar navbar-pro px-4 md:px-6">
        {/* Left: bigger logo + brand name */}
        <div className="flex items-center gap-3">
          <img src="/techsphere-logo.png" className="h-12 w-12 md:h-14 md:w-14" alt="Techsphere" />
          <NavLink to="/" className="text-xl md:text-2xl font-bold gradient-text">
            Techsphere TenderTool
          </NavLink>
        </div>

        {/* Center: menu */}
        <nav className="flex items-center gap-2 md:gap-4">
          <NavLink to="/"        className={() => linkClasses("nav-home",    "/")}>Home</NavLink>
          <NavLink to="/tenders" className={() => linkClasses("nav-tenders", "/tenders")}>Tenders</NavLink>
          <NavLink to="/about"   className={() => linkClasses("nav-about",   "/about")}>About</NavLink>
          <NavLink to="/contact" className={() => linkClasses("nav-contact", "/contact")}>Contact</NavLink>
        </nav>

        {/* Right: spacer for balance (add CTA later if needed) */}
        <div />
      </div>

      <main className="max-w-6xl mx-auto p-6">
        <Outlet />
      </main>

      <footer className="mt-12 p-6 text-center opacity-70">
        © {new Date().getFullYear()} Techsphere Solutions — TenderTool
      </footer>
    </div>
  );
}
