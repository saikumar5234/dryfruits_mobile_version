import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Alert } from 'react-native';

const AuthContext = createContext();

// Hardcoded admin credentials
const ADMIN_EMAIL = 'adminOwner@gmail.com';
const ADMIN_PASSWORD = '12345678';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  // Load user from AsyncStorage on app start (for session persistence)
  useEffect(() => {
    const loadSavedUser = async () => {
      try {
        // For React Native, we'll use a simple approach
        // In a real app, you'd use AsyncStorage
        const savedUser = null; // TODO: Implement AsyncStorage
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Error loading saved user:', error);
      }
    };

    loadSavedUser();
    
    // Load data from Firestore
    loadPendingUsers();
    loadNotifications();
    loadUsers();
    
    setLoading(false);
  }, []);

  // Save user to AsyncStorage for session persistence
  useEffect(() => {
    const saveUser = async () => {
      try {
        if (currentUser) {
          // TODO: Implement AsyncStorage
          // await AsyncStorage.setItem('user', JSON.stringify(currentUser));
        } else {
          // await AsyncStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error saving user:', error);
      }
    };

    saveUser();
  }, [currentUser]);

  // Real-time listeners for Firestore data
  useEffect(() => {
    const pendingUsersUnsubscribe = onSnapshot(
      collection(db, 'pendingUsers'),
      (snapshot) => {
        const pendingUsersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPendingUsers(pendingUsersData);
      },
      (error) => {
        setError('Error listening to pending users.');
        console.error('Error listening to pending users:', error);
      }
    );

    const notificationsUnsubscribe = onSnapshot(
      collection(db, 'notifications'),
      (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(notificationsData);
      },
      (error) => {
        setError('Error listening to notifications.');
        console.error('Error listening to notifications:', error);
      }
    );

    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
      },
      (error) => {
        setError('Error listening to users.');
        console.error('Error listening to users:', error);
      }
    );

    // Real-time listener for current user's data
    let currentUserUnsubscribe = null;
    if (currentUser && currentUser.email) {
      // Listen to both users and pendingUsers collections for the current user
      const usersQuery = query(collection(db, 'users'), where('email', '==', currentUser.email));
      const pendingQuery = query(collection(db, 'pendingUsers'), where('email', '==', currentUser.email));
      
      const usersUnsub = onSnapshot(usersQuery, (snapshot) => {
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          const { password, ...userWithoutPassword } = userData;
          const updatedUser = { id: userDoc.id, ...userWithoutPassword };
          
          // Only update if the data has actually changed
          if (JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
            console.log('Current user data updated from users collection:', updatedUser);
            setCurrentUser(updatedUser);
          }
        }
      }, (error) => {
        console.error('Error listening to current user in users collection:', error);
      });

      const pendingUnsub = onSnapshot(pendingQuery, (snapshot) => {
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          const { password, ...userWithoutPassword } = userData;
          const updatedUser = { id: userDoc.id, ...userWithoutPassword };
          
          // Only update if the data has actually changed
          if (JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
            console.log('Current user data updated from pendingUsers collection:', updatedUser);
            setCurrentUser(updatedUser);
          }
        }
      }, (error) => {
        console.error('Error listening to current user in pendingUsers collection:', error);
      });

      currentUserUnsubscribe = () => {
        usersUnsub();
        pendingUnsub();
      };
    }

    return () => {
      pendingUsersUnsubscribe();
      notificationsUnsubscribe();
      usersUnsubscribe();
      if (currentUserUnsubscribe) {
        currentUserUnsubscribe();
      }
    };
  }, [currentUser?.email]); // Re-run when currentUser.email changes

  const loadPendingUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'pendingUsers'));
      const pendingUsersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingUsers(pendingUsersData);
    } catch (error) {
      console.error('Error loading pending users:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'notifications'));
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const addNotification = async (notification) => {
    try {
      const newNotification = {
        ...notification,
        timestamp: serverTimestamp(),
        read: false
      };
      await addDoc(collection(db, 'notifications'), newNotification);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      // Check for admin login
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const adminUser = {
          id: 'admin-001',
          email: ADMIN_EMAIL,
          name: 'Admin Owner',
          role: 'admin',
          avatar: 'https://ui-avatars.com/api/?name=Admin+Owner&background=2E7D32&color=fff',
          createdAt: new Date().toISOString(),
          approved: true
        };
        setCurrentUser(adminUser);
        setLoading(false);
        return { success: true, user: adminUser };
      }

      // Check pending users first
      const pendingQuery = query(collection(db, 'pendingUsers'), where('email', '==', email));
      const pendingSnapshot = await getDocs(pendingQuery);
      
      if (!pendingSnapshot.empty) {
        const userDoc = pendingSnapshot.docs[0];
        const userData = userDoc.data();
        
        if (userData.password === password) {
          const { password, ...userWithoutPassword } = userData;
          const user = { id: userDoc.id, ...userWithoutPassword };
          setCurrentUser(user);
          setLoading(false);
          return { success: true, user };
        } else {
          setError('Incorrect password.');
          setLoading(false);
          throw new Error('Incorrect password.');
        }
      }

      // Check approved users
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        if (userData.password === password) {
          const { password, ...userWithoutPassword } = userData;
          const user = { id: userDoc.id, ...userWithoutPassword };
          setCurrentUser(user);
          setLoading(false);
          return { success: true, user };
        } else {
          setError('Incorrect password.');
          setLoading(false);
          throw new Error('Incorrect password.');
        }
      }

      setError('Invalid email or password.');
      setLoading(false);
      throw new Error('Invalid email or password.');
    } catch (error) {
      setError(error.message || 'Login failed. Please try again.');
      setLoading(false);
      throw error;
    }
  };

  const register = async (email, password, name) => {
    try {
      setLoading(true);
      
      // Check if email already exists
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const usersSnapshot = await getDocs(usersQuery);
      const pendingQuery = query(collection(db, 'pendingUsers'), where('email', '==', email));
      const pendingSnapshot = await getDocs(pendingQuery);
      
      if (!usersSnapshot.empty || !pendingSnapshot.empty) {
        setError('Email already registered.');
        setLoading(false);
        throw new Error('Email already registered.');
      }

      const newUser = {
        email,
        password, // In a real app, this should be hashed
        name,
        role: 'user',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2E7D32&color=fff`,
        createdAt: serverTimestamp(),
        approved: false
      };

      const docRef = await addDoc(collection(db, 'pendingUsers'), newUser);
      
      await addNotification({
        type: 'new_user',
        title: 'New User Registration',
        message: `${name} (${email}) has registered and is waiting for approval.`,
        userId: docRef.id,
        userEmail: email,
        userName: name
      });

      const { password: _, ...userWithoutPassword } = newUser;
      const user = { id: docRef.id, ...userWithoutPassword };
      setCurrentUser(user);
      setLoading(false);
      return { success: true, user };
    } catch (error) {
      setError(error.message || 'Registration failed. Please try again.');
      setLoading(false);
      throw error;
    }
  };

  const approveUser = async (userId) => {
    try {
      const userDocRef = doc(db, 'pendingUsers', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        setError('User not found in pending users.');
        return;
      }

      const userData = userDoc.data();
      userData.approved = true;
      
      // Add user to approved users collection
      const newUserDocRef = await addDoc(collection(db, 'users'), userData);
      await deleteDoc(userDocRef);
      
      await addNotification({
        type: 'user_approved',
        title: 'User Approved',
        message: `${userData.name} (${userData.email}) has been approved and can now access analytics.`,
        userId: newUserDocRef.id,
        userEmail: userData.email,
        userName: userData.name
      });

      // Update current user if they are the one being approved
      if (currentUser && currentUser.id === userId) {
        const { password, ...userWithoutPassword } = userData;
        const updatedUser = { 
          id: newUserDocRef.id, 
          ...userWithoutPassword 
        };
        console.log('Updating current user after approval:', updatedUser);
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      setError('Error approving user. Please try again.');
      console.error('Error approving user:', error);
    }
  };

  const rejectUser = async (userId) => {
    try {
      const userDocRef = doc(db, 'pendingUsers', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        setError('User not found in pending users.');
        return;
      }

      const userData = userDoc.data();
      await deleteDoc(userDocRef);
      
      await addNotification({
        type: 'user_rejected',
        title: 'User Rejected',
        message: `${userData.name} (${userData.email}) has been rejected.`,
        userId: userId,
        userEmail: userData.email,
        userName: userData.name
      });

      if (currentUser && currentUser.id === userId) {
        logout();
      }
    } catch (error) {
      setError('Error rejecting user. Please try again.');
      console.error('Error rejecting user:', error);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return;
    
    try {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      
      if (currentUser.role === 'user') {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, updates);
      }
    } catch (error) {
      setError('Error updating profile. Please try again.');
      console.error('Error updating profile:', error);
    }
  };

  const isAdmin = () => {
    return currentUser?.role === 'admin';
  };

  const isUser = () => {
    return currentUser?.role === 'user';
  };

  const isApproved = () => {
    return currentUser?.approved === true;
  };

  const canAccessAnalytics = () => {
    const adminCheck = isAdmin();
    const userCheck = isUser() && isApproved();
    const result = adminCheck || userCheck;
    
    console.log('canAccessAnalytics Debug:', {
      currentUser: currentUser ? { id: currentUser.id, role: currentUser.role, approved: currentUser.approved } : null,
      isAdmin: adminCheck,
      isUser: isUser(),
      isApproved: isApproved(),
      userCheck,
      result
    });
    
    return result;
  };

  const refreshCurrentUser = async () => {
    if (!currentUser) return;
    
    try {
      // Check if user exists in approved users
      const usersQuery = query(collection(db, 'users'), where('email', '==', currentUser.email));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const { password, ...userWithoutPassword } = userData;
        const updatedUser = { id: userDoc.id, ...userWithoutPassword };
        console.log('Refreshing current user data:', updatedUser);
        setCurrentUser(updatedUser);
        return updatedUser;
      }
      
      // Check if user still exists in pending users
      const pendingQuery = query(collection(db, 'pendingUsers'), where('email', '==', currentUser.email));
      const pendingSnapshot = await getDocs(pendingQuery);
      
      if (!pendingSnapshot.empty) {
        const userDoc = pendingSnapshot.docs[0];
        const userData = userDoc.data();
        const { password, ...userWithoutPassword } = userData;
        const updatedUser = { id: userDoc.id, ...userWithoutPassword };
        console.log('Refreshing current user data (still pending):', updatedUser);
        setCurrentUser(updatedUser);
        return updatedUser;
      }
      
      // User not found in either collection, might have been deleted
      console.log('User not found in database, logging out');
      logout();
    } catch (error) {
      console.error('Error refreshing current user:', error);
    }
  };

  const value = useMemo(() => ({
    currentUser,
    login,
    register,
    logout,
    updateProfile,
    refreshCurrentUser,
    isAdmin,
    isUser,
    isApproved,
    canAccessAnalytics,
    loading,
    pendingUsers,
    notifications,
    users,
    approveUser,
    rejectUser,
    markNotificationAsRead,
    error,
    setError
  }), [currentUser, loading, pendingUsers, notifications, users, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 