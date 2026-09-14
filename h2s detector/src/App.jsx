import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import ScanBadge from "./pages/ScanBadge.jsx";
import Workers from "./pages/Workers.jsx";
import ExposureHistory from "./pages/ExposureHistory.jsx";

function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route element={<DashboardLayout />}>

                    <Route path="/" element={<Dashboard />} />

                    <Route path="/scan" element={<ScanBadge />} />

                    <Route path="/workers" element={<Workers />} />

                    <Route path="/exposure" element={<ExposureHistory />} />
                </Route>

            </Routes>

        </BrowserRouter>

    );
}

export default App;
