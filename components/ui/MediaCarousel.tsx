// Enhanced Media Carousel Component for Gloup ✨
import React, { useState, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  Dimensions, 
  Text,
  ActivityIndicator 
} from 'react-native';
import { X, Play, Download } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { AnalyticsManager } from '@/lib/analytics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MediaCarouselProps {
  media: string[];
  metadata?: Record<string, any>[];
}

interface MediaItemProps {
  uri: string;
  index: number;
  total: number;
  onPress: (index: number) => void;
  style?: any;
}

export function MediaCarousel({ media, metadata = [] }: MediaCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});

  const openFullscreen = useCallback((index: number) => {
    AnalyticsManager.trackUserAction('media_view', 'fullscreen', {
      mediaIndex: index,
      totalMedia: media.length,
    });
    setSelectedIndex(index);
  }, [media.length]);

  const closeFullscreen = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handleImageLoad = useCallback((index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: false }));
  }, []);

  const handleImageLoadStart = useCallback((index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: true }));
  }, []);

  if (media.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        {media.length === 1 && (
          <SingleMediaView 
            uri={media[0]} 
            index={0}
            total={1}
            onPress={openFullscreen}
            onLoadStart={() => handleImageLoadStart(0)}
            onLoad={() => handleImageLoad(0)}
            loading={loadingStates[0]}
          />
        )}

        {media.length === 2 && (
          <TwoMediaGrid 
            media={media} 
            onPress={openFullscreen}
            onLoadStart={handleImageLoadStart}
            onLoad={handleImageLoad}
            loadingStates={loadingStates}
          />
        )}

        {media.length === 3 && (
          <ThreeMediaGrid 
            media={media} 
            onPress={openFullscreen}
            onLoadStart={handleImageLoadStart}
            onLoad={handleImageLoad}
            loadingStates={loadingStates}
          />
        )}

        {media.length >= 4 && (
          <FourPlusMediaGrid 
            media={media} 
            onPress={openFullscreen}
            onLoadStart={handleImageLoadStart}
            onLoad={handleImageLoad}
            loadingStates={loadingStates}
          />
        )}
      </View>

      <FullscreenModal 
        media={media} 
        selectedIndex={selectedIndex} 
        onClose={closeFullscreen}
        metadata={metadata}
      />
    </>
  );
}

// Single Media View
function SingleMediaView({ 
  uri, 
  index, 
  total, 
  onPress, 
  onLoadStart, 
  onLoad, 
  loading 
}: MediaItemProps & { 
  onLoadStart: () => void; 
  onLoad: () => void; 
  loading?: boolean; 
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onPress(index);
  }, [index, onPress, scale]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.singleImageContainer}>
          <Image 
            source={{ uri }} 
            style={styles.singleImage}
            resizeMode="cover"
            onLoadStart={onLoadStart}
            onLoad={onLoad}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Two Media Grid
