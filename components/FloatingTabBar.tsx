import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { DocumentTextIcon } from './Icons';
import { Colors, Radius } from '../constants/colors';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();

  // One Animated.Value per tab + one for the POS button
  const tabScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const posScale = useRef(new Animated.Value(1)).current;

  const springPress = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.82, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.spring(anim, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 10 }),
    ]).start();
  };

  return (
    <View style={s.wrapper}>
      <View style={s.pill}>
        {/* Tab Items */}
        <View style={s.tabs}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = (options.title ?? route.name) as string;
            const isFocused = state.index === index;
            const icon = options.tabBarIcon?.({
              color: isFocused ? Colors.white : 'rgba(255,255,255,0.45)',
              size: 20,
              focused: isFocused,
            });

            const onPress = () => {
              // Navigate immediately — no waiting for animation
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, {});
              // Animation runs in parallel as pure visual feedback
              springPress(tabScales[index]);
            };

            return (
              <TouchableOpacity key={route.key} style={s.tab} onPress={onPress} activeOpacity={1}>
                <Animated.View style={[s.tabInner, { transform: [{ scale: tabScales[index] }] }]}>
                  {icon}
                  {isFocused && <View style={s.dot} />}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Loan Report Button */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            router.push('/loan-report');
            springPress(posScale);
          }}
        >
          <Animated.View style={[s.posBtn, { transform: [{ scale: posScale }] }]}>
            <DocumentTextIcon size={20} color={Colors.ink} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  pill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  labelActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.white,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
  },
  posBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
});
