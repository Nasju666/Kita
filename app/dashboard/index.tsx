// This screen has moved to app/(tabs)/home.tsx
// Redirect any old /dashboard links to the new tab route.
import { Redirect } from 'expo-router';

export default function DashboardRedirect() {
  return <Redirect href="/home" />;
}
