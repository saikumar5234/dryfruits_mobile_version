import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Text as RNText
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
  IconButton,
  Searchbar,
  DataTable,
  SegmentedButtons,
  Title,
  Paragraph
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/firebaseService';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width, height } = Dimensions.get('window');

// Mock price history data generator
const generatePriceHistory = (basePrice, days = 30) => {
  const history = [];
  let currentPrice = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate price fluctuations
    const change = (Math.random() - 0.5) * 0.1; // ±5% change
    currentPrice = Math.max(currentPrice * (1 + change), basePrice * 0.7);
    
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(currentPrice * 100) / 100,
      volume: Math.floor(Math.random() * 100) + 10,
      high: Math.round(currentPrice * (1 + Math.random() * 0.05) * 100) / 100,
      low: Math.round(currentPrice * (1 - Math.random() * 0.05) * 100) / 100,
      open: Math.round(currentPrice * (1 + (Math.random() - 0.5) * 0.02) * 100) / 100,
      close: Math.round(currentPrice * 100) / 100
    });
  }
  
  return history;
};

const AnalyticsScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchPriceHistory(selectedProduct);
    }
  }, [selectedProduct, timeRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchProducts();
      if (selectedProduct) {
        await fetchPriceHistory(selectedProduct);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      
      if (response.success && response.data) {
        setProducts(response.data);
        if (response.data.length > 0 && !selectedProduct) {
          setSelectedProduct(response.data[0]);
        }
      } else {
        console.error('Failed to fetch products:', response.error);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async (product) => {
    if (!product) return;
    try {
      setLoadingHistory(true);
      console.log('📊 Fetching price history for product:', product.id);
      
      // Try to fetch real price history from Firebase
      const priceHistoryRef = collection(db, 'products', product.id, 'priceHistory');
      const q = query(priceHistoryRef, orderBy('date', 'asc'));
      const snapshot = await getDocs(q);
      
      console.log('📊 Price history snapshot size:', snapshot.size);
      
      if (!snapshot.empty) {
        const history = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📊 Price history entry:', data);
          let dateString;
          if (data.date instanceof Date) {
            dateString = data.date.toISOString().split('T')[0];
          } else if (typeof data.date === 'string') {
            if (data.date.includes('T')) {
              dateString = data.date.split('T')[0];
            } else {
              dateString = data.date;
            }
          } else {
            dateString = new Date().toISOString().split('T')[0];
          }
          return {
            ...data,
            date: dateString,
            price: parseFloat(data.price) || 0
          };
        });
        
        // Remove duplicates based on date, keeping the latest entry for each date
        const uniqueHistory = history.reduce((acc, current) => {
          const existingIndex = acc.findIndex(item => item.date === current.date);
          if (existingIndex >= 0) {
            // Replace existing entry with current one (assuming current is more recent)
            acc[existingIndex] = current;
          } else {
            acc.push(current);
          }
          return acc;
        }, []);
        
        uniqueHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log('📊 Processed price history:', uniqueHistory);
        setPriceHistory(uniqueHistory);
      } else {
        console.log('📊 No price history found, creating default entry');
        // If no price history exists, create a default entry with current product price
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        setPriceHistory([{ 
          price: parseFloat(product.price) || 0, 
          date: dateString, 
          createdAt: today, 
          type: 'default' 
        }]);
      }
    } catch (error) {
      console.error('❌ Error fetching price history:', error);
      // Fallback to single entry with current product price
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      setPriceHistory([{ 
        price: parseFloat(product.price) || 0, 
        date: dateString, 
        createdAt: today, 
        type: 'default' 
      }]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getFilteredData = () => {
    if (priceHistory.length === 0) return [];
    
    // Filter data based on selected time range
    const days = parseInt(timeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredHistory = priceHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= cutoffDate;
    });

    // If no data in range, use all available data
    return filteredHistory.length > 0 ? filteredHistory : priceHistory;
  };

  const calculatePriceChange = () => {
    const filteredData = getFilteredData();
    if (filteredData.length < 2) {
      return { change: 0, percentage: 0, trend: 'neutral' };
    }
    
    const currentEntry = filteredData[filteredData.length - 1];
    const previousEntry = filteredData[filteredData.length - 2];
    
    if (!currentEntry || !previousEntry) {
      return { change: 0, percentage: 0, trend: 'neutral' };
    }
    
    const currentPrice = currentEntry.price;
    const previousPrice = previousEntry.price;
    const change = currentPrice - previousPrice;
    const percentage = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
    
    return {
      change: Math.round(change * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const calculateStats = () => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return {};
    
    const prices = filteredData.map(h => h.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    return {
      maxPrice: Math.round(maxPrice * 100) / 100,
      minPrice: Math.round(minPrice * 100) / 100,
      avgPrice: Math.round(avgPrice * 100) / 100
    };
  };

  const priceChange = calculatePriceChange();
  const stats = calculateStats();

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <MaterialIcons name="trending-up" size={24} color="#4caf50" />;
      case 'down': return <MaterialIcons name="trending-down" size={24} color="#f44336" />;
      default: return <MaterialIcons name="remove" size={24} color="#9e9e9e" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return '#4caf50';
      case 'down': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getLocalized = (text) => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'object') {
      return text.en || text.hi || text.te || Object.values(text)[0] || '';
    }
    return '';
  };

  const formatChartData = () => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }]
      };
    }

    // Use all filtered data for the chart (no arbitrary limit)
    const chartData = filteredData;
    
    const data = chartData.map(record => record.price);
    const labels = chartData.map((record, index) => {
      const d = new Date(record.date);
      // Create unique labels by including year and using a more specific format
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
    });
    
    return {
      labels,
      datasets: [{ data }]
    };
  };

  const chartConfig = {
    backgroundGradientFrom: '#f5f5f5',
    backgroundGradientTo: '#f5f5f5',
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 2,
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#2E7D32', '#4CAF50']}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <IconButton
          icon="arrow-left"
          iconColor="#fff"
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Market Analytics</Text>
          <Text style={styles.headerSubtitle}>Track price movements and market trends</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderProductSelector = () => (
    <Card style={styles.selectorCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Select Product</Title>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.productChip,
                selectedProduct?.id === product.id && styles.selectedProductChip
              ]}
              onPress={() => setSelectedProduct(product)}
            >
              <Text style={[
                styles.productChipText,
                selectedProduct?.id === product.id && styles.selectedProductChipText
              ]}>
                {getLocalized(product.name)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.timeRangeContainer}>
          <Text style={styles.timeRangeLabel}>Time Range:</Text>
          <View style={styles.timeRangeButtons}>
            {['7', '30', '90', '365'].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.activeTimeRangeButton
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text style={[
                  styles.timeRangeButtonText,
                  timeRange === range && styles.activeTimeRangeButtonText
                ]}>
                  {range === '7' ? '1W' : range === '30' ? '1M' : range === '90' ? '3M' : '1Y'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderPriceOverview = () => {
    if (!selectedProduct) return null;
    
    const filteredData = getFilteredData();
    const currentPrice = filteredData.length > 0 ? filteredData[filteredData.length - 1].price : selectedProduct.price;
    
    return (
      <Card style={styles.priceCard}>
        <Card.Content>
          <View style={styles.priceHeader}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{getLocalized(selectedProduct.name)}</Text>
              <Text style={styles.currentPrice}>₹{currentPrice}</Text>
              <View style={styles.trendContainer}>
                {getTrendIcon(priceChange.trend)}
                <Text style={[styles.priceChange, { color: getTrendColor(priceChange.trend) }]}>
                  {priceChange.trend === 'up' ? '+' : ''}₹{priceChange.change}
                </Text>
                <Text style={[styles.pricePercentage, { color: getTrendColor(priceChange.trend) }]}>
                  ({priceChange.trend === 'up' ? '+' : ''}{priceChange.percentage}%)
                </Text>
              </View>
            </View>
            
            <View style={styles.statsGrid}>
              <View key="price-highest" style={styles.statItem}>
                <Text style={styles.statValue}>₹{stats.maxPrice}</Text>
                <Text style={styles.statLabel}>Highest</Text>
              </View>
              <View key="price-lowest" style={styles.statItem}>
                <Text style={styles.statValue}>₹{stats.minPrice}</Text>
                <Text style={styles.statLabel}>Lowest</Text>
              </View>
              <View key="price-average" style={styles.statItem}>
                <Text style={styles.statValue}>₹{stats.avgPrice}</Text>
                <Text style={styles.statLabel}>Average</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <SegmentedButtons
        value={tabValue.toString()}
        onValueChange={(value) => setTabValue(parseInt(value))}
        buttons={[
          { value: '0', label: 'Chart', icon: 'chart-line' },
          { value: '1', label: 'History', icon: 'timeline' },
          { value: '2', label: 'Analytics', icon: 'chart-bar' }
        ]}
        style={styles.segmentedButtons}
      />
    </View>
  );

  const renderChartTab = () => (
    <Card style={styles.chartCard}>
      <Card.Content>
        <Title style={styles.chartTitle}>Price Movement Chart</Title>
        {priceHistory.length > 0 ? (
          <LineChart
            data={formatChartData()}
            width={width - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <MaterialIcons name="show-chart" size={48} color="#ccc" />
            <Text style={styles.noDataText}>No price data available</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderHistoryTab = () => {
    const filteredData = getFilteredData();
    
    return (
      <Card style={styles.historyCard}>
        <Card.Content>
          <Title style={styles.historyTitle}>Price History</Title>
          <ScrollView style={styles.historyTable}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Date</Text>
              <Text style={styles.tableHeaderText}>Price</Text>
              <Text style={styles.tableHeaderText}>Change</Text>
              <Text style={styles.tableHeaderText}>Trend</Text>
            </View>
            {filteredData.slice(-10).reverse().map((record, index, reversedArray) => {
              const prevRecord = reversedArray[index + 1];
              const change = prevRecord ? record.price - prevRecord.price : 0;
              const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
              
              return (
                <View key={`history-${record.date}-${index}-${record.price}`} style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.tableCell}>₹{record.price}</Text>
                  <Text style={[styles.tableCell, { color: getTrendColor(trend) }]}>
                    {change > 0 ? '+' : ''}₹{Math.round(change * 100) / 100}
                  </Text>
                  <View style={styles.tableCell}>
                    {getTrendIcon(trend)}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Card.Content>
      </Card>
    );
  };

  const renderAnalyticsTab = () => (
    <View style={styles.analyticsContainer}>
      <Card style={styles.analyticsCard}>
        <Card.Content>
          <Title style={styles.analyticsTitle}>Market Analytics Insights</Title>
          
          <View style={styles.analyticsGrid}>
            <View key="max-price" style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>₹{stats.maxPrice}</Text>
              <Text style={styles.analyticsLabel}>Highest Price</Text>
            </View>
            <View key="min-price" style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>₹{stats.minPrice}</Text>
              <Text style={styles.analyticsLabel}>Lowest Price</Text>
            </View>
            <View key="avg-price" style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>₹{stats.avgPrice}</Text>
              <Text style={styles.analyticsLabel}>Average Price</Text>
            </View>
            <View key="volatility" style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>
                {Math.round(((stats.maxPrice - stats.minPrice) / stats.avgPrice) * 100)}%
              </Text>
              <Text style={styles.analyticsLabel}>Volatility</Text>
            </View>
          </View>
          
          <View style={styles.marketTrendContainer}>
            <View style={styles.trendInfo}>
              {getTrendIcon(priceChange.trend)}
              <Text style={[styles.trendText, { color: getTrendColor(priceChange.trend) }]}>
                {priceChange.trend === 'up' ? 'Bullish' : priceChange.trend === 'down' ? 'Bearish' : 'Neutral'}
              </Text>
            </View>
            <Text style={styles.trendLabel}>Market Trend</Text>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderProductSelector()}
        
        {selectedProduct && (
          <>
            {renderPriceOverview()}
            {renderTabs()}
            
            {tabValue === 0 && renderChartTab()}
            {tabValue === 1 && renderHistoryTab()}
            {tabValue === 2 && renderAnalyticsTab()}
          </>
        )}
        
        {!selectedProduct && (
          <Card style={styles.noProductCard}>
            <Card.Content>
              <Text style={styles.noProductText}>Select a product to view analytics</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  backButton: {
    margin: 0,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  selectorCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  productChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  selectedProductChip: {
    borderColor: '#2E7D32',
    backgroundColor: '#e8f5e8',
  },
  productChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedProductChipText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  timeRangeContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  timeRangeButtons: {
    flexDirection: 'row',
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  activeTimeRangeButton: {
    borderColor: '#2E7D32',
    backgroundColor: '#2E7D32',
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeTimeRangeButtonText: {
    color: '#fff',
  },
  priceCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceChange: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pricePercentage: {
    fontSize: 14,
    marginLeft: 4,
  },
  statsGrid: {
    alignItems: 'flex-end',
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  tabsContainer: {
    marginBottom: 16,
  },
  segmentedButtons: {
    borderRadius: 8,
  },
  chartCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  historyCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  historyTable: {
    maxHeight: 300,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
  },
  analyticsContainer: {
    marginBottom: 16,
  },
  analyticsCard: {
    borderRadius: 12,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  marketTrendContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  trendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  trendLabel: {
    fontSize: 14,
    color: '#666',
  },
  noProductCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 12,
  },
  noProductText: {
    fontSize: 16,
    color: '#666',
  },
});

export default AnalyticsScreen; 