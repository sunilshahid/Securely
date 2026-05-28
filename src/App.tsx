/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateBin from "./components/CreateBin";
import ViewBin from "./components/ViewBin";
import AdminSetup from "./components/AdminSetup";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./components/AdminPanel";
import AppGuide from "./components/AppGuide";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<CreateBin />} />
        <Route path="/v/:binId" element={<ViewBin />} />
        <Route path="/guide" element={<AppGuide />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminSetup />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
