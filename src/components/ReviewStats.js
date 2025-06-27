import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width } = Dimensions.get('window');

const ReviewStats = ({ productId, compact = false, compactFiveStarOnly = false }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviewStats();
  }, [productId]);

  const fetchReviewStats = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId)
      );
      
      const querySnapshot = await getDocs(q);
      const reviews = querySnapshot.docs.map(doc => doc.data());
      
      if (reviews.length === 0) {
        setStats(null);
        return;
      }

      const totalReviews = reviews.length;
      const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      const verifiedReviews = reviews.filter(review => review.verified).length;
      
      reviews.forEach(review => {
        ratingDistribution[review.rating]++;
      });

      const topRating = Object.keys(ratingDistribution).reduce((a, b) => 
        ratingDistribution[a] > ratingDistribution[b] ? a : b
      );

      setStats({
        totalReviews,
        avgRating,
        ratingDistribution,
        verifiedReviews,
        topRating: parseInt(topRating)
      });
    } catch (error) {
      console.error('Error fetching review stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, size = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={star <= rating ? "star" : "star-border"}
            size={size}
            color={star <= rating ? "#F9A825" : "#ccc"}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.noReviewsContainer}>
        <Text style={styles.noReviewsText}>No reviews yet</Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {renderStars(stats.avgRating, 14)}
        <Text style={styles.reviewCount}>({stats.totalReviews})</Text>
        {stats.verifiedReviews > 0 && (
          <View style={styles.verifiedChip}>
            <MaterialIcons name="verified" size={12} color="#2E7D32" />
            <Text style={styles.verifiedText}>
              {Math.round((stats.verifiedReviews / stats.totalReviews) * 100)}% verified
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (compactFiveStarOnly) {
    if (!stats || !stats.ratingDistribution) {
      return (
        <View style={styles.noReviewsContainer}>
          <Text style={styles.noReviewsText}>No reviews yet</Text>
        </View>
      );
    }
    if (stats.totalReviews > 0 && stats.ratingDistribution[5] === 0) {
      return (
        <View style={styles.compactContainer}>
          {renderStars(stats.avgRating, 14)}
          <Text style={styles.reviewCount}>({stats.totalReviews})</Text>
        </View>
      );
    }
    if (stats.ratingDistribution[5] > 0) {
      return (
        <View style={styles.compactContainer}>
          <Text style={styles.fiveStarText}>5★: {stats.ratingDistribution[5]}</Text>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.avgRating}>{stats.avgRating.toFixed(1)}</Text>
        {renderStars(stats.avgRating, 16)}
        <Text style={styles.reviewCount}>({stats.totalReviews} reviews)</Text>
      </View>
      
      <View style={styles.distributionContainer}>
        {[5, 4, 3, 2, 1].map((rating) => (
          <View key={rating} style={styles.ratingBar}>
            <Text style={styles.ratingLabel}>{rating}★</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${(stats.ratingDistribution[rating] / stats.totalReviews) * 100}%`,
                    backgroundColor: rating >= 4 ? '#2E7D32' : rating >= 3 ? '#ff9800' : '#d32f2f'
                  }
                ]} 
              />
            </View>
            <Text style={styles.ratingCount}>{stats.ratingDistribution[rating]}</Text>
          </View>
        ))}
      </View>
      
      {stats.verifiedReviews > 0 && (
        <View style={styles.verifiedContainer}>
          <MaterialIcons name="verified" size={16} color="#2E7D32" />
          <Text style={styles.verifiedText}>{stats.verifiedReviews} verified purchases</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  noReviewsContainer: {
    alignItems: 'center',
    padding: 8,
  },
  noReviewsText: {
    fontSize: 12,
    color: '#999',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#2E7D32',
    marginLeft: 2,
    fontWeight: '500',
  },
  fiveStarText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avgRating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginRight: 8,
  },
  distributionContainer: {
    marginBottom: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    width: 30,
    color: '#333',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingCount: {
    fontSize: 10,
    width: 25,
    textAlign: 'right',
    color: '#666',
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
});

export default ReviewStats; 