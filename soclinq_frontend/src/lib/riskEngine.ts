// src/lib/riskEngine.ts
export function calculateRisk(alert: SosAlert, speed = 0) {
    let score = 0;
  
    if (speed > 15) score += 30;           // rapid movement
    if (alert.accuracy && alert.accuracy > 50) score += 10;
    if (new Date(alert.createdAt).getHours() >= 22) score += 20;
    if (new Date(alert.createdAt).getHours() <= 5) score += 20;
  
    return {
      score,
      level:
        score >= 70 ? "HIGH" :
        score >= 40 ? "MEDIUM" : "LOW",
    };
  }
  