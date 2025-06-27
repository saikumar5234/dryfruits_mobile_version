import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../config/firebase';

const db = getFirestore(app);
const storage = getStorage(app);

// Product Service
export const productService = {
  // Get all products from Firebase (same as web implementation)
  getAllProducts: async () => {
    try {
      console.log('🔄 Fetching products from Firestore...');
      const productsCollection = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCollection);
      
      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        rating: doc.data().rating || Math.floor(Math.random() * 2) + 4,
        reviews: doc.data().reviews || Math.floor(Math.random() * 50) + 10,
        inStock: doc.data().inStock !== false
      }));
      
      console.log('✅ Products fetched successfully:', products.length, 'products');
      return { success: true, data: products };
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return { success: false, error: error.message };
    }
  },

  // Get product by ID
  getProductById: async (productId) => {
    try {
      const productDoc = doc(db, 'products', productId);
      const productSnapshot = await getDoc(productDoc);
      
      if (productSnapshot.exists()) {
        return { 
          success: true, 
          data: { id: productSnapshot.id, ...productSnapshot.data() } 
        };
      } else {
        return { success: false, error: 'Product not found' };
      }
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      return { success: false, error: error.message };
    }
  },

  // Get products by category
  getProductsByCategory: async (category) => {
    try {
      const productsCollection = collection(db, 'products');
      const q = query(productsCollection, where('category', '==', category));
      const productsSnapshot = await getDocs(q);
      
      const products = [];
      productsSnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, data: products };
    } catch (error) {
      console.error('❌ Error fetching products by category:', error);
      return { success: false, error: error.message };
    }
  },

  // Add new product
  addProduct: async (productData) => {
    try {
      const productsCollection = collection(db, 'products');
      const docRef = await addDoc(productsCollection, productData);
      return { success: true, data: { id: docRef.id, ...productData } };
    } catch (error) {
      console.error('❌ Error adding product:', error);
      return { success: false, error: error.message };
    }
  },

  // Update product
  updateProduct: async (productId, updateData) => {
    try {
      const productDoc = doc(db, 'products', productId);
      await updateDoc(productDoc, updateData);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating product:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete product
  deleteProduct: async (productId) => {
    try {
      const productDoc = doc(db, 'products', productId);
      await deleteDoc(productDoc);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      return { success: false, error: error.message };
    }
  },

  // Real-time products listener
  onProductsChange: (callback) => {
    const productsCollection = collection(db, 'products');
    return onSnapshot(productsCollection, (snapshot) => {
      const products = [];
      snapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data(),
          rating: doc.data().rating || Math.floor(Math.random() * 2) + 4,
          reviews: doc.data().reviews || Math.floor(Math.random() * 50) + 10,
          inStock: doc.data().inStock !== false
        });
      });
      callback(products);
    });
  },

  // Upload product image to Firebase Storage
  uploadProductImage: async (blob, fileName) => {
    try {
      console.log('📤 Uploading image to Firebase Storage...');
      const storageRef = ref(storage, `products/${fileName}`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Image uploaded successfully:', downloadURL);
      return { success: true, data: downloadURL };
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return { success: false, error: error.message };
    }
  }
};

