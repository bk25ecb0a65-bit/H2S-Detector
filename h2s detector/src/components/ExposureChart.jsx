import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const data = [
    { date: "Sep 5", dose: 8 },
    { date: "Sep 6", dose: 12 },
    { date: "Sep 7", dose: 7 },
    { date: "Sep 8", dose: 15 },
    { date: "Sep 9", dose: 11 },
    { date: "Sep 10", dose: 18 },
    { date: "Sep 11", dose: 14 }
];

function ExposureChart() {

    return (

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <h2 className="text-lg font-semibold">
                Cumulative Exposure Trend
            </h2>

            <p className="text-sm text-slate-400 mb-5">
                Estimated exposure over the last 7 days
            </p>

            <div className="h-80">

                <ResponsiveContainer width="100%" height="100%">

                    <LineChart data={data}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="date" />

                        <YAxis />

                        <Tooltip />

                        <Line
                            type="monotone"
                            dataKey="dose"
                            strokeWidth={2}
                        />

                    </LineChart>

                </ResponsiveContainer>

            </div>

        </div>

    );
}

export default ExposureChart;