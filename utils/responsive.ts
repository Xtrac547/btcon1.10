import { useWindowDimensions, Platform } from 'react-native';
import { useMemo } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  scale: (size: number) => number;
  isSmallPhone: boolean;
  isLargePhone: boolean;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isPortrait = height >= width;
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    
    let deviceType: DeviceType = 'phone';
    if (Platform.OS === 'web') {
      if (width >= 1024) deviceType = 'desktop';
      else if (width >= 768) deviceType = 'tablet';
    } else {
      if (minDimension >= 600) deviceType = 'tablet';
    }

    const isSmallPhone = deviceType === 'phone' && maxDimension < 700;
    const isLargePhone = deviceType === 'phone' && maxDimension >= 700;
    
    const baseWidth = 375;
    const scale = (size: number) => {
      if (deviceType === 'tablet') {
        return Math.round(size * 1.3);
      }
      if (deviceType === 'desktop') {
        return Math.round(size * 1.5);
      }
      if (isSmallPhone) {
        return Math.round(size * 0.9);
      }
      const scaleFactor = width / baseWidth;
      return Math.round(size * Math.min(scaleFactor, 1.2));
    };

    return {
      width,
      height,
      deviceType,
      orientation: isPortrait ? 'portrait' : 'landscape',
      isPhone: deviceType === 'phone',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isPortrait,
      isLandscape: !isPortrait,
      scale,
      isSmallPhone,
      isLargePhone,
    };
  }, [width, height]);
}