// Wishlist Service
export const wishlistService = {
  // Get user's wishlist
  getUserWishlist: async (userId) => {
    try {
      const wishlistCollection = collection(db, 'wishlists');
      const q = query(wishlistCollection, where('userId', '==', userId));
      const wishlistSnapshot = await getDocs(q);
      
      const wishlistItems = [];
      wishlistSnapshot.forEach((doc) => {
        wishlistItems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, data: wishlistItems };
    } catch (error) {
      console.error('❌ Error fetching wishlist:', error);
      return { success: false, error: error.message };
    }
  },

  // Add to wishlist
  addToWishlist: async (userId, productId, productData) => {
    try {
      const wishlistCollection = collection(db, 'wishlists');
      const wishlistItem = {
        userId,
        productId,
        product: productData,
        addedAt: new Date()
      };
      
      const docRef = await addDoc(wishlistCollection, wishlistItem);
      return { success: true, data: { id: docRef.id, ...wishlistItem } };
    } catch (error) {
      console.error('❌ Error adding to wishlist:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove from wishlist
  removeFromWishlist: async (wishlistItemId) => {
    try {
      const wishlistDoc = doc(db, 'wishlists', wishlistItemId);
      await deleteDoc(wishlistDoc);
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing from wishlist:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove from wishlist by product ID
  removeFromWishlistByProduct: async (userId, productId) => {
    try {
      const wishlistCollection = collection(db, 'wishlists');
      const q = query(
        wishlistCollection, 
        where('userId', '==', userId),
        where('productId', '==', productId)
      );
      const wishlistSnapshot = await getDocs(q);
      
      const deletePromises = wishlistSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing from wishlist by product:', error);
      return { success: false, error: error.message };
    }
  },

  // Real-time wishlist listener
  onWishlistChange: (userId, callback) => {
    const wishlistCollection = collection(db, 'wishlists');
    const q = query(wishlistCollection, where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const wishlistItems = [];
      snapshot.forEach((doc) => {
        wishlistItems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(wishlistItems);
    });
  },

  // Get wishlist count (for performance when only count is needed)
  getWishlistCount: async (userId) => {
    try {
      const wishlistCollection = collection(db, 'wishlists');
      const q = query(wishlistCollection, where('userId', '==', userId));
      const wishlistSnapshot = await getDocs(q);
      return { success: true, data: wishlistSnapshot.size };
    } catch (error) {
      console.error('❌ Error getting wishlist count:', error);
      return { success: false, error: error.message };
    }
  }
};

// Cart Service
export const cartService = {
  // Get user's cart
  getUserCart: async (userId) => {
    try {
      console.log('🛒 Fetching cart for user:', userId);
      const cartCollection = collection(db, 'carts');
      const q = query(cartCollection, where('userId', '==', userId));
      const cartSnapshot = await getDocs(q);
      
      const cartItems = [];
      cartSnapshot.forEach((doc) => {
        const data = doc.data();
        cartItems.push({
          id: doc.id,
          ...data,
          product: data.product || {} // Ensure product object exists
        });
      });
      
      console.log('✅ Cart items fetched:', cartItems.length, 'items');
      return { success: true, data: cartItems };
    } catch (error) {
      console.error('❌ Error fetching cart:', error);
      return { success: false, error: error.message };
    }
  },

  // Add to cart
  addToCart: async (userId, product, quantity = 1) => {
    try {
      console.log('🛒 Adding to cart:', product.name || product.id, 'for user:', userId);
      const cartCollection = collection(db, 'carts');
      
      // Check if product already exists in cart
      const q = query(
        cartCollection, 
        where('userId', '==', userId),
        where('productId', '==', product.id)
      );
      const existingCartSnapshot = await getDocs(q);
      
      if (!existingCartSnapshot.empty) {
        // Update existing cart item
        const existingCartItem = existingCartSnapshot.docs[0];
        const currentQuantity = existingCartItem.data().quantity || 0;
        const newQuantity = currentQuantity + quantity;
        
        console.log('📝 Updating existing cart item, new quantity:', newQuantity);
        await updateDoc(existingCartItem.ref, { 
          quantity: newQuantity,
          updatedAt: new Date()
        });
        
        // Fetch updated cart
        const updatedCart = await cartService.getUserCart(userId);
        return { success: true, data: updatedCart.data };
      } else {
        // Add new cart item
        const cartItem = {
          userId,
          productId: product.id,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            category: product.category,
            description: product.description
          },
          quantity,
          addedAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log('➕ Adding new cart item:', cartItem);
        const docRef = await addDoc(cartCollection, cartItem);
        
        // Fetch updated cart
        const updatedCart = await cartService.getUserCart(userId);
        return { success: true, data: updatedCart.data };
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      return { success: false, error: error.message };
    }
  },

  // Update cart item quantity
  updateCartItemQuantity: async (userId, itemId, quantity) => {
    try {
      console.log('🔄 Updating cart item quantity:', itemId, 'to:', quantity);
      const cartDoc = doc(db, 'carts', itemId);
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        await deleteDoc(cartDoc);
        console.log('🗑️ Removed cart item with zero quantity');
      } else {
        await updateDoc(cartDoc, { 
          quantity,
          updatedAt: new Date()
        });
        console.log('✅ Updated cart item quantity');
      }
      
      // Fetch updated cart
      const updatedCart = await cartService.getUserCart(userId);
      return { success: true, data: updatedCart.data };
    } catch (error) {
      console.error('❌ Error updating cart item:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove from cart
  removeFromCart: async (userId, itemId) => {
    try {
      console.log('🗑️ Removing cart item:', itemId);
      const cartDoc = doc(db, 'carts', itemId);
      await deleteDoc(cartDoc);
      
      // Fetch updated cart
      const updatedCart = await cartService.getUserCart(userId);
      return { success: true, data: updatedCart.data };
    } catch (error) {
      console.error('❌ Error removing from cart:', error);
      return { success: false, error: error.message };
    }
  },

  // Clear user's cart
  clearCart: async (userId) => {
    try {
      console.log('🧹 Clearing cart for user:', userId);
      const cartCollection = collection(db, 'carts');
      const q = query(cartCollection, where('userId', '==', userId));
      const cartSnapshot = await getDocs(q);
      
      const deletePromises = cartSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Cart cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      return { success: false, error: error.message };
    }
  },

  // Real-time cart listener
  onCartChange: (userId, callback) => {
    const cartCollection = collection(db, 'carts');
    const q = query(cartCollection, where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const cartItems = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cartItems.push({
          id: doc.id,
          ...data,
          product: data.product || {} // Ensure product object exists
        });
      });
      callback(cartItems);
    });
  },

  // Get cart count (for performance when only count is needed)
  getCartCount: async (userId) => {
    try {
      const cartCollection = collection(db, 'carts');
      const q = query(cartCollection, where('userId', '==', userId));
      const cartSnapshot = await getDocs(q);
      return { success: true, data: cartSnapshot.size };
    } catch (error) {
      console.error('❌ Error getting cart count:', error);
      return { success: false, error: error.message };
    }
  }
};

// Order Service
export const orderService = {
  // Get all orders
  getOrders: async () => {
    try {
      console.log('🔄 Fetching orders from Firestore...');
      const ordersCollection = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersCollection);
      
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Orders fetched successfully:', orders.length, 'orders');
      return { success: true, data: orders };
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user orders
  getUserOrders: async (userId) => {
    try {
      const ordersCollection = collection(db, 'orders');
      const q = query(ordersCollection, where('userId', '==', userId));
      const ordersSnapshot = await getDocs(q);
      
      const orders = [];
      ordersSnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, data: orders };
    } catch (error) {
      console.error('❌ Error fetching user orders:', error);
      return { success: false, error: error.message };
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, newStatus) => {
    try {
      const orderDoc = doc(db, 'orders', orderId);
      await updateDoc(orderDoc, { 
        status: newStatus,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new order
  createOrder: async (orderData) => {
    try {
      const ordersCollection = collection(db, 'orders');
      const order = {
        ...orderData,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(ordersCollection, order);
      return { success: true, data: { id: docRef.id, ...order } };
    } catch (error) {
      console.error('❌ Error creating order:', error);
      return { success: false, error: error.message };
    }
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    try {
      const orderDoc = doc(db, 'orders', orderId);
      const orderSnapshot = await getDoc(orderDoc);
      
      if (orderSnapshot.exists()) {
        return { 
          success: true, 
          data: { id: orderSnapshot.id, ...orderSnapshot.data() } 
        };
      } else {
        return { success: false, error: 'Order not found' };
      }
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      return { success: false, error: error.message };
    }
  }
};

// User Service
export const userService = {
  // Create new user in Firestore
  createUser: async (userData) => {
    try {
      console.log('👤 Creating user in Firestore:', userData.email);
      const usersCollection = collection(db, 'users');
      
      const userDoc = {
        ...userData,
        // Don't add duplicate fields if they already exist
        createdAt: userData.createdAt || new Date(),
        updatedAt: userData.updatedAt || new Date(),
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        role: userData.role || 'customer' // Default role
      };
      
      const docRef = await addDoc(usersCollection, userDoc);
      console.log('✅ User created successfully with ID:', docRef.id);
      return { success: true, data: { id: docRef.id, ...userDoc } };
    } catch (error) {
      console.error('❌ Error creating user:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const userDoc = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        return { 
          success: true, 
          data: { id: userSnapshot.id, ...userSnapshot.data() } 
        };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user by email
  getUserByEmail: async (email) => {
    try {
      console.log('🔍 Checking "users" collection for email:', email);
      const usersCollection = collection(db, 'users');
      console.log('📂 Collection path: users');
      
      const q = query(usersCollection, where('email', '==', email));
      const userSnapshot = await getDocs(q);
      
      console.log('📊 Query results - Documents found:', userSnapshot.size);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        console.log('✅ User found in "users" collection:', {
          documentId: userDoc.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: userData.isActive
        });
        return { 
          success: true, 
          data: { id: userDoc.id, ...userData } 
        };
      } else {
        console.log('❌ No user found in "users" collection with email:', email);
        console.log('💡 Make sure the user document exists in the "users" collection');
        return { success: false, error: 'User not found in users collection' };
      }
    } catch (error) {
      console.error('❌ Error fetching user by email from "users" collection:', error);
      return { success: false, error: error.message };
    }
  },

  // Update user data
  updateUser: async (userId, updateData) => {
    try {
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, { 
        ...updateData,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating user:', error);
      return { success: false, error: error.message };
    }
  },

  // Update existing user with missing fields (for migration)
  updateExistingUser: async (email) => {
    try {
      console.log('🔄 Updating existing user with missing fields:', email);
      const userResult = await userService.getUserByEmail(email);
      
      if (userResult.success) {
        const user = userResult.data;
        const updates = {};
        
        // Add missing fields with default values
        if (user.isActive === undefined) {
          updates.isActive = true;
        }
        if (!user.role) {
          updates.role = 'customer';
        }
        if (!user.createdAt) {
          updates.createdAt = new Date();
        }
        if (!user.updatedAt) {
          updates.updatedAt = new Date();
        }
        
        if (Object.keys(updates).length > 0) {
          const updateResult = await userService.updateUser(user.id, updates);
          if (updateResult.success) {
            console.log('✅ User updated with missing fields:', email, updates);
            return { success: true, data: { ...user, ...updates } };
          } else {
            console.error('❌ Failed to update user:', updateResult.error);
            return { success: false, error: updateResult.error };
          }
        } else {
          console.log('✅ User already has all required fields:', email);
          return { success: true, data: user };
        }
      } else {
        console.error('❌ User not found for update:', email);
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('❌ Error updating existing user:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      const userDoc = doc(db, 'users', userId);
      await deleteDoc(userDoc);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all users (admin only)
  getAllUsers: async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: users };
    } catch (error) {
      console.error('❌ Error fetching all users:', error);
      return { success: false, error: error.message };
    }
  }
};

// Ratings Service
export const ratingsService = {
  // Add a rating/review for a product
  addRating: async (productId, userId, rating, review, userName) => {
    try {
      console.log('⭐ Adding rating for product:', productId, 'by user:', userId);
      
      const ratingData = {
        productId,
        userId,
        userName,
        rating: Number(rating),
        review: review || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add rating to ratings collection
      const ratingsCollection = collection(db, 'ratings');
      const docRef = await addDoc(ratingsCollection, ratingData);

      // Update product's average rating
      await ratingsService.updateProductAverageRating(productId);

      console.log('✅ Rating added successfully');
      return { success: true, data: { id: docRef.id, ...ratingData } };
    } catch (error) {
      console.error('❌ Error adding rating:', error);
      return { success: false, error: error.message };
    }
  },

  // Update an existing rating
  updateRating: async (ratingId, rating, review) => {
    try {
      console.log('🔄 Updating rating:', ratingId);
      
      const ratingRef = doc(db, 'ratings', ratingId);
      await updateDoc(ratingRef, {
        rating: Number(rating),
        review: review || '',
        updatedAt: new Date()
      });

      // Get the rating to find productId
      const ratingDoc = await getDoc(ratingRef);
      if (ratingDoc.exists()) {
        const ratingData = ratingDoc.data();
        await ratingsService.updateProductAverageRating(ratingData.productId);
      }

      console.log('✅ Rating updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating rating:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete a rating
  deleteRating: async (ratingId) => {
    try {
      console.log('🗑️ Deleting rating:', ratingId);
      
      // Get the rating to find productId before deleting
      const ratingRef = doc(db, 'ratings', ratingId);
      const ratingDoc = await getDoc(ratingRef);
      let productId = null;
      
      if (ratingDoc.exists()) {
        const ratingData = ratingDoc.data();
        productId = ratingData.productId;
      }

      // Delete the rating
      await deleteDoc(ratingRef);

      // Update product's average rating if productId was found
      if (productId) {
        await ratingsService.updateProductAverageRating(productId);
      }

      console.log('✅ Rating deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting rating:', error);
      return { success: false, error: error.message };
    }
  },

  // Get ratings for a product
  getProductRatings: async (productId) => {
    try {
      console.log('📊 Fetching ratings for product:', productId);
      
      const ratingsCollection = collection(db, 'ratings');
      const q = query(
        ratingsCollection, 
        where('productId', '==', productId)
        // Temporarily removed orderBy to avoid index requirement
        // orderBy('createdAt', 'desc')
      );
      const ratingsSnapshot = await getDocs(q);
      
      const ratings = ratingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort manually in JavaScript
      ratings.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA; // Descending order
      });
      
      console.log('✅ Ratings fetched:', ratings.length, 'ratings');
      return { success: true, data: ratings };
    } catch (error) {
      console.error('❌ Error fetching ratings:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user's rating for a product
  getUserRating: async (productId, userId) => {
    try {
      const ratingsCollection = collection(db, 'ratings');
      const q = query(
        ratingsCollection, 
        where('productId', '==', productId),
        where('userId', '==', userId)
      );
      const ratingsSnapshot = await getDocs(q);
      
      if (!ratingsSnapshot.empty) {
        const ratingDoc = ratingsSnapshot.docs[0];
        return { 
          success: true, 
          data: { id: ratingDoc.id, ...ratingDoc.data() } 
        };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('❌ Error fetching user rating:', error);
      return { success: false, error: error.message };
    }
  },

  // Update product's average rating
  updateProductAverageRating: async (productId) => {
    try {
      console.log('📊 Updating average rating for product:', productId);
      
      const ratingsCollection = collection(db, 'ratings');
      const q = query(ratingsCollection, where('productId', '==', productId));
      const ratingsSnapshot = await getDocs(q);
      
      let totalRating = 0;
      let ratingCount = 0;
      
      ratingsSnapshot.forEach(doc => {
        const rating = doc.data().rating;
        if (rating && !isNaN(rating)) {
          totalRating += rating;
          ratingCount++;
        }
      });
      
      const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;
      
      // Update product document
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        averageRating: parseFloat(averageRating),
        ratingCount: ratingCount,
        updatedAt: new Date()
      });
      
      console.log('✅ Product average rating updated:', averageRating, 'from', ratingCount, 'ratings');
      return { success: true, data: { averageRating, ratingCount } };
    } catch (error) {
      console.error('❌ Error updating product average rating:', error);
      return { success: false, error: error.message };
    }
  },

  // Real-time ratings listener for a product
  onProductRatingsChange: (productId, callback) => {
    const ratingsCollection = collection(db, 'ratings');
    const q = query(
      ratingsCollection, 
      where('productId', '==', productId)
      // Temporarily removed orderBy to avoid index requirement
      // orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const ratings = [];
      snapshot.forEach((doc) => {
        ratings.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort manually in JavaScript
      ratings.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA; // Descending order
      });
      
      callback(ratings);
    });
  },

  // Real-time product average rating listener
  onProductAverageRatingChange: (productId, callback) => {
    const productRef = doc(db, 'products', productId);
    
    return onSnapshot(productRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          averageRating: data.averageRating || 0,
          ratingCount: data.ratingCount || 0
        });
      } else {
        callback({ averageRating: 0, ratingCount: 0 });
      }
    });
  }
};

// Main firebase service export
export const firebaseService = {
  ...productService,
  ...wishlistService,
  ...cartService,
  ...orderService,
  ...userService,
  ...ratingsService
}; 