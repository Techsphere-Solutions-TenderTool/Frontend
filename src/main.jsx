// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App.jsx";
import "./styles/techsphere.css";

// ---- your Cognito values ----
const COGNITO_POOL_ID = "af-south-1_A3ZhkVtjP";
const CLIENT_ID = "6hrvpmrv13cf2tnj3en148i38q";
const REDIRECT_URI = "http://localhost:5173/";

const authConfig = {
  authority: `https://cognito-idp.af-south-1.amazonaws.com/${COGNITO_POOL_ID}`,
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: "email openid profile",
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...authConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
