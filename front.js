import React, { useMemo } from 'react';
import { AlertTriangle, Timer, Info, CheckCircle } from 'lucide-react';

// 1. Type Definitions (Security & Quality)
interface RouteData {
  route: string;
  congestion_level: 'Low' | 'Medium' | 'High';
  probability_pct: number;
  delay_mins: number;
  pre_congestion_alert: boolean;
  explanation: string;
  confidence_pct?: number; // Added from Python backend
}

interface RouteCardProps {
  routeData: RouteData;
  isBest: boolean;
}

// 2. Extracted Dynamic Config (Efficiency)
const CONGESTION_THEMES = {
  Low: "bg-green-100 text-green-800 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-red-100 text-red-800 border-red-200"
} as const;

// 3. Sub-component for better maintainability (Quality)
const RouteCard: React.FC<RouteCardProps> = React.memo(({ routeData, isBest }) => {
  const { 
    route, congestion_level, probability_pct, 
    delay_mins, pre_congestion_alert, explanation 
  } = routeData;

  // Sanitize route name to prevent XSS (Security)
  const sanitizedRoute = useMemo(() => route.replace(/[<>]/g, ""), [route]);

  return (
    <article 
      role="region"
      aria-label={`Traffic report for ${sanitizedRoute}`}
      className={`p-5 mb-4 border-2 rounded-xl transition-all duration-300 shadow-sm
        ${isBest ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-white'}
        hover:shadow-md hover:border-blue-300`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {sanitizedRoute}
            {isBest && <CheckCircle className="w-5 h-5 text-blue-600" aria-label="Best Route" />}
          </h3>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">Route ID: {btoa(route).slice(0, 8)}</p>
        </div>
        
        <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${CONGESTION_THEMES[congestion_level]}`}>
          {congestion_level} | {probability_pct}% Risk
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Timer className="w-4 h-4" />
          <span className="text-sm font-medium"><strong className="text-lg">{delay_mins}</strong> min delay</span>
        </div>
        {/* Visual progress bar for congestion probability */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className={`h-2.5 rounded-full ${congestion_level === 'High' ? 'bg-red-500' : 'bg-green-500'}`} 
            style={{ width: `${probability_pct}%` }}
          ></div>
        </div>
      </div>

      <div className="flex gap-2 p-3 bg-white/50 rounded border border-gray-100">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600 leading-relaxed italic">
          {explanation}
        </p>
      </div>

      {pre_congestion_alert && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800 font-semibold">
            Predictive Warning: Traffic spike imminent. Avoid this route.
          </p>
        </div>
      )}
    </article>
  );
});

export default function Dashboard({ routes }: { routes: RouteData[] }) {
  // Efficiency: Pre-processing data
  const sortedRoutes = useMemo(() => [...routes].sort((a, b) => a.delay_mins - b.delay_mins), [routes]);

  if (!routes || routes.length === 0) {
    return <div className="p-10 text-center text-gray-400">Loading Google Maps data...</div>;
  }

  return (
    <main className="max-w-2xl mx-auto p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          SmartPath <span className="text-blue-600">Predict</span>
        </h1>
        <p className="text-gray-500 text-sm">Real-time predictive analysis via Google Vertex AI</p>
      </header>
      
      <section>
        {sortedRoutes.map((route, index) => (
          <RouteCard 
            key={route.route} 
            routeData={route} 
            isBest={index === 0} 
          />
        ))}
      </section>
    </main>
  );
}
