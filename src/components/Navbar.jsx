// src/components/Navbar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

const COGNITO_DOMAIN =
  "https://af-south-1a3zhkvtjp.auth.af-south-1.amazoncognito.com";
const CLIENT_ID = "6hrvpmrv13cf2tnj3en148i38q";
const REDIRECT_URI = "http://localhost:5173/";

export default function Navbar({ onOpenPrefs }) {
  const auth = useAuth();
  const navigate = useNavigate();

  const login = () => auth.signinRedirect();

  const register = () => {
    window.location.href = `${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}`;
  };

  const logout = () => {
    auth.removeUser();
    window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(
      REDIRECT_URI
    )}`;
  };

  return (
    <header className="navbar-pro px-4 py-3">
      {/* left: logo + brand */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate("/")}
      >
        {/* logo */}
        <img
          src="/techsphere-logo.png"
          alt="Techsphere"
          className="h-9 w-9 rounded-md object-contain"
        />
        <span className="font-bold text-slate-50 tracking-tight">
          Techsphere TenderTool
        </span>
      </div>

      {/* center: links */}
      <nav className="flex gap-2 justify-center">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `navlink nav-home ${isActive ? "is-active" : ""}`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/tenders"
          className={({ isActive }) =>
            `navlink nav-tenders ${isActive ? "is-active" : ""}`
          }
        >
          Tenders
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) =>
            `navlink nav-stats ${isActive ? "is-active" : ""}`
          }
        >
          Stats
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `navlink nav-about ${isActive ? "is-active" : ""}`
          }
        >
          About
        </NavLink>
        <NavLink
          to="/contact"
          className={({ isActive }) =>
            `navlink nav-contact ${isActive ? "is-active" : ""}`
          }
        >
          Contact
        </NavLink>
      </nav>

      {/* right: auth */}
      <div className="flex gap-2 items-center justify-end">
        {!auth.isAuthenticated ? (
          <>
            <button onClick={login} className="btn btn-outline ts text-sm">
              Login
            </button>
            <button onClick={register} className="btn btn-primary text-sm">
              Register
            </button>
          </>
        ) : (
          <>
            <div className="text-[0.7rem] leading-tight text-right text-slate-100/80">
              <div>{auth.user?.profile?.email ?? "Logged in"}</div>
              <button
                onClick={onOpenPrefs}
                className="text-cyan-200 text-[0.68rem] hover:underline"
              >
                Preferences
              </button>
            </div>
            <button onClick={logout} className="btn btn-outline ts text-sm">
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
