import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

// Tab screens
import HomeScreen           from '../screens/HomeScreen';
import InspectionScreen     from '../screens/InspectionScreen';
import GuideBrowserScreen   from '../screens/GuideBrowserScreen';
import PrinterAnatomyScreen from '../screens/PrinterAnatomyScreen';
import MoreScreen           from '../screens/MoreScreen';

// Stack / modal screens
import OnboardingScreen          from '../screens/OnboardingScreen';
import PrinterDetailScreen       from '../screens/PrinterDetailScreen';
import LogMaintenanceScreen      from '../screens/LogMaintenanceScreen';
import MaintenanceHistoryScreen  from '../screens/MaintenanceHistoryScreen';
import GuideDetailScreen         from '../screens/GuideDetailScreen';
import PartDetailScreen          from '../screens/PartDetailScreen';
import LessonPlayerScreen        from '../screens/LessonPlayerScreen';
import LearningCompleteScreen    from '../screens/LearningCompleteScreen';
import AboutScreen               from '../screens/AboutScreen';

// Placeholder for screens we'll add in the next sprint
function AddPrinterScreen({ navigation }: any) {
  const C = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} />
  );
}

function SettingsScreen({ navigation }: any) {
  const C = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} />
  );
}

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeTabs() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bgCard,
          borderTopColor:  C.border,
          borderTopWidth:  1,
          height:          tabBarHeight,
          paddingBottom:   insets.bottom + 8,
          paddingTop:      8,
        },
        tabBarShowLabel:         true,
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.textHint,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            HomeTab:    ['home',       'home-outline'],
            InspectTab: ['camera',     'camera-outline'],
            LearnTab:   ['school',     'school-outline'],
            GuidesTab:  ['book',       'book-outline'],
            MoreTab:    ['ellipsis-horizontal', 'ellipsis-horizontal-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['help', 'help-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"    component={HomeScreen}           options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="InspectTab" component={InspectionScreen}     options={{ tabBarLabel: 'Inspect' }} />
      <Tab.Screen name="LearnTab"   component={PrinterAnatomyScreen} options={{ tabBarLabel: 'Learn' }} />
      <Tab.Screen name="GuidesTab"  component={GuideBrowserScreen}   options={{ tabBarLabel: 'Guides' }} />
      <Tab.Screen name="MoreTab"    component={MoreScreen}           options={{ tabBarLabel: 'More' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialRoute = 'Home' }: { initialRoute?: string }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home"       component={HomeTabs} />

        {/* Modals */}
        <Stack.Screen name="PrinterDetail"      component={PrinterDetailScreen}      options={{ presentation: 'modal' }} />
        <Stack.Screen name="AddPrinter"         component={AddPrinterScreen}         options={{ presentation: 'modal' }} />
        <Stack.Screen name="LogMaintenance"     component={LogMaintenanceScreen}     options={{ presentation: 'modal' }} />
        <Stack.Screen name="MaintenanceHistory" component={MaintenanceHistoryScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="InspectionWizard"   component={InspectionScreen}         options={{ presentation: 'modal' }} />
        <Stack.Screen name="GuideDetail"        component={GuideDetailScreen}        options={{ presentation: 'modal' }} />
        <Stack.Screen name="PartDetail"         component={PartDetailScreen}         options={{ presentation: 'modal' }} />
        <Stack.Screen name="LessonPlayer"       component={LessonPlayerScreen}       options={{ presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="LessonComplete"     component={LearningCompleteScreen}   options={{ presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="Settings"           component={SettingsScreen}           options={{ presentation: 'modal' }} />
        <Stack.Screen name="About"              component={AboutScreen}              options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
