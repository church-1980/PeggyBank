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

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function CenterFabButton({ onPress }: { onPress?: () => void }) {
  const C = useColors();
  const fabStyles = useMemo(() => StyleSheet.create({
    wrap: {
      top: -16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btn: {
      width: 62, height: 62, borderRadius: 31,
      backgroundColor: C.primary,
      alignItems: 'center', justifyContent: 'center',
      ...Shadow.glow,
    },
  }), [C]);

  return (
    <View style={fabStyles.wrap} pointerEvents="box-none">
      <TouchableOpacity
        style={fabStyles.btn}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={C.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function EmptyScreen() { return null; }

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
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Dashboard') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />;
          }
          if (route.name === 'Spending') {
            return <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />;
          }
          if (route.name === 'BillsTab') {
            return <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />;
          }
          if (route.name === 'MoreTab') {
            return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />;
          }
          return null;
        },
      })}
    >
      {/* Bible bottom bar: Home · Spending · + · Bills · More.
          Nav tabs navigate only. The center + opens the Action Hub only. */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />

      <Tab.Screen
        name="Spending"
        component={ExpensesScreen}
        options={{ tabBarLabel: 'Spending' }}
      />

      <Tab.Screen
        name="QuickAddTab"
        component={EmptyScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <CenterFabButton onPress={props.onPress as () => void} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('QuickAdd');
          },
        })}
      />

      <Tab.Screen
        name="BillsTab"
        component={EmptyScreen}
        options={{ tabBarLabel: 'Bills' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Bills');
          },
        })}
      />

      <Tab.Screen
        name="MoreTab"
        component={EmptyScreen}
        options={{ tabBarLabel: 'More' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('More');
          },
        })}
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

        <Stack.Screen
          name="QuickAdd"
          component={QuickAddScreen}
          options={{ presentation: 'transparentModal', animation: 'fade_from_bottom' }}
        />

        <Stack.Screen name="AddExpense"  component={AddExpenseScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="AddIncome"   component={AddIncomeScreen}   options={{ presentation: 'modal' }} />
        <Stack.Screen name="Payday"      component={PaydayScreen}      options={{ presentation: 'modal' }} />

        <Stack.Screen name="More"             component={MoreScreen}            options={{ presentation: 'modal' }} />
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
