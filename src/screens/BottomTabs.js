import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import AnalyticsScreen from './AnalyticsScreen';
import AdminDashboardScreen from './AdminDashboardScreen';
import MyOrdersScreen from './MyOrdersScreen';
import NotificationScreen from './NotificationScreen';
import { useAuth } from '../contexts/AuthContext';

const NotificationRoute = () => (
  <View style={styles.center}><Text style={styles.text}>Notifications</Text></View>
);

const ALL_TABS = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    component: HomeScreen,
    adminOnly: false,
    requiresApproval: false,
    userOnly: false,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: 'analytics',
    component: AnalyticsScreen,
    adminOnly: false,
    requiresApproval: true,
    userOnly: false,
  },
  {
    key: 'orders',
    label: 'My Orders',
    icon: 'receipt',
    component: MyOrdersScreen,
    adminOnly: false,
    requiresApproval: false,
    userOnly: true,
  },
  {
    key: 'notifications',
    label: 'Notification',
    icon: 'notifications',
    component: NotificationScreen,
    adminOnly: true,
    requiresApproval: false,
    userOnly: false,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    component: AdminDashboardScreen,
    adminOnly: true,
    requiresApproval: false,
    userOnly: false,
  },
];

export default function BottomTabs({ navigation, route }) {
  const { pendingUsers, isAdmin, canAccessAnalytics, currentUser, refreshCurrentUser } = useAuth();
  
  // Refresh user data when component mounts to ensure latest approval status
  useEffect(() => {
    if (currentUser && currentUser.role === 'user') {
      refreshCurrentUser();
    }
  }, []);
  
  // Debug logging
  console.log('BottomTabs Debug:', {
    currentUser: currentUser ? { id: currentUser.id, role: currentUser.role, approved: currentUser.approved } : null,
    isAdmin: isAdmin(),
    canAccessAnalytics: canAccessAnalytics(),
    isUser: currentUser?.role === 'user',
    isApproved: currentUser?.approved === true
  });
  
  // Filter tabs based on user role and approval status
  const TABS = ALL_TABS.filter(tab => {
    // Admin-only tabs
    if (tab.adminOnly && !isAdmin()) {
      console.log(`Hiding ${tab.key} - admin only`);
      return false;
    }
    // User-only tabs (hide for admin users)
    if (tab.userOnly && isAdmin()) {
      console.log(`Hiding ${tab.key} - user only`);
      return false;
    }
    // Tabs that require approval
    if (tab.requiresApproval && !canAccessAnalytics()) {
      console.log(`Hiding ${tab.key} - requires approval but user not approved`);
      return false;
    }
    console.log(`Showing ${tab.key}`);
    return true;
  });
  
  console.log('Final TABS:', TABS.map(tab => tab.key));
  
  // Get initial tab from route params or default to 0 (home)
  const initialTabIndex = route?.params?.tab ? 
    TABS.findIndex(tab => tab.key === route.params.tab) : 0;
  
  const [selected, setSelected] = useState(initialTabIndex);
  const ActiveComponent = TABS[selected].component;

  // Update selected tab when route params change
  useEffect(() => {
    if (route?.params?.tab) {
      const tabIndex = TABS.findIndex(tab => tab.key === route.params.tab);
      if (tabIndex !== -1) {
        setSelected(tabIndex);
      }
    }
  }, [route?.params?.tab]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActiveComponent navigation={navigation} />
      </View>
      <View style={styles.navbar}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => setSelected(idx)}
            activeOpacity={0.7}
          >
            <View style={styles.tabIconContainer}>
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={selected === idx ? '#2E7D32' : '#888'}
                style={styles.icon}
              />
              {tab.key === 'notifications' && pendingUsers && pendingUsers.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingUsers.length}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, selected === idx && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const NAVBAR_HEIGHT = 80;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    flex: 1,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: NAVBAR_HEIGHT,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 60,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  text: {
    fontSize: 22,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});