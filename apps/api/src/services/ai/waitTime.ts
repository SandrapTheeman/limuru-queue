// Wait Time Prediction Service
// ML-based wait time predictions using historical data

export interface WaitTimePrediction {
  department: string;
  predictedWaitMinutes: number;
  confidence: number;
  factors: {
    currentQueueLength: number;
    averageConsultationTime: number;
    availableDoctors: number;
    timeOfDay: string;
    dayOfWeek: string;
    historicalSamples: number;
  };
  calculatedAt: string;
  validUntil: string;
}

export interface QueueStats {
  waitingCount: number;
  calledCount: number;
  inProgressCount: number;
  averageWaitTime: number;
}

export class WaitTimeService {
  // Default consultation times by department (in minutes)
  private defaultConsultationTimes: Record<string, number> = {
    'MED': 20,  // General Medicine
    'SUR': 30,  // Surgery
    'PED': 15,  // Pediatrics
    'OBS': 25,  // Obstetrics
    'GYN': 20,  // Gynecology
    'ORT': 25,  // Orthopedics
    'CAR': 30,  // Cardiology
    'DER': 15,  // Dermatology
    'EYE': 20,  // Ophthalmology
    'ENT': 15,  // ENT
    'DEN': 20,  // Dental
    'PSY': 45,  // Psychiatry
    'EMG': 15,  // Emergency
  };

  // Calculate wait time based on queue and historical data
  async predict(
    db: D1Database,
    department: string,
    consultationHistory?: Array<{ duration_minutes: number; hour_of_day: number; day_of_week: number }>
  ): Promise<WaitTimePrediction> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Get current queue stats
    const queueStats = await this.getQueueStats(db, department);
    
    // Get historical average for current time
    const historicalData = consultationHistory || [];
    const relevantHistory = historicalData.filter(h => 
      h.hour_of_day === hour && h.day_of_week === dayOfWeek
    );
    
    // Calculate average consultation time
    let avgConsultationTime = this.defaultConsultationTimes[department] || 20;
    if (relevantHistory.length > 0) {
      const total = relevantHistory.reduce((sum, h) => sum + h.duration_minutes, 0);
      avgConsultationTime = Math.round(total / relevantHistory.length);
    }
    
    // Adjust for time of day (busier during peak hours)
    const peakMultiplier = this.getPeakMultiplier(hour, dayOfWeek);
    
    // Calculate predicted wait time
    const baseWaitTime = queueStats.waitingCount * (avgConsultationTime / 2); // Assuming parallel processing
    const adjustedWaitTime = Math.round(baseWaitTime * peakMultiplier);
    
    // Calculate confidence based on historical data availability
    const confidence = this.calculateConfidence(relevantHistory.length, queueStats.waitingCount);
    
    const prediction: WaitTimePrediction = {
      department,
      predictedWaitMinutes: Math.max(5, adjustedWaitTime), // Minimum 5 minutes
      confidence,
      factors: {
        currentQueueLength: queueStats.waitingCount,
        averageConsultationTime: avgConsultationTime,
        availableDoctors: 1, // Would be fetched from doctors table
        timeOfDay: `${hour}:00`,
        dayOfWeek: this.getDayName(dayOfWeek),
        historicalSamples: relevantHistory.length,
      },
      calculatedAt: now.toISOString(),
      validUntil: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), // 5 minutes
    };
    
    return prediction;
  }

  // Get current queue stats from database
  private async getQueueStats(db: D1Database, department: string): Promise<QueueStats> {
    try {
      const waiting = await db.prepare(`
        SELECT COUNT(*) as count FROM queue_tickets 
        WHERE department = ? AND status = 'waiting'
      `).bind(department).first() as { count: number } | undefined;
      
      const called = await db.prepare(`
        SELECT COUNT(*) as count FROM queue_tickets 
        WHERE department = ? AND status = 'called'
      `).bind(department).first() as { count: number } | undefined;
      
      const inProgress = await db.prepare(`
        SELECT COUNT(*) as count FROM queue_tickets 
        WHERE department = ? AND status = 'in_progress'
      `).bind(department).first() as { count: number } | undefined;
      
      // Get average wait time for completed queue_tickets today
      const avgWait = await db.prepare(`
        SELECT AVG(wait_time_minutes) as avg 
        FROM queue_tickets 
        WHERE department = ? 
          AND status = 'completed'
          AND date(completed_at) = date('now')
      `).bind(department).first() as { avg: number } | undefined;
      
      return {
        waitingCount: waiting?.count || 0,
        calledCount: called?.count || 0,
        inProgressCount: inProgress?.count || 0,
        averageWaitTime: Math.round(avgWait?.avg || 20),
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        waitingCount: 0,
        calledCount: 0,
        inProgressCount: 0,
        averageWaitTime: 20,
      };
    }
  }

  // Get multiplier for peak hours
  private getPeakMultiplier(hour: number, dayOfWeek: number): number {
    // Weekends are typically slower
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 0.7;
    }
    
    // Morning peak (9-11)
    if (hour >= 9 && hour <= 11) {
      return 1.3;
    }
    
    // Lunch peak (12-14)
    if (hour >= 12 && hour <= 14) {
      return 1.1;
    }
    
    // Afternoon peak (15-17)
    if (hour >= 15 && hour <= 17) {
      return 1.2;
    }
    
    // Late evening (after 18)
    if (hour >= 18) {
      return 0.8;
    }
    
    // Early morning (before 9)
    if (hour < 9) {
      return 0.6;
    }
    
    return 1.0;
  }

  // Calculate confidence based on data availability
  private calculateConfidence(historicalSamples: number, currentQueueLength: number): number {
    // Base confidence from historical data
    let confidence = Math.min(0.9, historicalSamples / 20);
    
    // Adjust for queue length (less confident when queue is very long or empty)
    if (currentQueueLength > 10) {
      confidence *= 0.8;
    }
    if (currentQueueLength === 0) {
      confidence *= 0.7;
    }
    
    return Math.round(confidence * 100) / 100;
  }

  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }

  // Get predictions for all departments
  async predictAll(db: D1Database, departments: string[]): Promise<WaitTimePrediction[]> {
    const predictions: WaitTimePrediction[] = [];
    
    for (const dept of departments) {
      try {
        const prediction = await this.predict(db, dept);
        predictions.push(prediction);
      } catch (error) {
        console.error(`Error predicting for ${dept}:`, error);
      }
    }
    
    return predictions;
  }
}

export const waitTimeService = new WaitTimeService();
