import json
import sys
import logging
import statistics
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Final

# Configuration / Constants
WEIGHTS: Final[Dict[str, float]] = {'current': 0.4, 'history': 0.3, 'time': 0.2, 'event': 0.1}

class CongestionLevel(Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

@dataclass(frozen=True)
class PredictionResult:
    route: str
    congestion_level: str
    probability_pct: int
    delay_mins: int
    confidence_pct: int
    pre_congestion_alert: bool
    explanation: str

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

class TrafficPredictor:
    """Improved Traffic Prediction Engine with strict validation and error handling."""
    
    def __init__(self):
        # Maps encapsulated to prevent external mutation
        self._current_map = {'low': 15, 'medium': 50, 'high': 90}
        self._time_map = {'morning': 80, 'afternoon': 45, 'evening': 90, 'night': 10}
        self._event_map = {'none': 5, 'holiday': 40, 'parade': 85, 'rain': 75}
        
        # Setup logging for Google Cloud Logging compatibility
        logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
        self.logger = logging.getLogger(__name__)

    def _calculate_confidence(self, history: List[int]) -> int:
        """Calculates confidence based on historical consistency."""
        if len(history) < 2:
            return 100
        try:
            variance = statistics.stdev(history)
            return int(max(0, min(100, 100 - (variance * 0.8))))
        except statistics.StatisticsError:
            return 50

    def predict(self, route: str, current: str, time: str, history: List[Union[int, str]], event: str) -> PredictionResult:
        # Input Normalization & Security Sanitization
        current_clean = str(current).strip().lower()
        time_clean = str(time).strip().lower()
        event_clean = str(event).strip().lower()
        
        # Safe Mapping with Default fallbacks
        c_score = self._current_map.get(current_clean, 50)
        t_score = self._time_map.get(time_clean, 50)
        e_score = self._event_map.get(event_clean, 5)
        
        # Safe History Parsing
        try:
            clean_history = [int(x) for x in history]
            h_score = sum(clean_history) / len(clean_history) if clean_history else 50
        except (ValueError, TypeError):
            self.logger.warning(f"Invalid history data for route {route}. Falling back to default.")
            clean_history = []
            h_score = 50

        # Algorithm Calculation
        final_score = (
            (c_score * WEIGHTS['current']) +
            (h_score * WEIGHTS['history']) +
            (t_score * WEIGHTS['time']) +
            (e_score * WEIGHTS['event'])
        )

        # Result Logic
        level = (CongestionLevel.LOW if final_score < 40 else 
                 CongestionLevel.MEDIUM if final_score < 75 else 
                 CongestionLevel.HIGH).value
        
        delay_mins = round((final_score / 100) * 25)
        confidence = self._calculate_confidence(clean_history)
        alert = bool(current_clean == 'low' and final_score >= 60)

        explanation = f"Base score: {round(final_score)}. "
        explanation += "ALERT: Sudden spike predicted." if alert else "Normal traffic pattern expected."

        return PredictionResult(
            route=route,
            congestion_level=level,
            probability_pct=round(final_score),
            delay_mins=delay_mins,
            confidence_pct=confidence,
            pre_congestion_alert=alert,
            explanation=explanation
        )

def main():
    """Entry point with improved error management and JSON serialization."""
    predictor = TrafficPredictor()
    
    test_cases = [
        {"route": "Route_A", "current": "high", "time": "evening", "history": [85, 90, 88, 92, 85], "event": "none"},
        {"route": "Route_B", "current": "low", "time": "night", "history": [10, 12, 8, 15, 10], "event": "none"},
        {"route": "Route_C", "current": "low", "time": "afternoon", "history": [40, 45, 42, 50, 40], "event": "parade"}
    ]

    try:
        results = [predictor.predict(**tc).to_dict() for tc in test_cases]
        # Efficiency: Sort in-place
        results.sort(key=lambda x: x['delay_mins'])
        
        # Security: Use ensure_ascii=False for global character support
        print(json.dumps(results, indent=2, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        # Google Cloud Logging friendly error output
        print(json.dumps({"severity": "ERROR", "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
