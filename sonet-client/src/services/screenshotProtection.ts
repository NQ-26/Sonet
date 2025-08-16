import * as ScreenCapture from '#/shims/expo-screen-capture';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScreenshotProtectionConfig {
  enabled: boolean;
  blockScreenshots: boolean;
  blockScreenRecording: boolean;
  showWarning: boolean;
}

export class ScreenshotProtectionService {
  private static instance: ScreenshotProtectionService;
  private config: ScreenshotProtectionConfig = {
    enabled: false,
    blockScreenshots: true,
    blockScreenRecording: true,
    showWarning: true,
  };

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ScreenshotProtectionService {
    if (!ScreenshotProtectionService.instance) {
      ScreenshotProtectionService.instance = new ScreenshotProtectionService();
    }
    return ScreenshotProtectionService.instance;
  }

  /**
   * Load screenshot protection configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('screenshotProtectionConfig');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load screenshot protection config:', error);
    }
  }

  /**
   * Save screenshot protection configuration to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('screenshotProtectionConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save screenshot protection config:', error);
    }
  }

  /**
   * Enable screenshot protection for sensitive content (DMs)
   */
  public async enableProtection(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      if (this.config.blockScreenshots) {
        await ScreenCapture.preventScreenCaptureAsync();
      }
      
      if (this.config.blockScreenRecording) {
        await ScreenCapture.preventScreenRecordingAsync();
      }
    } catch (error) {
      console.warn('Failed to enable screenshot protection:', error);
    }
  }

  /**
   * Disable screenshot protection (for non-sensitive screens)
   */
  public async disableProtection(): Promise<void> {
    try {
      await ScreenCapture.allowScreenCaptureAsync();
      await ScreenCapture.allowScreenRecordingAsync();
    } catch (error) {
      console.warn('Failed to disable screenshot protection:', error);
    }
  }

  /**
   * Update screenshot protection configuration
   */
  public async updateConfig(newConfig: Partial<ScreenshotProtectionConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
    
    // Apply new configuration immediately
    if (this.config.enabled) {
      await this.enableProtection();
    } else {
      await this.disableProtection();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ScreenshotProtectionConfig {
    return { ...this.config };
  }

  /**
   * Check if screenshot protection is supported on current platform
   */
  public isSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get platform-specific limitations
   */
  public getPlatformLimitations(): string[] {
    const limitations: string[] = [];
    
    if (Platform.OS === 'ios') {
      limitations.push(
        'Screenshots cannot be completely prevented on iOS due to system limitations',
        'Screen recording blocking may not work on all iOS versions',
        'Some system-level screenshots (like AssistiveTouch) cannot be blocked'
      );
    } else if (Platform.OS === 'android') {
      limitations.push(
        'Screenshot blocking works on most Android devices',
        'Some custom ROMs may bypass protection',
        'Screen recording blocking depends on Android version'
      );
    }
    
    return limitations;
  }

  /**
   * Check if protection is currently active
   */
  public async isProtectionActive(): Promise<boolean> {
    try {
      // This is a simplified check - in practice you'd need more sophisticated detection
      return this.config.enabled;
    } catch (error) {
      return false;
    }
  }

  /**
   * Show warning about screenshot protection limitations
   */
  public getWarningMessage(): string {
    if (Platform.OS === 'ios') {
      return '⚠️ iOS Limitation: Screenshots cannot be completely prevented on iPhone due to underlying system restrictions. This setting provides the maximum protection possible within iOS constraints.';
    }
    
    return '🔒 Screenshot protection is enabled. This will block most screenshot and screen recording attempts.';
  }

  /**
   * Get recommended settings for optimal protection
   */
  public getRecommendedSettings(): ScreenshotProtectionConfig {
    return {
      enabled: true,
      blockScreenshots: true,
      blockScreenRecording: true,
      showWarning: true,
    };
  }
}

export default ScreenshotProtectionService.getInstance();