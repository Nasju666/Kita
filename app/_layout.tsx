import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { Colors } from '../constants/colors';

export default function RootLayout() {
  const { isInitializing, initAuthListener } = useAuthStore();
  const { loadLanguage } = useLanguageStore();

  useEffect(() => {
    const unsubscribe = initAuthListener();
    loadLanguage(); // restore persisted language
    return unsubscribe;
  }, []);

  // Show a simple spinner while Firebase checks if user is already logged in
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="index" />
          <Stack.Screen name="login/index" />
          <Stack.Screen name="signup/index" />
          <Stack.Screen name="pos/index" />
          <Stack.Screen name="checkout/index" />
          <Stack.Screen name="insights/index" />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
          <Stack.Screen name="kyc/index" options={{ headerShown: false }} />
          <Stack.Screen name="loan-report/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
