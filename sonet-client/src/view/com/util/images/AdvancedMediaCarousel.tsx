import React, {useState, useRef, useCallback} from 'react'
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native'
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from '#/shims/react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated'
import {Image} from 'expo-image'
import {type SonetEmbedImages} from '@sonet/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {NoteEmbedViewContext} from '#/components/Note/Embed/types'
import {type Dimensions as MediaDimensions} from '../../lightbox/ImageViewing/@types'

const {width: SCREEN_WIDTH} = Dimensions.get('window')
const CAROUSEL_HEIGHT = 400
const ITEM_WIDTH = SCREEN_WIDTH - 32 // 16px padding on each side

interface AdvancedMediaCarouselProps {
  images: SonetEmbedImages.ViewImage[]
  onPress?: (index: number) => void
  onLongPress?: (index: number) => void
  style?: any
  viewContext?: NoteEmbedViewContext
  onPinchGesture?: (isCombined: boolean) => void
}

export function AdvancedMediaCarousel({
  images,
  onPress,
  onLongPress,
  style,
  viewContext,
  onPinchGesture,
}: AdvancedMediaCarouselProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCombined, setIsCombined] = useState(false)
  
  // Animation values
  const translateX = useSharedValue(0)
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  
  // Refs
  const scrollViewRef = useRef<any>(null)
  const containerRef = useRef<View>(null)
  
  // Handle swipe navigation
  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1)
      scrollViewRef.current?.scrollTo({x: (currentIndex + 1) * ITEM_WIDTH, animated: true})
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      scrollViewRef.current?.scrollTo({x: (currentIndex - 1) * ITEM_WIDTH, animated: true})
    }
  }, [currentIndex, images.length])
  
  // Handle pinch gesture for combine/uncombine
  const handlePinchGesture = useCallback((gestureState: State, scaleValue: number) => {
    if (gestureState === State.ACTIVE) {
      scale.value = scaleValue
      
      // If pinched enough, trigger combine mode
      if (scaleValue < 0.8 && !isCombined) {
        setIsCombined(true)
        onPinchGesture?.(true)
        opacity.value = withTiming(0.7, {duration: 300})
      } else if (scaleValue > 1.2 && isCombined) {
        setIsCombined(false)
        onPinchGesture?.(false)
        opacity.value = withTiming(1, {duration: 300})
      }
    } else if (gestureState === State.END) {
      // Reset scale with spring animation
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      })
    }
  }, [isCombined, onPinchGesture, scale, opacity])
  
  // Pan gesture handler for swipe navigation
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX
    },
    onEnd: (event) => {
      const shouldSwipe = Math.abs(event.velocityX) > 500
      
      if (shouldSwipe) {
        if (event.velocityX > 0 && currentIndex > 0) {
          // Swipe right - go to previous
          runOnJS(handleSwipe)('right')
        } else if (event.velocityX < 0 && currentIndex < images.length - 1) {
          // Swipe left - go to next
          runOnJS(handleSwipe)('left')
        }
      }
      
      // Reset position
      translateX.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      })
    },
  })
  
  // Animated styles
  const carouselStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {scale: scale.value},
    ],
    opacity: opacity.value,
  }))
  
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scale.value,
      [0.5, 1],
      [0.3, 1],
      Extrapolate.CLAMP
    ),
  }))
  
  // Render carousel indicators
  const renderIndicators = () => {
    if (images.length <= 1) return null
    
    return (
      <View style={styles.indicatorsContainer}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
              {backgroundColor: t.atoms.text_contrast_medium.color}
            ]}
          />
        ))}
      </View>
    )
  }
  
  // Render media items
  const renderMediaItem = (image: SonetEmbedImages.ViewImage, index: number) => {
    const isActive = index === currentIndex
    
    return (
      <View key={image.thumb} style={styles.mediaItem}>
        <Image
          source={{uri: image.thumb}}
          style={[
            styles.mediaImage,
            isCombined && styles.combinedImage
          ]}
          contentFit="cover"
          accessible={true}
          accessibilityLabel={image.alt || _(msg`Image ${index + 1}`)}
          accessibilityHint=""
          accessibilityIgnoresInvertColors
        />
        
        {/* Alt text overlay */}
        {image.alt && (
          <View style={styles.altTextOverlay}>
            <Text style={[styles.altText, {color: t.atoms.text.color}]}>
              {image.alt}
            </Text>
          </View>
        )}
        
        {/* Pinch hint for combine mode */}
        {isCombined && (
          <View style={styles.pinchHint}>
            <Text style={[styles.pinchHintText, {color: t.atoms.text_contrast_medium.color}]}>
              {_(msg`Pinch to separate`)}
            </Text>
          </View>
        )}
      </View>
    )
  }
  
  if (images.length === 0) return null
  
  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <PanGestureHandler onGestureEvent={panGestureHandler}>
        <Animated.View style={[styles.carouselContainer, carouselStyle]}>
          {/* Main carousel */}
          <View style={styles.carousel} ref={containerRef}>
            {images.map((image, index) => renderMediaItem(image, index))}
          </View>
          
          {/* Navigation arrows for multiple images */}
          {images.length > 1 && (
            <>
              {/* Left arrow */}
              {currentIndex > 0 && (
                <View style={[styles.navArrow, styles.leftArrow]}>
                  <Text style={[styles.arrowText, {color: t.atoms.text.color}]}>
                    ‹
                  </Text>
                </View>
              )}
              
              {/* Right arrow */}
              {currentIndex < images.length - 1 && (
                <View style={[styles.navArrow, styles.rightArrow]}>
                  <Text style={[styles.arrowText, {color: t.atoms.text.color}]}>
                    ›
                  </Text>
                </View>
              )}
            </>
          )}
          
          {/* Carousel indicators */}
          <Animated.View style={[styles.indicatorsWrapper, indicatorStyle]}>
            {renderIndicators()}
          </Animated.View>
          
          {/* Media count badge */}
          <View style={styles.mediaCountBadge}>
            <Text style={[styles.mediaCountText, {color: t.atoms.text_contrast_medium.color}]}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
  },
  carouselContainer: {
    flex: 1,
    position: 'relative',
  },
  carousel: {
    flex: 1,
    position: 'relative',
  },
  mediaItem: {
    width: ITEM_WIDTH,
    height: CAROUSEL_HEIGHT,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  combinedImage: {
    // Combined mode styling
    filter: 'brightness(0.8)',
  },
  altTextOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
  },
  altText: {
    fontSize: 14,
    lineHeight: 18,
  },
  pinchHint: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  pinchHintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    transform: [{translateY: -20}],
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  indicatorsWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
  },
  indicatorActive: {
    opacity: 1,
  },
  mediaCountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
})