import {View} from 'react-native'
import React, {useCallback, useMemo} from 'react'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Close_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {ExternalLink_Stroke2_Corner0_Rounded as ExternalLinkIcon} from '#/components/icons/Times'
import {Image_Stroke2_Corner0_Rounded as ImageIcon} from '#/components/icons/Image'
import {Text} from '#/components/Typography'
import {Avatar} from '#/view/com/util/Avatar'
import {Link} from '#/components/Link'
import {isBskyNoteUrl} from '#/lib/urls/isBskyNoteUrl'
import {useRichText} from '#/lib/hooks/useRichText'
import {useModerationCause} from '#/lib/moderation/useModerationCause'
import {useModerationCauseLabel} from '#/lib/moderation/useModerationCauseLabel'

export function useMessageEmbed() {
  const [embedUri, setEmbedUri] = React.useState<string | null>(null)
  
  const setEmbed = React.useCallback((uri: string | null) => {
    setEmbedUri(uri)
  }, [])
  
  return {
    embedUri,
    setEmbed,
  }
}

export function MessageInputEmbed({
  embed,
  onRemove,
}: {
  embed: any // TODO: Replace with proper Sonet embed type
  onRemove: () => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const navigation = useNavigation()

  const handleRemove = useCallback(() => {
    onRemove()
  }, [onRemove])

  const handlePress = useCallback(() => {
    // Handle navigation to the embedded content
    if (embed.type === 'note') {
      // Navigate to note
      navigation.navigate('NoteThread' as any, {uri: embed.uri})
    } else if (embed.type === 'external') {
      // Open external link
      // TODO: Implement external link handling
    }
  }, [embed, navigation])

  const renderEmbedContent = () => {
    switch (embed.type) {
      case 'images':
        return (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <ImageIcon width={20} height={20} fill={t.atoms.text_contrast_medium.color} />
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Image</Trans>
            </Text>
          </View>
        )
      
      case 'external':
        return (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <ExternalLinkIcon width={20} height={20} fill={t.atoms.text_contrast_medium.color} />
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]} numberOfLines={1}>
              {embed.external?.title || embed.external?.uri || 'External link'}
            </Text>
          </View>
        )
      
      case 'record':
        if (embed.record?.type === 'note') {
          const note = embed.record
          const author = note.author
          const content = note.record?.text || ''
          
          return (
            <View style={[a.flex_row, a.align_center, a.gap_sm]}>
              <Avatar size={24} image={author?.avatar} />
              <View style={[a.flex_1, a.min_w_0]}>
                <Text style={[a.text_sm, a.font_bold]} numberOfLines={1}>
                  {author?.displayName || author?.username || 'Unknown'}
                </Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]} numberOfLines={2}>
                  {content}
                </Text>
              </View>
            </View>
          )
        }
        return (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Embedded content</Trans>
            </Text>
          </View>
        )
      
      case 'video':
        return (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Video</Trans>
            </Text>
          </View>
        )
      
      default:
        return (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>Embedded content</Trans>
          </Text>
        )
    }
  }

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.justify_between,
        a.px_md,
        a.py_sm,
        a.mb_sm,
        a.rounded_md,
        t.atoms.bg_contrast_25,
        a.border,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_1, a.mr_sm]} onTouchEnd={usernamePress}>
        {renderEmbedContent()}
      </View>
      
      <Button
        label={_(msg`Remove embed`)}
        size="small"
        color="secondary"
        variant="ghost"
        onPress={handleRemove}>
        <ButtonIcon icon={CloseIcon} />
      </Button>
    </View>
  )
}
