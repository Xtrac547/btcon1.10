import '@/utils/shim';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WalletProvider } from "@/contexts/WalletContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { UserImageProvider } from "@/contexts/UserImageContext";
import { DeveloperHierarchyProvider } from "@/contexts/DeveloperHierarchyContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { QRColorProvider } from "@/contexts/QRColorContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="wallet" options={{ headerShown: false }} />
      <Stack.Screen name="receive" options={{ headerShown: false }} />
      <Stack.Screen name="send" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="developer-hierarchy" options={{ headerShown: false }} />
      <Stack.Screen name="profile-image" options={{ headerShown: false }} />
      <Stack.Screen name="buy-btc" options={{ headerShown: false }} />
      <Stack.Screen name="setup-auth" options={{ headerShown: false }} />
      <Stack.Screen name="verify-auth" options={{ headerShown: false }} />
      <Stack.Screen name="stories" options={{ headerShown: false }} />
      <Stack.Screen name="coin-flip" options={{ headerShown: false }} />
      <Stack.Screen name="following" options={{ headerShown: false }} />
      <Stack.Screen name="btc-price" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const initApp = async () => {
      try {
        if (Platform.OS !== 'web') {
          const alreadyAsked = await AsyncStorage.getItem('btcon_camera_permission_asked');
          if (!alreadyAsked) {
            const { status } = await Camera.requestCameraPermissionsAsync();
            console.log('Camera permission status:', status);
            await AsyncStorage.setItem('btcon_camera_permission_asked', 'true');
          }
        }
      } catch (error) {
        console.log('Error requesting camera permission:', error);
      }

      try {
        if (Platform.OS !== 'web') {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.log('Error hiding splash:', error);
      }
    };
    
    void initApp();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <AuthProvider>
            <NotificationProvider>
              <DeveloperHierarchyProvider>
                <UserImageProvider>
                  <QRColorProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <RootLayoutNav />
                      </GestureHandlerRootView>
                  </QRColorProvider>
                </UserImageProvider>
              </DeveloperHierarchyProvider>
            </NotificationProvider>
          </AuthProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
