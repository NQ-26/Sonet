export {KeyboardAwareScrollView, useKeyboardHandler as useKeyboardHandler} from 'react-native-keyboard-controller'

// Shim for missing exports
export const KeyboardProvider = ({children, enabled, ...props}: any) => {
  const React = require('react')
  return React.createElement('div', props, children)
}

export const useKeyboardController = () => ({
  setEnabled: () => {},
  enabled: false,
})