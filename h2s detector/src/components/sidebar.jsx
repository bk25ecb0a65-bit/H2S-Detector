// import { NavLink } from "react-router-dom";
// import {
//     LayoutDashboard,
//     ScanLine,
//     Users,
//     ShieldCheck,
//     Activity,
//     FlaskConical,
//     FileText
// } from "lucide-react";

// function Sidebar() {

//     return (
//         <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 p-5">

//             <div className="mb-10">
//                 <h1 className="text-xl font-bold">
//                     H₂S Dosimeter
//                 </h1>

//                 <p className="text-xs text-slate-400 mt-1">
//                     Exposure Monitoring
//                 </p>
//             </div>

//             <nav className="space-y-2">

//                 <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800">
//                     <LayoutDashboard size={20} />
//                     Dashboard
//                 </div>

//                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
//                     <ScanLine size={20} />
//                     Scan Badge
//                 </div>

//                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
//                     <Users size={20} />
//                     Workers
//                 </div>

//                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
//                     <ShieldCheck size={20} />
//                     Badges
//                 </div>

//                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
//                     <Activity size={20} />
//                     Exposure
//                 </div>

//                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
//                     <FlaskConical size={20} />
//                     Calibration
//                 </div>

//                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
//                     <FileText size={20} />
//                     Reports
//                 </div>

//             </nav>

//         </aside>
//     );
// }

// export default Sidebar;

import {
    LayoutDashboard,
    ScanLine,
    Users,
    Activity,
    FlaskConical
} from "lucide-react";

import { NavLink } from "react-router-dom";


function Sidebar() {

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 p-5">

            {/* Logo / Title */}
            <div className="mb-10">

                <h1 className="text-xl font-bold">
                    H₂S Dosimeter
                </h1>

                <p className="text-xs text-slate-400 mt-1">
                    Exposure Monitoring
                </p>

            </div>


            {/* Navigation */}
            <nav className="space-y-2">

                <NavLink
                    to="/"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800"
                >
                    <LayoutDashboard size={20} />
                    Dashboard
                </NavLink>


                <NavLink
                    to="/scan"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800"
                >
                    <ScanLine size={20} />
                    Scan Badge
                </NavLink>


                <NavLink
                    to="/workers"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800"
                >
                    <Users size={20} />
                    Workers
                </NavLink>

                <NavLink
                    to="/exposure"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800"
                >
                    <Activity size={20} />
                    Exposure
                </NavLink>


                <NavLink
                    to="/calibration"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800"
                >
                    <FlaskConical size={20} />
                    Calibration
                </NavLink>

            </nav>

        </aside>
    );
}


export default Sidebar;