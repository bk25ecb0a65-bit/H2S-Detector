import {
    Users,
    ShieldCheck,
    AlertTriangle,
    ScanLine
} from "lucide-react";
import ExposureChart from "../components/ExposureChart";
import StatCard from "../components/StatCard";
import RecentExposure from "../components/RecentExposure";

function Dashboard() {

    return (

        <div>

            <div className="mb-8">

                <h1 className="text-3xl font-bold">
                    H₂S Exposure Dashboard
                </h1>

                <p className="text-slate-400 mt-2">
                    Monitor cumulative exposure and badge validity.
                </p>

            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

                <StatCard
                    title="Total Workers"
                    value="128"
                    description="Registered workers"
                    icon={<Users />}
                />

                <StatCard
                    title="Active Badges"
                    value="114"
                    description="Currently valid"
                    icon={<ShieldCheck />}
                />

                <StatCard
                    title="Expired Badges"
                    value="7"
                    description="Require replacement"
                    icon={<AlertTriangle />}
                />

                <StatCard
                    title="Today's Scans"
                    value="42"
                    description="Exposure measurements"
                    icon={<ScanLine />}
                />

            </div>

            <div className="mt-6">
                <ExposureChart />
            </div>

            <RecentExposure />

        </div>

    );
}

export default Dashboard;