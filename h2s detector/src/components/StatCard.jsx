function StatCard({ title, value, description, icon }) {

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <div className="flex justify-between items-start">

                <div>
                    <p className="text-sm text-slate-400">
                        {title}
                    </p>

                    <h2 className="text-3xl font-bold mt-2">
                        {value}
                    </h2>

                    <p className="text-xs text-slate-500 mt-2">
                        {description}
                    </p>
                </div>

                <div className="p-3 bg-slate-800 rounded-lg">
                    {icon}
                </div>

            </div>

        </div>
    );
}

export default StatCard;