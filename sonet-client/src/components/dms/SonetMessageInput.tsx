import React, {useCallback, useState, useRef} from 'react'
import {View, TextInput, TouchableOpacity, ScrollView, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {PaperPlane_Stroke2_Corner0_Rounded as SendIcon} from '#/components/icons/PaperPlane'
import {Plus_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Emoji_Stroke2_Corner0_Rounded as EmojiIcon} from '#/components/icons/Emoji'
import {Camera_Stroke2_Corner0_Rounded as CameraIcon} from '#/components/icons/Camera'
import {Paperclip_Stroke2_Corner0_Rounded as PaperclipIcon} from '#/components/icons/Times'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {ShieldCheck_Stroke2_Corner0_Rounded as ShieldCheckIcon} from '#/components/icons/Shield'
import {SonetFileAttachment} from './SonetFileAttachment'

interface SonetFileAttachment {
  id: string
  filename: string
  size: number
  type: string
  url?: string
  isEncrypted: boolean
  encryptionStatus: 'encrypted' | 'decrypted' | 'failed' | 'pending'
  uploadProgress?: number
  error?: string
}

interface SonetMessageInputProps {
  chatId: string
  onSendMessage: (content: string, attachments?: SonetFileAttachment[]) => Promise<void>
  isEncrypted?: boolean
  encryptionEnabled?: boolean
  onToggleEncryption?: () => void
  disabled?: boolean
  placeholder?: string
}

export function SonetMessageInput({
  chatId,
  onSendMessage,
  isEncrypted = false,
  encryptionEnabled = true,
  onToggleEncryption,
  disabled = false,
  placeholder,
}: SonetMessageInputProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [messageText, setMessageText] = useState('')
  const [attachments, setAttachments] = useState<SonetFileAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textInputRef = useRef<TextInput>(null)

  // Username sending message
  const usernameSendMessage = useCallback(async () => {
    if (!messageText.trim() && attachments.length === 0) return
    if (isSending || disabled) return

    setIsSending(true)
    try {
      await onSendMessage(messageText.trim(), attachments.length > 0 ? attachments : undefined)
      setMessageText('')
      setAttachments([])
      setShowAttachments(false)
      textInputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      Alert.alert(_('Error'), _('Failed to send message. Please try again.'))
    } finally {
      setIsSending(false)
    }
  }, [messageText, attachments, isSending, disabled, onSendMessage, _])

  // Username adding attachment
  const usernameAddAttachment = useCallback(async (type: 'camera' | 'file' | 'gallery') => {
    try {
      // TODO: Implement actual file picker/camera functionality
      // const file = await pickFile(type)
      // const attachment: SonetFileAttachment = {
      //   id: generateId(),
      //   filename: file.name,
      //   size: file.size,
      //   type: file.type,
      //   isEncrypted: isEncrypted,
      //   encryptionStatus: 'pending',
      //   uploadProgress: 0,
      // }
      // setAttachments(prev => [...prev, attachment])
      
      // Simulate adding attachment for now
      const mockAttachment: SonetFileAttachment = {
        id: `att_${Date.now()}`,
        filename: `sample_${type}_${Date.now()}.jpg`,
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
        isEncrypted: isEncrypted,
        encryptionStatus: 'pending',
        uploadProgress: 0,
      }
      setAttachments(prev => [...prev, mockAttachment])
      setShowAttachments(false)
    } catch (error) {
      console.error('Failed to add attachment:', error)
      Alert.alert(_('Error'), _('Failed to add attachment. Please try again.'))
    }
  }, [isEncrypted, _])

  // Handle removing attachment
  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }, [])

  // Handle retry attachment upload
  const handleRetryAttachment = useCallback(async (attachment: SonetFileAttachment) => {
    try {
      // TODO: Implement retry logic
      console.log('Retrying attachment:', attachment.id)
    } catch (error) {
      console.error('Failed to retry attachment:', error)
    }
  }, [])

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageText(prev => prev + emoji)
    setShowEmojiPicker(false)
    textInputRef.current?.focus()
  }, [])

  // Toggle encryption
  const handleToggleEncryption = useCallback(() => {
    if (onToggleEncryption) {
      onToggleEncryption()
    }
  }, [onToggleEncryption])

  // Check if can send
  const canSend = messageText.trim().length > 0 || attachments.length > 0

  return (
    <View style={[t.atoms.bg, a.border_t, t.atoms.border_contrast_25]}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <View style={[a.px_md, a.pt_sm]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[a.gap_sm]}>
            {attachments.map(attachment => (
              <SonetFileAttachment
                key={attachment.id}
                attachment={attachment}
                onDelete={handleRemoveAttachment}
                onRetry={handleRetryAttachment}
                isOwnMessage={true}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Message Input */}
      <View style={[a.flex_row, a.items_end, a.gap_sm, a.p_md]}>
        {/* Attachment Button */}
        <TouchableOpacity
          onPress={() => setShowAttachments(!showAttachments)}
          disabled={disabled}
          style={[
            a.p_2,
            a.rounded_full,
            t.atoms.bg_contrast_25,
            disabled && t.atoms.bg_contrast_50,
          ]}>
          <PlusIcon
            size="sm"
            style={[
              showAttachments ? t.atoms.text_primary : t.atoms.text_contrast_medium,
              disabled && t.atoms.text_contrast_50,
            ]}
          />
        </TouchableOpacity>

        {/* Text Input */}
        <View style={[a.flex_1, a.relative]}>
          <TextInput
            ref={textInputRef}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={placeholder || _('Type a message...')}
            placeholderTextColor={t.atoms.text_contrast_medium.color}
            multiline
            maxLength={1000}
            editable={!disabled}
            style={[
              a.px_md,
              a.py_sm,
              a.rounded_2xl,
              a.border,
              a.min_h_10,
              a.max_h_32,
              t.atoms.bg_contrast_25,
              t.atoms.text,
              t.atoms.border_contrast_25,
              disabled && t.atoms.bg_contrast_50,
            ]}
          />
          
          {/* Character Count */}
          {messageText.length > 0 && (
            <View style={[a.absolute, a.bottom_1, a.right_2]}>
              <Text
                style={[
                  a.text_xs,
                  messageText.length > 900 ? t.atoms.text_warning : t.atoms.text_contrast_medium,
                ]}>
                {messageText.length}/1000
              </Text>
            </View>
          )}
        </View>

        {/* Encryption Toggle */}
        {encryptionEnabled && onToggleEncryption && (
          <TouchableOpacity
            onPress={usernameToggleEncryption}
            disabled={disabled}
            style={[
              a.p_2,
              a.rounded_full,
              isEncrypted ? t.atoms.bg_positive_25 : t.atoms.bg_contrast_25,
              disabled && t.atoms.bg_contrast_50,
            ]}>
            {isEncrypted ? (
              <ShieldCheckIcon
                size="sm"
                style={[
                  t.atoms.text_positive,
                  disabled && t.atoms.text_contrast_50,
                ]}
              />
            ) : (
              <ShieldIcon
                size="sm"
                style={[
                  t.atoms.text_contrast_medium,
                  disabled && t.atoms.text_contrast_50,
                ]}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Emoji Button */}
        <TouchableOpacity
          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled}
          style={[
            a.p_2,
            a.rounded_full,
            t.atoms.bg_contrast_25,
            disabled && t.atoms.bg_contrast_50,
          ]}>
          <EmojiIcon
            size="sm"
            style={[
              showEmojiPicker ? t.atoms.text_primary : t.atoms.text_contrast_medium,
              disabled && t.atoms.text_contrast_50,
            ]}
          />
        </TouchableOpacity>

        {/* Send Button */}
        <TouchableOpacity
          onPress={usernameSendMessage}
          disabled={!canSend || isSending || disabled}
          style={[
            a.p_2,
            a.rounded_full,
            canSend && !disabled
              ? t.atoms.bg_primary
              : t.atoms.bg_contrast_25,
            disabled && t.atoms.bg_contrast_50,
          ]}>
          <SendIcon
            size="sm"
            style={[
              canSend && !disabled
                ? t.atoms.text_on_primary
                : t.atoms.text_contrast_medium,
              disabled && t.atoms.text_contrast_50,
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Attachments Menu */}
      {showAttachments && (
        <View
          style={[
            a.px_md,
            a.pb_md,
            a.gap_sm,
            a.border_t,
            t.atoms.border_contrast_25,
          ]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
            <Trans>Add Attachment</Trans>
          </Text>
          
          <View style={[a.flex_row, a.gap_sm]}>
            <TouchableOpacity
              onPress={() => usernameAddAttachment('camera')}
              style={[
                a.flex_1,
                a.flex_row,
                a.items_center,
                a.justify_center,
                a.gap_sm,
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
              <CameraIcon
                size="sm"
                style={[t.atoms.text_contrast_medium]}
              />
              <Text style={[a.text_sm, t.atoms.text]}>
                <Trans>Camera</Trans>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => usernameAddAttachment('gallery')}
              style={[
                a.flex_1,
                a.flex_row,
                a.items_center,
                a.justify_center,
                a.gap_sm,
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
              <PaperclipIcon
                size="sm"
                style={[t.atoms.text_contrast_medium]}
              />
              <Text style={[a.text_sm, t.atoms.text]}>
                <Trans>Gallery</Trans>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => usernameAddAttachment('file')}
              style={[
                a.flex_1,
                a.flex_row,
                a.items_center,
                a.justify_center,
                a.gap_sm,
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
              <PaperclipIcon
                size="sm"
                style={[t.atoms.text_contrast_medium]}
              />
              <Text style={[a.text_sm, t.atoms.text]}>
                <Trans>File</Trans>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <View
          style={[
            a.px_md,
            a.pb_md,
            a.gap_sm,
            a.border_t,
            t.atoms.border_contrast_25,
          ]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
            <Trans>Emojis</Trans>
          </Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[a.gap_sm]}>
            {['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '❤️', '🔥', '✨', '🎉', '🚀'].map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => usernameEmojiSelect(emoji)}
                style={[
                  a.p_2,
                  a.rounded_sm,
                  t.atoms.bg_contrast_25,
                ]}>
                <Text style={[a.text_lg]}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}