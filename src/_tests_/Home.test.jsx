import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../pages/Home.jsx";
import { PrefsContext } from "../contexts/PrefsContext.js";
import { BrowserRouter } from "react-router-dom";

function mockCtx() {
  return {
    canSave: true,
    savedTenders: [],
    addSavedTender: () => {},
    removeSavedTender: () => {}
  };
}

describe("Home Page", () => {
  it("renders hero text", () => {
    render(
      <BrowserRouter>
        <PrefsContext.Provider value={mockCtx()}>
          <Home />
        </PrefsContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText(/South Africa's smartest way to find tenders/i)).toBeInTheDocument();
  });

  it("shows search button", () => {
    render(
      <BrowserRouter>
        <PrefsContext.Provider value={mockCtx()}>
          <Home />
        </PrefsContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });
});