function TwoMediaGrid({ 
  media, 
  onPress, 
  onLoadStart, 
  onLoad, 
  loadingStates 
}: {
  media: string[];
  onPress: (index: number) => void;
  onLoadStart: (index: number) => void;
  onLoad: (index: number) => void;
  loadingStates: Record<number, boolean>;
}) {
  return (
    <View style={styles.twoImageContainer}>
      {media.slice(0, 2).map((uri, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.twoImageItem}
          onPress={() => onPress(index)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri }} 
            style={styles.twoImage} 
            resizeMode="cover"
            onLoadStart={() => onLoadStart(index)}
            onLoad={() => onLoad(index)}
          />
          {loadingStates[index] && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#8B5CF6" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Three Media Grid
function ThreeMediaGrid({ 
  media, 
  onPress, 
  onLoadStart, 
  onLoad, 
  loadingStates 
}: {
  media: string[];
  onPress: (index: number) => void;
  onLoadStart: (index: number) => void;
  onLoad: (index: number) => void;
  loadingStates: Record<number, boolean>;
}) {
  return (
    <View style={styles.threeImageContainer}>
      <TouchableOpacity 
        style={styles.threeImageMain}
        onPress={() => onPress(0)}
        activeOpacity={0.9}
      >
        <Image 
          source={{ uri: media[0] }} 
          style={styles.threeMainImage} 
          resizeMode="cover"
          onLoadStart={() => onLoadStart(0)}
          onLoad={() => onLoad(0)}
        />
        {loadingStates[0] && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#8B5CF6" />
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.threeImageSide}>
        {media.slice(1, 3).map((uri, index) => (
          <TouchableOpacity 
            key={index + 1} 
            style={styles.threeSideItem}
            onPress={() => onPress(index + 1)}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri }} 
              style={styles.threeSideImage} 
              resizeMode="cover"
              onLoadStart={() => onLoadStart(index + 1)}
              onLoad={() => onLoad(index + 1)}
            />
            {loadingStates[index + 1] && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#8B5CF6" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Four Plus Media Grid
function FourPlusMediaGrid({ 
  media, 
  onPress, 
  onLoadStart, 
  onLoad, 
  loadingStates 
}: {
  media: string[];
  onPress: (index: number) => void;
  onLoadStart: (index: number) => void;
  onLoad: (index: number) => void;
  loadingStates: Record<number, boolean>;
}) {
  const remainingCount = media.length - 4;

  return (
    <View style={styles.fourImageContainer}>
      {media.slice(0, 3).map((uri, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.fourImageItem}
          onPress={() => onPress(index)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri }} 
            style={styles.fourImage} 
            resizeMode="cover"
            onLoadStart={() => onLoadStart(index)}
            onLoad={() => onLoad(index)}
          />
          {loadingStates[index] && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#8B5CF6" />
            </View>
          )}
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity 
        style={styles.fourImageItem}
        onPress={() => onPress(3)}
        activeOpacity={0.9}
      >
        <Image 
          source={{ uri: media[3] }} 
          style={styles.fourImage} 
          resizeMode="cover"
          onLoadStart={() => onLoadStart(3)}
          onLoad={() => onLoad(3)}
        />
        {remainingCount > 0 && (
          <View style={styles.moreImagesOverlay}>
            <Text style={styles.moreImagesCount}>+{remainingCount}</Text>
          </View>
        )}
        {loadingStates[3] && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#8B5CF6" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Fullscreen Modal Component
interface FullscreenModalProps {
  media: string[];
  selectedIndex: number | null;
  onClose: () => void;
  metadata?: Record<string, any>[];
}

function FullscreenModal({ media, selectedIndex, onClose, metadata = [] }: FullscreenModalProps) {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex || 0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (selectedIndex !== null) {
      setCurrentIndex(selectedIndex);
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setCurrentIndex)(0);
      });
    }
  }, [selectedIndex, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (selectedIndex === null) return null;

  return (
    <Modal visible={true} transparent animationType="none">
      <Animated.View style={[styles.modalContainer, animatedStyle]}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.imageCounter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {media.length}
          </Text>
        </View>
        
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: currentIndex * screenWidth, y: 0 }}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentIndex(newIndex);
          }}
        >
          {media.map((uri, index) => (
            <View key={index} style={styles.fullscreenImageContainer}>
              <Image 
                source={{ uri }} 
                style={styles.fullscreenImage} 
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
        
        {metadata[currentIndex] && (
          <View style={styles.metadataContainer}>
            <Text style={styles.metadataText}>
              {metadata[currentIndex].description || ''}
            </Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  singleImageContainer: {
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  twoImageContainer: {
    flexDirection: 'row',
    height: 200,
    gap: 4,
  },
  twoImageItem: {
    flex: 1,
    position: 'relative',
  },
  twoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  threeImageContainer: {
    flexDirection: 'row',
    height: 200,
    gap: 4,
  },
  threeImageMain: {
    flex: 2,
    position: 'relative',
  },
  threeMainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  threeImageSide: {
    flex: 1,
    gap: 4,
  },
  threeSideItem: {
    flex: 1,
    position: 'relative',
  },
  threeSideImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  fourImageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 200,
    gap: 4,
  },
  fourImageItem: {
    width: '48%',
    height: '48%',
    position: 'relative',
  },
  fourImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  moreImagesCount: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },
  counterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  fullscreenImageContainer: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  metadataContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
  },
  metadataText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
});