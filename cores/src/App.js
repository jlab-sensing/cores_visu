import React from "react";
import { HashRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import "./App.css"; // make sure CSS is imported

// Pages
import DualGraphsPage from "./pages/DualGraphsPage";
import SingleGraphsPage from "./pages/SingleGraphsPage";
import StatisticsPage from "./pages/StatisticsPage";

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Logo (video) */}
        <video
          src="/animation.mp4"
          autoPlay
          muted
          playsInline
          className="logo-video"
        />

        {/* Navbar */}
        <nav className="navbar">
          <NavLink to="/" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Dual Graphs
          </NavLink>
          <NavLink to="/single" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Single Graphs
          </NavLink>
          <NavLink to="/statistics" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Statistics Page
          </NavLink>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<DualGraphsPage />} />
          <Route path="/single" element={<SingleGraphsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
