import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useMenuStore } from '../../store/useMenuStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useExpensesStore } from '../../store/useExpensesStore';
import { useKYCStore } from '../../store/useKYCStore';
import { HomeIcon, ClipboardDocumentListIcon, CubeIcon, BanknotesIcon, SparklesIcon } from '../../components/Icons';
import { FloatingTabBar } from '../../components/FloatingTabBar';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  const { user, isInitializing } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const unsubMenu = useMenuStore.getState().subscribe(user.uid);
    const unsubCats = useMenuStore.getState().subscribeCategories(user.uid);
    const unsubInv = useInventoryStore.getState().subscribe(user.uid);
    const unsubExp = useExpensesStore.getState().subscribe(user.uid);
    useKYCStore.getState().loadKYC(user.uid);
    return () => { unsubMenu(); unsubCats(); unsubInv(); unsubExp(); };
  }, [user?.uid]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <ClipboardDocumentListIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <CubeIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Gastos',
          tabBarIcon: ({ color, size }) => <BanknotesIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <SparklesIcon size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
