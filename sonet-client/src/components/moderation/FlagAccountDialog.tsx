import React, {useState} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {logger} from '#/logger'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'
import * as TextField from '#/components/forms/TextField'
import * as Select from '#/components/Select'
import {flaggingService, type FlagAccountRequest} from '#/services/flaggingService'
import * as Toast from '#/view/com/util/Toast'
import type * as sonet from '#/types/sonet'

export {useDialogControl} from '#/components/Dialog'

export function FlagAccountDialog({
  control,
  profile,
}: {
  control: Dialog.DialogControlProps
  profile: sonet.profile.AnyProfileView
}) {
  const {_} = useLingui()
  const t = useTheme()
  const [reason, setReason] = useState('')
  const [customWarning, setCustomWarning] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const flagReasons = [
    {value: 'spam', label: _('Spam activity')},
    {value: 'harassment', label: _('Harassment')},
    {value: 'inappropriate_content', label: _('Inappropriate content')},
    {value: 'fake_news', label: _('Misinformation')},
    {value: 'bot_activity', label: _('Bot activity')},
    {value: 'other', label: _('Other')},
  ]

  const handleSubmit = async () => {
    if (!reason) {
      Toast.show(_(msg`Please select a reason for flagging`), 'xmark')
      return
    }

    setIsSubmitting(true)
    try {
      const request: FlagAccountRequest = {
        accountId: profile.id,
        reason,
        warningMessage: customWarning || undefined,
      }

      const response = await flaggingService.flagAccount(request)
      
      if (response.success) {
        Toast.show(_(msg`Account flagged for Sonet moderation review`))
        control.close()
        
        logger.metric('moderation:account:flagged', {
          accountId: profile.id,
          reason,
          hasCustomWarning: !!customWarning,
        })
      } else {
        Toast.show(_(msg`Failed to flag account`), 'xmark')
      }
    } catch (error) {
      logger.error('Failed to flag account', {error, profile: profile.id})
      Toast.show(_(msg`Failed to flag account`), 'xmark')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setCustomWarning('')
    control.close()
  }

  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={_(msg`Flag Account for Review`)}
        style={[a.w_full]}>
        <View style={[a.gap_lg, a.pb_lg]}>
          <View style={[a.gap_sm]}>
            <Text style={[a.text_2xl, a.font_bold, a.leading_tight]}>
              <Trans>Flag Account for Review</Trans>
            </Text>
            <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
              <Trans>
                This account will be flagged for review by Sonet moderation. 
                The user will receive a warning and the flag will automatically expire after 60 days.
              </Trans>
            </Text>
          </View>

          <View style={[a.gap_md]}>
            <Select.Item
              label={_(msg`Reason for flagging`)}
              value={reason}
              onValueChange={setReason}
              items={flagReasons}
              required
            />

            {reason === 'other' && (
              <TextField.Item
                label={_(msg`Custom reason`)}
                value={customWarning}
                onChangeText={setCustomWarning}
                placeholder={_(msg`Describe the reason for flagging this account`)}
                multiline
                numberOfLines={3}
              />
            )}

            <TextField.Item
              label={_(msg`Custom warning message (optional)`)}
              value={customWarning}
              onChangeText={setCustomWarning}
              placeholder={_(msg`Custom warning message for the user (optional)`)}
              multiline
              numberOfLines={3}
              helperText={_(
                msg`If left empty, a standard warning will be sent. This message will appear to come from Sonet moderation.`
              )}
            />
          </View>

          <View style={[a.gap_sm, a.justify_end, a.flex_row]}>
            <Button
              label={_(msg`Cancel`)}
              size="small"
              variant="outline"
              color="secondary"
              onPress={handleClose}
              disabled={isSubmitting}>
              <ButtonText>
                <Trans>Cancel</Trans>
              </ButtonText>
            </Button>
            <Button
              label={_(msg`Flag Account`)}
              size="small"
              variant="solid"
              color="negative"
              onPress={handleSubmit}
              disabled={isSubmitting || !reason}>
              <ButtonText>
                <Trans>Flag Account</Trans>
              </ButtonText>
            </Button>
          </View>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}