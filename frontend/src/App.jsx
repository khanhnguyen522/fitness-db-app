import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Members from "./components/Members";
import Classes from "./components/Classes";
import Trainers from "./components/Trainers";
import Bookings from "./components/Bookings";
import Invoices from "./components/Invoices";
import Schedules from "./components/Schedules";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const pages = [
    { id: "dashboard", label: "Dashboard" },
    { id: "members", label: "Members" },
    { id: "classes", label: "Classes" },
    { id: "schedules", label: "Schedules" },
    { id: "trainers", label: "Trainers" },
    { id: "bookings", label: "Bookings" },
    { id: "invoices", label: "Invoices" },
  ];

  return (
    <div className="app">
      <header className="header">
        <h1>FitOps</h1>
        <nav className="nav">
          {pages.map((page) => (
            <button
              key={page.id}
              className={`nav-btn ${activePage === page.id ? "active" : ""}`}
              onClick={() => setActivePage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="main">
        {activePage === "dashboard" && <Dashboard />}
        {activePage === "members" && <Members />}
        {activePage === "classes" && <Classes />}
        {activePage === "schedules" && <Schedules />}
        {activePage === "trainers" && <Trainers />}
        {activePage === "bookings" && <Bookings />}
        {activePage === "invoices" && <Invoices />}
      </main>
    </div>
  );
}

export default App;
