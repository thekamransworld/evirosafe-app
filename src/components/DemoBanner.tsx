import React from "react";

export const DemoBanner: React.FC = () => {
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-400/40 text-amber-900 text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/40 text-xs font-bold">
            DEMO
          </span>
          <p className="font-medium">
            This is a <span className="font-semibold">demo / mock</span> EviroSafe
            environment. Data does not represent a live project.
          </p>
        </div>
        <p className="text-xs text-amber-800/80">
          Use it to explore incident reporting, PTW, RAMS and inspection workflows.
        </p>
      </div>
    </div>
  );
};
