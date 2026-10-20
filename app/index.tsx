import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';

export default function Index() {
  const { user, isInitializing } = useAuthStore();
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }
  if (user) return <Redirect href="/home" />;
  return <Redirect href="/login" />;
}

