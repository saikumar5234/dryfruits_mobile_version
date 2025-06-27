import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const CartWishlistContext = createContext();

export const useCartWishlist = () => {
  const context = useContext(CartWishlistContext);
  if (!context) {
    throw new Error('useCartWishlist must be used within a CartWishlistProvider');
  }
  return context;
};

export const CartWishlistProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const cartDebounceRef = useRef();
  const wishlistDebounceRef = useRef();

  // Load cart and wishlist from Firebase when user changes
  useEffect(() => {
    if (currentUser) {
      loadUserData();
    } else {
      // Clear data when user logs out
      setCart([]);
      setWishlist([]);
      setLoading(false);
    }
  }, [currentUser]);

  // Real-time listeners for cart and wishlist changes
  useEffect(() => {
    if (!currentUser) {
      console.log('⚠️ No currentUser for real-time listeners');
      return;
    }

    console.log('🔄 Setting up real-time listeners for user:', currentUser.id);

    const unsubscribeCart = onSnapshot(
      doc(db, 'userCarts', currentUser.id),
      (doc) => {
        console.log('🛒 Cart document snapshot:', doc.exists() ? 'exists' : 'does not exist');
        if (doc.exists()) {
          const cartData = doc.data().items || [];
          console.log('📋 Cart items received:', cartData.length, 'items');
          console.log('📋 Cart data:', JSON.stringify(cartData, null, 2));
          setCart(cartData);
        } else {
          console.log('📋 No cart document found, setting empty cart');
          setCart([]);
        }
      },
      (error) => {
        console.error('💥 Error listening to cart:', error);
        setCart([]);
      }
    );

    const unsubscribeWishlist = onSnapshot(
      doc(db, 'userWishlists', currentUser.id),
      (doc) => {
        console.log('💝 Wishlist document snapshot:', doc.exists() ? 'exists' : 'does not exist');
        if (doc.exists()) {
          const wishlistData = doc.data().items || [];
          console.log('📋 Wishlist items received:', wishlistData.length, 'items');
          console.log('📋 Wishlist data:', JSON.stringify(wishlistData, null, 2));
          setWishlist(wishlistData);
        } else {
          console.log('📋 No wishlist document found, setting empty wishlist');
          setWishlist([]);
        }
      },
      (error) => {
        console.error('💥 Error listening to wishlist:', error);
        setWishlist([]);
      }
    );

    return () => {
      console.log('🔄 Cleaning up real-time listeners');
      unsubscribeCart();
      unsubscribeWishlist();
    };
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load cart
      const cartDoc = await getDoc(doc(db, 'userCarts', currentUser.id));
      if (cartDoc.exists()) {
        setCart(cartDoc.data().items || []);
      } else {
        setCart([]);
      }

      // Load wishlist
      const wishlistDoc = await getDoc(doc(db, 'userWishlists', currentUser.id));
      if (wishlistDoc.exists()) {
        setWishlist(wishlistDoc.data().items || []);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setCart([]);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced saveCart
  const saveCart = (newCart) => {
    if (!currentUser) {
      console.log('⚠️ No currentUser for saveCart');
      return;
    }
    
    console.log('💾 Saving cart for user:', currentUser.id);
    console.log('📋 Cart data to save:', JSON.stringify(newCart, null, 2));
    
    if (cartDebounceRef.current) clearTimeout(cartDebounceRef.current);
    cartDebounceRef.current = setTimeout(async () => {
      try {
        const cartDoc = {
          userId: currentUser.id,
          items: newCart,
          updatedAt: new Date()
        };
        
        console.log('💾 Saving to Firebase:', JSON.stringify(cartDoc, null, 2));
        
        await setDoc(doc(db, 'userCarts', currentUser.id), cartDoc);
        console.log('✅ Cart saved successfully to Firebase');
        setCart(newCart);
      } catch (err) {
        console.error('💥 Error saving cart:', err);
        setError('Failed to save cart. Please try again.');
      }
    }, 300); // 300ms debounce
  };

  // Debounced saveWishlist
  const saveWishlist = (newWishlist) => {
    if (!currentUser) return;
    if (wishlistDebounceRef.current) clearTimeout(wishlistDebounceRef.current);
    wishlistDebounceRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'userWishlists', currentUser.id), {
          userId: currentUser.id,
          items: newWishlist,
          updatedAt: new Date()
        });
        setWishlist(newWishlist);
      } catch (err) {
        setError('Failed to save wishlist. Please try again.');
        console.error('Error saving wishlist:', err);
      }
    }, 300); // 300ms debounce
  };

  const addToCart = async (product) => {
    if (!currentUser) return;

    const existingItem = cart.find(item => item.id === product.id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    
    await saveCart(newCart);
  };

  const removeFromCart = async (productId) => {
    if (!currentUser) return;

    const newCart = cart.filter(item => item.id !== productId);
    await saveCart(newCart);
  };

  const updateCartQuantity = async (productId, newQuantity) => {
    if (!currentUser) return;

    if (newQuantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    
    const newCart = cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    );
    
    await saveCart(newCart);
  };

  const clearCart = async () => {
    if (!currentUser) return;
    await saveCart([]);
  };

  const addToWishlist = async (productId) => {
    if (!currentUser) return;

    if (!wishlist.includes(productId)) {
      const newWishlist = [...wishlist, productId];
      await saveWishlist(newWishlist);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!currentUser) return;

    const newWishlist = wishlist.filter(id => id !== productId);
    await saveWishlist(newWishlist);
  };

  const toggleWishlist = async (product) => {
    if (!currentUser) return;

    if (wishlist.includes(product.id)) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product.id);
    }
  };

  const moveToWishlist = async (product) => {
    if (!currentUser) return;

    await addToWishlist(product.id);
    await removeFromCart(product.id);
  };

  const moveToCart = async (product) => {
    if (!currentUser) return;

    await addToCart(product);
    await removeFromWishlist(product.id);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.length;
  };

  const getWishlistCount = () => {
    return wishlist.length;
  };

  const isInCart = (productId) => {
    const result = cart.some(item => item.id === productId);
    console.log(`🔍 isInCart(${productId}): ${result} (cart has ${cart.length} items)`);
    return result;
  };

  const isInWishlist = (productId) => {
    return wishlist.includes(productId);
  };

  const value = {
    cart,
    wishlist,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    moveToWishlist,
    moveToCart,
    saveCart,
    getCartTotal,
    getCartItemCount,
    getCartCount,
    getWishlistCount,
    isInCart,
    isInWishlist
  };

  return (
    <CartWishlistContext.Provider value={value}>
      {children}
    </CartWishlistContext.Provider>
  );
}; 