function StatCard({ title, value, description, icon, onClick, badge, alert = false, className = "" }) {
    return (
        <div
            onClick={onClick}
            className={`bg-slate-900 border ${
                alert ? "border-red-500/50 shadow-lg shadow-red-500/5" : "border-slate-800"
            } rounded-xl p-5 transition ${
                onClick ? "cursor-pointer hover:bg-slate-800/60 hover:border-slate-700" : ""
            } ${className}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-400">
                            {title}
                        </p>
                        {badge && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                {badge}
                            </span>
                        )}
                    </div>

                    <h2 className="text-3xl font-bold mt-2 tracking-tight text-white">
                        {value}
                    </h2>

                    <p className="text-xs text-slate-500 mt-2">
                        {description}
                    </p>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl shrink-0 flex items-center justify-center">
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default StatCard;