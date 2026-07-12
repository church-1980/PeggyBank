import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../context/ThemeContext';

// Tab screens
import DashboardScreen        from '../screens/DashboardScreen';
import ExpensesScreen         from '../screens/ExpensesScreen';

// Modal / stack screens
import QuickAddScreen         from '../screens/QuickAddScreen';
import MoreScreen             from '../screens/MoreScreen';
import GoalsScreen            from '../screens/GoalsScreen';
import WeeklyCheckInScreen    from '../screens/WeeklyCheckInScreen';
import AddExpenseScreen       from '../screens/AddExpenseScreen';
import AddIncomeScreen        from '../screens/AddIncomeScreen';
import PaydayScreen           from '../screens/PaydayScreen';
import CurrencyScreen         from '../screens/CurrencyScreen';
import ExportScreen           from '../screens/ExportScreen';
import SettingsScreen         from '../screens/SettingsScreen';
import OnboardingScreen       from '../screens/OnboardingScreen';
import NavCustomizeScreen     from '../screens/NavCustomizeScreen';
import AppearanceScreen       from '../screens/AppearanceScreen';
import ShareScreen            from '../screens/ShareScreen';
import IncomesScreen          from '../screens/IncomesScreen';
import BillsScreen            from '../screens/BillsScreen';
import CalendarScreen         from '../screens/CalendarScreen';
import DebtScreen             from '../screens/DebtScreen';
import MonthlyBreakdownScreen from '../screens/MonthlyBreakdownScreen';
import ProfileScreen         from '../screens/ProfileScreen';
import QuickCaptureScreen    from '../screens/QuickCaptureScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function EmptyScreen() { return null; }

// Camera control: emphasized-but-in-bar (soft tinted circle, NOT a floating +).
function CameraTabIcon() {
  const C = useColors();
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="camera" size={24} color={C.primary} />
    </View>
  );
}

function HomeTabs() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const tabBarHeight = 62 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bgCard,
          borderTopWidth:  0,          // Design System §9: no heavy border
          height:          tabBarHeight,
          paddingBottom:   insets.bottom + 8,
          paddingTop:      8,
          // soft elevation
          shadowColor: '#3C3278', shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
        },
        tabBarShowLabel:         true,
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.textHint,
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Dashboard') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />;
          }
          if (route.name === 'MoreScreen') {
            return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />;
          }
          if (route.name === 'CameraTab') {
            return <CameraTabIcon />;
          }
          return null;
        },
      })}
    >
      {/* Final bottom bar: Home · Camera · More — exactly three, evenly spaced. */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />

      <Tab.Screen
        name="CameraTab"
        component={EmptyScreen}
        options={{ tabBarLabel: 'Camera' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('QuickCapture'); // opens the camera immediately
          },
        })}
      />

      <Tab.Screen
        name="MoreScreen"
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialRoute = 'Home' }: { initialRoute?: string }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home"       component={HomeTabs} />

        {/* DORMANT fallback — the Action Hub is retired. No control opens this
            route; kept registered only as fallback code until the new nav is
            device-verified, then removed in a cleanup audit. */}
        <Stack.Screen
          name="QuickAdd"
          component={QuickAddScreen}
          options={{ presentation: 'transparentModal', animation: 'fade_from_bottom' }}
        />

        {/* Camera / Smart Quick Capture — full-screen */}
        <Stack.Screen name="QuickCapture" component={QuickCaptureScreen} options={{ presentation: 'modal' }} />

        <Stack.Screen name="AddExpense"  component={AddExpenseScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="AddIncome"   component={AddIncomeScreen}   options={{ presentation: 'modal' }} />
        <Stack.Screen name="Payday"      component={PaydayScreen}      options={{ presentation: 'modal' }} />

        {/* Spending is now reached from More (no longer a tab) */}
        <Stack.Screen name="Spending"         component={ExpensesScreen}        options={{ presentation: 'modal' }} />
        <Stack.Screen name="Profile"          component={ProfileScreen}         options={{ presentation: 'modal' }} />
        <Stack.Screen name="Goals"            component={GoalsScreen}           options={{ presentation: 'modal' }} />
        <Stack.Screen name="Bills"            component={BillsScreen}           options={{ presentation: 'modal' }} />
        <Stack.Screen name="Calendar"         component={CalendarScreen}        options={{ presentation: 'modal' }} />
        <Stack.Screen name="Debt"             component={DebtScreen}            options={{ presentation: 'modal' }} />
        <Stack.Screen name="MonthlyBreakdown" component={MonthlyBreakdownScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="WeeklyCheckIn"    component={WeeklyCheckInScreen}   options={{ presentation: 'modal' }} />
        <Stack.Screen name="Currency"         component={CurrencyScreen}        options={{ presentation: 'modal' }} />
        <Stack.Screen name="Export"           component={ExportScreen}          options={{ presentation: 'modal' }} />
        <Stack.Screen name="Settings"         component={SettingsScreen}        options={{ presentation: 'modal' }} />
        <Stack.Screen name="NavCustomize"     component={NavCustomizeScreen}    options={{ presentation: 'modal' }} />
        <Stack.Screen name="Appearance"       component={AppearanceScreen}       options={{ presentation: 'modal' }} />
        <Stack.Screen name="Share"            component={ShareScreen}           options={{ presentation: 'modal' }} />
        <Stack.Screen name="Incomes"          component={IncomesScreen}         options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
