// Network Discovery Service for Web PWA
// Adapted from React Native version for web browser compatibility

class NetworkDiscoveryService {
  constructor() {
    this.isScanning = false;
    this.scanResults = [];
  }

  // Get base IP from current IP address
  getBaseIP(ipAddress) {
    if (!ipAddress || typeof ipAddress !== 'string') {
      return '192.168.1'; // Default fallback
    }

    const parts = ipAddress.split('.');
    if (parts.length !== 4) {
      return '192.168.1'; // Default fallback
    }

    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  // Test connection to a specific IP and port
  async testDevice(ip, port, type = 'unknown') {
    const timeout = 3000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let endpoint = '/status';
      if (type === 'camera') {
        endpoint = '/stream'; // Camera endpoint
      }

      const response = await fetch(`http://${ip}:${port}${endpoint}`, {
        method: 'HEAD', // Use HEAD to avoid downloading content
        signal: controller.signal,
        mode: 'no-cors' // Allow cross-origin requests
      });

      clearTimeout(timeoutId);

      // For no-cors mode, we can't read status but if it doesn't throw, it's likely reachable
      return {
        ip,
        port,
        type,
        reachable: true,
        timestamp: new Date()
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // For web browsers, we can't really detect if a device is a BantayBot
      // So we'll try alternative detection methods
      if (error.name === 'AbortError') {
        return null; // Timeout
      }

      // Try a simple ping-like request
      try {
        const pingResponse = await fetch(`http://${ip}:${port}/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(1000),
          mode: 'no-cors'
        });

        return {
          ip,
          port,
          type: 'unknown',
          reachable: true,
          timestamp: new Date()
        };
      } catch (pingError) {
        return null; // Device not reachable
      }
    }
  }

  // Scan a range of IP addresses for BantayBot devices
  async scanIPRange(baseIP, startRange = 1, endRange = 254, onProgress = null) {
    console.log(`[NetworkDiscoveryService] Scanning ${baseIP}.${startRange}-${endRange}`);

    this.isScanning = true;
    this.scanResults = [];

    const promises = [];
    const total = endRange - startRange + 1;
    let completed = 0;

    // Common BantayBot ports
    const testConfigs = [
      { port: 80, type: 'camera' },
      { port: 81, type: 'main' },
      { port: 8080, type: 'camera' }, // Alternative camera port
      { port: 3000, type: 'web' }    // Alternative web interface
    ];

    for (let i = startRange; i <= endRange; i++) {
      const ip = `${baseIP}.${i}`;

      // Test all port combinations for this IP
      const ipPromises = testConfigs.map(config =>
        this.testDevice(ip, config.port, config.type).then(result => {
          completed++;

          if (onProgress) {
            const progress = (completed / (total * testConfigs.length)) * 100;
            onProgress(progress, completed, total * testConfigs.length);
          }

          return result;
        }).catch(() => {
          completed++;

          if (onProgress) {
            const progress = (completed / (total * testConfigs.length)) * 100;
            onProgress(progress, completed, total * testConfigs.length);
          }

          return null;
        })
      );

      promises.push(...ipPromises);
    }

    try {
      const results = await Promise.all(promises);
      const validResults = results.filter(result => result !== null);

      // Group results by IP address
      const deviceMap = new Map();

      validResults.forEach(result => {
        const key = result.ip;
        if (!deviceMap.has(key)) {
          deviceMap.set(key, {
            ip: result.ip,
            ports: [],
            types: new Set(),
            timestamp: result.timestamp
          });
        }

        const device = deviceMap.get(key);
        device.ports.push(result.port);
        device.types.add(result.type);
      });

      // Convert map to array and determine likely device types
      this.scanResults = Array.from(deviceMap.values()).map(device => {
        const types = Array.from(device.types);
        let deviceType = 'unknown';

        // Determine device type based on ports and responses
        if (types.includes('camera') && device.ports.includes(80)) {
          deviceType = 'camera';
        } else if (types.includes('main') && device.ports.includes(81)) {
          deviceType = 'main';
        } else if (device.ports.length > 1) {
          deviceType = 'bantaybot'; // Multiple ports suggest it's a BantayBot device
        }

        return {
          ip: device.ip,
          ports: device.ports,
          type: deviceType,
          name: this.generateDeviceName(device.ip, deviceType),
          timestamp: device.timestamp,
          useMDNS: false // Web doesn't support mDNS discovery
        };
      });

      console.log(`[NetworkDiscoveryService] Scan complete. Found ${this.scanResults.length} devices:`, this.scanResults);
      return this.scanResults;
    } finally {
      this.isScanning = false;
    }
  }

  // Generate a friendly device name
  generateDeviceName(ip, type) {
    const lastOctet = ip.split('.').pop();

    switch (type) {
      case 'camera':
        return `BantayBot Camera (${lastOctet})`;
      case 'main':
        return `BantayBot Main (${lastOctet})`;
      case 'bantaybot':
        return `BantayBot Device (${lastOctet})`;
      default:
        return `Device ${lastOctet}`;
    }
  }

  // Smart discovery: Try to detect network automatically
  async smartDiscover(baseIP = null, onProgress = null) {
    console.log('[NetworkDiscoveryService] Starting smart discovery...');

    // If no base IP provided, try to detect it
    if (!baseIP) {
      baseIP = await this.detectNetworkBaseIP();
    }

    console.log(`[NetworkDiscoveryService] Using base IP: ${baseIP}`);

    // Scan the network range
    return await this.scanIPRange(baseIP, 1, 254, onProgress);
  }

  // Attempt to detect the network base IP (limited in browsers)
  async detectNetworkBaseIP() {
    // In a browser, we can't easily detect the local IP
    // We'll use common network ranges
    const commonRanges = [
      '192.168.1',
      '192.168.0',
      '10.0.0',
      '172.16.0',
      '172.24.26' // Based on the default config
    ];

    // Try a quick test on each range to see which responds
    for (const range of commonRanges) {
      const testIP = `${range}.1`;
      const isReachable = await this.quickPing(testIP);

      if (isReachable) {
        console.log(`[NetworkDiscoveryService] Detected network range: ${range}`);
        return range;
      }
    }

    // Default fallback
    console.log('[NetworkDiscoveryService] Using default network range: 192.168.1');
    return '192.168.1';
  }

  // Quick ping test for network detection
  async quickPing(ip) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      await fetch(`http://${ip}/`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get the last scan results
  getLastResults() {
    return [...this.scanResults];
  }

  // Check if currently scanning
  getIsScanning() {
    return this.isScanning;
  }

  // Cancel current scan
  cancelScan() {
    this.isScanning = false;
    console.log('[NetworkDiscoveryService] Scan cancelled');
  }

  // Validate if an IP looks like a BantayBot device
  async validateBantayBotDevice(ip) {
    const promises = [
      this.testDevice(ip, 80, 'camera'),
      this.testDevice(ip, 81, 'main')
    ];

    try {
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);

      if (validResults.length > 0) {
        return {
          isValid: true,
          ip,
          ports: validResults.map(r => r.port),
          types: validResults.map(r => r.type)
        };
      }

      return { isValid: false, ip };
    } catch (error) {
      return { isValid: false, ip, error: error.message };
    }
  }
}

// Create singleton instance
const networkDiscoveryService = new NetworkDiscoveryService();

export default networkDiscoveryService;