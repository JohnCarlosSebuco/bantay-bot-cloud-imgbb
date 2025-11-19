const STORAGE_KEY = '@detection_history';
const MAX_HISTORY_ITEMS = 100;

class DetectionHistoryService {
  /**
   * Add a new detection event to history
   */
  async addDetection(detectionData) {
    try {
      const history = await this.getHistory();

      const newDetection = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: detectionData.type || 'bird',
        confidence: detectionData.confidence || 0,
        position: detectionData.position || { x: 0, y: 0 },
        size: detectionData.size || 0,
        ...detectionData,
      };

      // Add to beginning of array
      history.unshift(newDetection);

      // Keep only last MAX_HISTORY_ITEMS
      const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));

      return newDetection;
    } catch (error) {
      console.error('Error adding detection:', error);
      return null;
    }
  }

  /**
   * Get all detection history
   */
  async getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Get detections for today
   */
  async getTodayDetections() {
    try {
      const history = await this.getHistory();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return history.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= today;
      });
    } catch (error) {
      console.error('Error getting today detections:', error);
      return [];
    }
  }

  /**
   * Get detection statistics
   */
  async getStatistics() {
    try {
      const history = await this.getHistory();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayDetections = history.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= today;
      });

      // Group by hour
      const hourlyData = new Array(24).fill(0);
      todayDetections.forEach(item => {
        const hour = new Date(item.timestamp).getHours();
        hourlyData[hour]++;
      });

      // Find peak hour
      let peakHour = 0;
      let maxDetections = 0;
      hourlyData.forEach((count, hour) => {
        if (count > maxDetections) {
          maxDetections = count;
          peakHour = hour;
        }
      });

      // Calculate average detections per hour
      const activeHours = hourlyData.filter(count => count > 0).length;
      const avgPerHour = activeHours > 0 ? todayDetections.length / activeHours : 0;

      return {
        totalToday: todayDetections.length,
        totalAllTime: history.length,
        peakHour,
        peakHourDetections: maxDetections,
        avgPerHour: Math.round(avgPerHour * 10) / 10,
        hourlyData,
        lastDetection: history[0] || null,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalToday: 0,
        totalAllTime: 0,
        peakHour: 0,
        peakHourDetections: 0,
        avgPerHour: 0,
        hourlyData: new Array(24).fill(0),
        lastDetection: null,
      };
    }
  }

  /**
   * Get weekly detection data for charts
   */
  async getWeeklyData() {
    try {
      const history = await this.getHistory();
      const weekData = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayCount = history.filter(d => {
          const dDate = new Date(d.timestamp);
          return dDate >= date && dDate < nextDate;
        }).length;

        weekData.push({
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en', { weekday: 'short' }),
          count: dayCount,
        });
      }

      return weekData;
    } catch (error) {
      console.error('Error getting weekly data:', error);
      return [];
    }
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  /**
   * Delete a specific detection by ID
   */
  async deleteDetection(id) {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting detection:', error);
      return false;
    }
  }

  /**
   * Export history as JSON for download
   */
  async exportHistory() {
    try {
      const history = await this.getHistory();
      const stats = await this.getStatistics();
      const weeklyData = await this.getWeeklyData();

      const exportData = {
        exportDate: new Date().toISOString(),
        statistics: stats,
        weeklyData,
        detections: history,
      };

      // Create downloadable blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bantaybot-detections-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return exportData;
    } catch (error) {
      console.error('Error exporting history:', error);
      return null;
    }
  }

  /**
   * Add demo detection data for testing
   */
  async addDemoData() {
    try {
      const demoDetections = [
        { type: 'bird', confidence: 85, position: { x: 120, y: 80 }, size: 15 },
        { type: 'bird', confidence: 92, position: { x: 200, y: 150 }, size: 18 },
        { type: 'bird', confidence: 78, position: { x: 180, y: 95 }, size: 12 },
      ];

      for (const detection of demoDetections) {
        await this.addDetection(detection);
        // Add small delay to simulate realistic timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return true;
    } catch (error) {
      console.error('Error adding demo data:', error);
      return false;
    }
  }
}

const detectionHistoryService = new DetectionHistoryService();

export default detectionHistoryService;