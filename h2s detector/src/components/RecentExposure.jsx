const exposureData = [
    {
        worker: "Ravi Kumar",
        badge: "H2S-00431",
        shift: "Morning",
        dose: 14.3,
        status: "Normal"
    },
    {
        worker: "Arjun Rao",
        badge: "H2S-00432",
        shift: "Night",
        dose: 21.7,
        status: "Review"
    },
    {
        worker: "Rahul Singh",
        badge: "H2S-00433",
        shift: "Morning",
        dose: 6.2,
        status: "Normal"
    },
    {
        worker: "Vikram Patel",
        badge: "H2S-00434",
        shift: "Evening",
        dose: 18.5,
        status: "Review"
    }
];


function RecentExposure() {

    return (

        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5">

            <div className="mb-5">

                <h2 className="text-lg font-semibold">
                    Recent Exposure Measurements
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                    Latest badge scans and estimated cumulative exposure
                </p>

            </div>


            <div className="overflow-x-auto">

                <table className="w-full text-sm">

                    <thead>

                        <tr className="border-b border-slate-800 text-slate-400">

                            <th className="text-left py-3">
                                Worker
                            </th>

                            <th className="text-left py-3">
                                Badge ID
                            </th>

                            <th className="text-left py-3">
                                Shift
                            </th>

                            <th className="text-left py-3">
                                Dose
                            </th>

                            <th className="text-left py-3">
                                Status
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {exposureData.map((item, index) => (

                            <tr
                                key={index}
                                className="border-b border-slate-800"
                            >

                                <td className="py-4">
                                    {item.worker}
                                </td>

                                <td className="py-4 text-slate-400">
                                    {item.badge}
                                </td>

                                <td className="py-4">
                                    {item.shift}
                                </td>

                                <td className="py-4">
                                    {item.dose} ppm·hr
                                </td>

                                <td className="py-4">

                                    <span
                                        className={
                                            item.status === "Normal"
                                                ? "px-3 py-1 rounded-full text-xs bg-green-500/10 text-green-400"
                                                : "px-3 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400"
                                        }
                                    >
                                        {item.status}
                                    </span>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

    );
}

export default RecentExposure;