// Shim for react-native-gesture-handler State enum which is not available in react-native-web
// This is used for gesture state management, but on web we don't need it

export enum State {
  UNDETERMINED = 0,
  FAILED = 1,
  BEGAN = 2,
  CANCELLED = 3,
  ACTIVE = 4,
  END = 5,
}

// Re-export other gesture handler components as simple wrappers
export const GestureHandlerRootView = ({children, style, ...props}: any) => {
  const React = require('react')
  return React.createElement('div', {style, ...props}, children)
}

export const PanGestureHandler = ({children, onGestureEvent, ...props}: any) => {
  const React = require('react')
  return React.createElement('div', {onTouchStart: onGestureEvent, ...props}, children)
}

// Additional exports that might be needed
export const Gesture = {
  Pan: () => ({}),
  Pinch: () => ({}),
}

export const GestureDetector = ({children, gesture, ...props}: any) => {
  const React = require('react')
  return React.createElement('div', props, children)
}

// Re-export from the actual package for components that exist
export {KeyboardAwareScrollView, useKeyboardHandler} from 'react-native-keyboard-controller'

// Make sure State and PanGestureHandler are properly exported
export {State, PanGestureHandler}