import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Image, Alert } from 'react-native';
import { Card, Text, Button, Title, TextInput, Dialog, Portal, FAB, Chip, IconButton, Divider, Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const ProductManagementScreen = ({ navigation }) => {
  console.log('📱 ProductManagementScreen loaded');
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ visible: false, product: null });

  const categories = ['all', 'nuts', 'dried-fruits', 'seeds'];

  // Helper to get localized field
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj.en || Object.values(obj)[0] || '';
  };

  // Fetch products from Firebase
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getPriceBounds = (range) => {
    switch (range) {
      case 'low': return [0, 400];
      case 'medium': return [400, 700];
      case 'high': return [700, Infinity];
      default: return [0, Infinity];
    }
  };

  const [minPrice, maxPrice] = getPriceBounds(priceRange);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
    return matchesCategory && matchesPrice;
  });

  const openDialog = (product = null) => {
    setEditProduct(product);
    setName(product ? product.name : '');
    setPrice(product ? String(product.price) : '');
    setDescription(product ? product.description : '');
    setCategory(product ? product.category : '');
    setVisible(true);
  };

  const closeDialog = () => {
    setVisible(false);
    setEditProduct(null);
    setName('');
    setPrice('');
    setDescription('');
    setCategory('');
  };

  const handleSave = async () => {
    if (!name || !price || !description || !category) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (editProduct) {
        // Update existing product
        const productRef = doc(db, 'products', editProduct.id);
        await updateDoc(productRef, {
          name,
          price: Number(price),
          description,
          category,
          updatedAt: new Date()
        });
        Alert.alert('Success', 'Product updated successfully');
      } else {
        // Add new product
        await addDoc(collection(db, 'products'), {
          name,
          price: Number(price),
          description,
          category,
          imageUrl: 'https://via.placeholder.com/350x220?text=New+Product',
          inStock: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        Alert.alert('Success', 'Product added successfully');
      }
      closeDialog();
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    try {
      const productRef = doc(db, 'products', deleteDialog.product.id);
      await deleteDoc(productRef);
      Alert.alert('Success', 'Product deleted successfully');
      setDeleteDialog({ visible: false, product: null });
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Error', 'Failed to delete product');
    }
  };

  const isNewProduct = (product) => {
    return product.createdAt && (Date.now() - new Date(product.createdAt.toDate ? product.createdAt.toDate() : product.createdAt).getTime() < 1000 * 60 * 60 * 24 * 14);
  };

  const renderProductCard = ({ item }) => (
    <Card style={styles.productCard}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: item.imageUrl || 'https://via.placeholder.com/350x220?text=No+Image' }} 
          style={styles.productImage}
          resizeMode="contain"
        />
        <View style={styles.badgesContainer}>
          {(!item.inStock || item.stockQuantity <= 0) && (
            <Chip 
              mode="outlined" 
              compact 
              style={[styles.badge, styles.outOfStockBadge]}
              textStyle={styles.outOfStockText}
            >
              Out of Stock
            </Chip>
          )}
          {isNewProduct(item) && (
            <Chip 
              mode="outlined" 
              compact 
              style={[styles.badge, styles.newBadge]}
              textStyle={styles.newText}
            >
              New
            </Chip>
          )}
        </View>
      </View>
      
      <Card.Content style={styles.cardContent}>
        <Title style={styles.productName}>{getLocalized(item.name)}</Title>
        <Text style={styles.productDescription} numberOfLines={2}>
          {getLocalized(item.description)}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.productPrice}>₹{item.price}</Text>
          <View style={styles.actionButtons}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => navigation.navigate('ProductForm', { product: item })}
              style={styles.editButton}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={() => setDeleteDialog({ visible: true, product: item })}
              style={styles.deleteButton}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCategoryTab = ({ item }) => (
    <Button
      mode={selectedCategory === item ? "contained" : "outlined"}
      onPress={() => setSelectedCategory(item)}
      style={[styles.categoryTab, selectedCategory === item && styles.activeCategoryTab]}
      labelStyle={[styles.categoryLabel, selectedCategory === item && styles.activeCategoryLabel]}
    >
      {item.charAt(0).toUpperCase() + item.slice(1)}
    </Button>
  );

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Product Management</Title>
      
      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryTab}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        />
      </View>

      {/* Price Range Filter */}
      <View style={styles.filterContainer}>
        <Menu
          visible={false}
          onDismiss={() => {}}
          anchor={
            <Button
              mode="outlined"
              onPress={() => {}}
              icon="filter-variant"
              style={styles.filterButton}
            >
              Price: {priceRange === 'all' ? 'All' : 
                     priceRange === 'low' ? 'Under ₹400' :
                     priceRange === 'medium' ? '₹400-₹700' : 'Over ₹700'}
            </Button>
          }
        >
          <Menu.Item onPress={() => setPriceRange('all')} title="All Prices" />
          <Menu.Item onPress={() => setPriceRange('low')} title="Under ₹400" />
          <Menu.Item onPress={() => setPriceRange('medium')} title="₹400 - ₹700" />
          <Menu.Item onPress={() => setPriceRange('high')} title="Over ₹700" />
        </Menu>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
      />

      {filteredProducts.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <MaterialIcons name="inventory" size={48} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No products found</Text>
          <Text style={styles.emptyStateText}>Add your first product!</Text>
        </View>
      )}

      {/* Add Product FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Product"
        onPress={() => {
          console.log('🔄 FAB clicked - Navigating to ProductForm screen...');
          navigation.navigate('ProductForm');
        }}
      />

      {/* Add/Edit Product Dialog */}
      <Portal>
        <Dialog visible={visible} onDismiss={closeDialog} style={styles.dialog}>
          <Dialog.Title>{editProduct ? 'Edit Product' : 'Add Product'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Product Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
            <TextInput
              label="Price"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Category"
              value={category}
              onChangeText={setCategory}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button onPress={handleSave}>{editProduct ? 'Update' : 'Add'}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialog.visible} onDismiss={() => setDeleteDialog({ visible: false, product: null })}>
          <Dialog.Title>Confirm Delete</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{getLocalized(deleteDialog.product?.name)}"?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialog({ visible: false, product: null })}>Cancel</Button>
            <Button onPress={handleDelete} textColor="red">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  categoryTab: {
    marginRight: 8,
    borderRadius: 20,
  },
  activeCategoryTab: {
    backgroundColor: '#2E7D32',
  },
  categoryLabel: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  activeCategoryLabel: {
    color: '#fff',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    borderColor: '#2E7D32',
  },
  productsList: {
    paddingBottom: 80,
  },
  productCard: {
    flex: 1,
    margin: 4,
    elevation: 2,
    borderRadius: 8,
  },
  cardHeader: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f8f8f8',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    height: 20,
  },
  outOfStockBadge: {
    borderColor: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  outOfStockText: {
    color: '#d32f2f',
    fontSize: 10,
  },
  newBadge: {
    borderColor: '#F9A825',
    backgroundColor: '#fff3e0',
  },
  newText: {
    color: '#F9A825',
    fontSize: 10,
  },
  cardContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  editButton: {
    marginRight: 4,
  },
  deleteButton: {
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
  },
  dialog: {
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ProductManagementScreen; 