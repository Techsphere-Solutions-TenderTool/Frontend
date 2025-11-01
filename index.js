// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./src/App";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.af-south-1.amazonaws.com/af-south-1_A3ZhkVtjP",
  client_id: "6hrvpmrv13cf2tnj3en148i38q",
  redirect_uri: "http://localhost:5173/",
  response_type: "code",
  scope: "email openid profile",
};

const root = ReactDOM.createRoot(document.getElementById("root"));

// wrap the application with AuthProvider
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);