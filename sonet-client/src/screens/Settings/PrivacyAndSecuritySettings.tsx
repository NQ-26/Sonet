import {View, Switch, Platform, Alert} from 'react-native'
import {type SonetNotificationDeclaration} from '@sonet/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'
import {useState, useEffect} from 'react'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useNotificationDeclarationQuery} from '#/state/queries/activity-subscriptions'
import {useAppPasswordsQuery} from '#/state/queries/app-passwords'
import {useSession} from '#/state/session'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import * as Admonition from '#/components/Admonition'
import {BellRinging_Stroke2_Corner0_Rounded as BellRingingIcon} from '#/components/icons/BellRinging'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlashIcon} from '#/components/icons/EyeSlash'
import {Key_Stroke2_Corner2_Rounded as KeyIcon} from '#/components/icons/Key'
import {ShieldCheck_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Lock_Stroke2_Corner0_Rounded as LockIcon} from '#/components/icons/Lock'
import {BubbleInfo_Stroke2_Corner2_Rounded as BubbleInfoIcon} from '#/components/icons/BubbleInfo'
import {Camera_Stroke2_Corner0_Rounded as CameraIcon} from '#/components/icons/Camera'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {Email2FAToggle} from './components/Email2FAToggle'
import {PwiOptOut} from './components/PwiOptOut'
import {PrivateProfileToggle} from './components/PrivateProfileToggle'
import {ItemTextWithSubtitle} from './NotificationSettings/components/ItemTextWithSubtitle'
import screenshotProtection from '#/services/screenshotProtection'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'PrivacyAndSecuritySettings'
>
export function PrivacyAndSecuritySettingsScreen({}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const {data: appPasswords} = useAppPasswordsQuery()
  const {currentAccount} = useSession()
  const {
    data: notificationDeclaration,
    isPending,
    isError,
  } = useNotificationDeclarationQuery()
  
  // Screenshot protection state
  const [screenshotProtectionEnabled, setScreenshotProtectionEnabled] = useState(false)
  const [blockScreenshots, setBlockScreenshots] = useState(true)
  const [blockScreenRecording, setBlockScreenRecording] = useState(true)
  const [showWarning, setShowWarning] = useState(true)

  // Load screenshot protection configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = screenshotProtection.getConfig()
        setScreenshotProtectionEnabled(config.enabled)
        setBlockScreenshots(config.blockScreenshots)
        setBlockScreenRecording(config.blockScreenRecording)
        setShowWarning(config.showWarning)
      } catch (error) {
        console.warn('Failed to load screenshot protection config:', error)
      }
    }
    loadConfig()
  }, [])

  // Screenshot protection handlers
  const usernameScreenshotProtectionToggle = async (value: boolean) => {
    try {
      setScreenshotProtectionEnabled(value)
      await screenshotProtection.updateConfig({ enabled: value })
    } catch (error) {
      console.warn('Failed to update screenshot protection:', error)
      setScreenshotProtectionEnabled(!value) // Revert on error
    }
  }

  const usernameBlockScreenshotsToggle = async (value: boolean) => {
    try {
      setBlockScreenshots(value)
      await screenshotProtection.updateConfig({ blockScreenshots: value })
    } catch (error) {
      console.warn('Failed to update screenshot blocking:', error)
      setBlockScreenshots(!value)
    }
  }

  const usernameBlockScreenRecordingToggle = async (value: boolean) => {
    try {
      setBlockScreenRecording(value)
      await screenshotProtection.updateConfig({ blockScreenRecording: value })
    } catch (error) {
      console.warn('Failed to update screen recording blocking:', error)
      setBlockScreenRecording(!value)
    }
  }

  const usernameShowWarningToggle = async (value: boolean) => {
    try {
      setShowWarning(value)
      await screenshotProtection.updateConfig({ showWarning: value })
    } catch (error) {
      console.warn('Failed to update warning display:', error)
      setShowWarning(!value)
    }
  }

  const showPlatformLimitations = () => {
    const limitations = screenshotProtection.getPlatformLimitations()
    Alert.alert(
      'Platform Limitations',
      limitations.join('\n\n'),
      [{ text: 'OK' }]
    )
  }

  const showRecommendedSettings = () => {
    const recommended = screenshotProtection.getRecommendedSettings()
    Alert.alert(
      'Recommended Settings',
      'For maximum privacy protection, we recommend:\n\n' +
      '• Enable screenshot protection\n' +
      '• Block screenshots\n' +
      '• Block screen recording\n' +
      '• Show warnings',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              await screenshotProtection.updateConfig(recommended)
              // Reload config
              const config = screenshotProtection.getConfig()
              setScreenshotProtectionEnabled(config.enabled)
              setBlockScreenshots(config.blockScreenshots)
              setBlockScreenRecording(config.blockScreenRecording)
              setShowWarning(config.showWarning)
            } catch (error) {
              console.warn('Failed to apply recommended settings:', error)
            }
          },
        },
      ]
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Privacy and Security</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.Item>
            <SettingsList.ItemIcon
              icon={ShieldIcon}
              color={
                currentAccount?.emailAuthFactor
                  ? t.palette.primary_500
                  : undefined
              }
            />
            <SettingsList.ItemText>
              {currentAccount?.emailAuthFactor ? (
                <Trans>Email 2FA enabled</Trans>
              ) : (
                <Trans>Two-factor authentication (2FA)</Trans>
              )}
            </SettingsList.ItemText>
            <Email2FAToggle />
          </SettingsList.Item>
          <SettingsList.LinkItem
            to="/settings/app-passwords"
            label={_(msg`App passwords`)}>
            <SettingsList.ItemIcon icon={KeyIcon} />
            <SettingsList.ItemText>
              <Trans>App passwords</Trans>
            </SettingsList.ItemText>
            {appPasswords && appPasswords.length > 0 && (
              <SettingsList.BadgeText>
                {appPasswords.length}
              </SettingsList.BadgeText>
            )}
          </SettingsList.LinkItem>
          <SettingsList.LinkItem
            label={_(
              msg`Settings for allowing others to be notified of your notes`,
            )}
            to={{screen: 'ActivityPrivacySettings'}}
            contentContainerStyle={[a.align_start]}>
            <SettingsList.ItemIcon icon={BellRingingIcon} />
            <ItemTextWithSubtitle
              titleText={
                <Trans>Allow others to be notified of your notes</Trans>
              }
              subtitleText={
                <NotificationDeclaration
                  data={notificationDeclaration}
                  isError={isError}
                />
              }
              showSkeleton={isPending}
            />
          </SettingsList.LinkItem>
          <SettingsList.Divider />
          <SettingsList.Group>
            <SettingsList.ItemIcon icon={LockIcon} />
            <SettingsList.ItemText>
              <Trans>Private profile</Trans>
            </SettingsList.ItemText>
            <PrivateProfileToggle />
          </SettingsList.Group>
          <SettingsList.Divider />
          <SettingsList.Group>
            <SettingsList.ItemIcon icon={EyeSlashIcon} />
            <SettingsList.ItemText>
              <Trans>Logged-out visibility</Trans>
            </SettingsList.ItemText>
            <PwiOptOut />
          </SettingsList.Group>
          
          {/* Screenshot Protection Section */}
          <SettingsList.Divider />
          <SettingsList.Group>
            <SettingsList.ItemIcon icon={CameraIcon} />
            <SettingsList.ItemText>
              <Trans>Screenshot Protection</Trans>
            </SettingsList.ItemText>
          </SettingsList.Group>
          
          <SettingsList.Item>
            <SettingsList.ItemIcon icon={ShieldIcon} />
            <SettingsList.ItemText>
              <Trans>Enable Screenshot Protection</Trans>
            </SettingsList.ItemText>
            <Switch
              value={screenshotProtectionEnabled}
              onValueChange={usernameScreenshotProtectionToggle}
              trackColor={{ false: t.palette.neutral_200, true: t.palette.primary_500 + '40' }}
              thumbColor={screenshotProtectionEnabled ? t.palette.primary_500 : t.palette.neutral_400}
            />
          </SettingsList.Item>
          
          {screenshotProtectionEnabled && (
            <>
              <SettingsList.Item>
                <SettingsList.ItemIcon icon={LockIcon} />
                <SettingsList.ItemText>
                  <Trans>Block Screenshots</Trans>
                </SettingsList.ItemText>
                <Switch
                  value={blockScreenshots}
                  onValueChange={usernameBlockScreenshotsToggle}
                  trackColor={{ false: t.palette.neutral_200, true: t.palette.primary_500 + '40' }}
                  thumbColor={blockScreenshots ? t.palette.primary_500 : t.palette.neutral_400}
                />
              </SettingsList.Item>
              
              <SettingsList.Item>
                <SettingsList.ItemIcon icon={EyeSlashIcon} />
                <SettingsList.ItemText>
                  <Trans>Block Screen Recording</Trans>
                </SettingsList.ItemText>
                <Switch
                  value={blockScreenRecording}
                  onValueChange={usernameBlockScreenRecordingToggle}
                  trackColor={{ false: t.palette.neutral_200, true: t.palette.primary_500 + '40' }}
                  thumbColor={blockScreenRecording ? t.palette.primary_500 : t.palette.neutral_400}
                />
              </SettingsList.Item>
              
              <SettingsList.Item>
                <SettingsList.ItemIcon icon={ShieldIcon} />
                <SettingsList.ItemText>
                  <Trans>Show Privacy Warnings</Trans>
                </SettingsList.ItemText>
                <Switch
                  value={showWarning}
                  onValueChange={usernameShowWarningToggle}
                  trackColor={{ false: t.palette.neutral_200, true: t.palette.primary_500 + '40' }}
                  thumbColor={showWarning ? t.palette.primary_500 : t.palette.neutral_400}
                />
              </SettingsList.Item>
              
              {/* iOS Limitation Warning */}
              {Platform.OS === 'ios' && (
                <SettingsList.Item>
                  <Admonition.Outer type="warning" style={[a.flex_1]}>
                    <Admonition.Row>
                      <Admonition.Icon />
                      <View style={[a.flex_1, a.gap_sm]}>
                        <Admonition.Text>
                          <Trans>
                            ⚠️ iOS Limitation: Screenshots cannot be completely prevented on iPhone due to underlying system restrictions. This setting provides the maximum protection possible within iOS constraints.
                          </Trans>
                        </Admonition.Text>
                      </View>
                    </Admonition.Row>
                  </Admonition.Outer>
                </SettingsList.Item>
              )}
              
              {/* Action Buttons */}
              <SettingsList.Item>
                <View style={[a.flex_row, a.gap_sm, a.justify_center]}>
                  <SettingsList.PressableItem
                    onPress={showPlatformLimitations}
                    label={_('Platform Limitations')}
                    style={[a.flex_1]}>
                    <SettingsList.ItemIcon icon={BubbleInfoIcon} />
                    <SettingsList.ItemText>
                      <Trans>Platform Limitations</Trans>
                    </SettingsList.ItemText>
                  </SettingsList.PressableItem>
                  
                  <SettingsList.PressableItem
                    onPress={showRecommendedSettings}
                    label={_('Recommended Settings')}
                    style={[a.flex_1]}>
                    <SettingsList.ItemIcon icon={ShieldIcon} />
                    <SettingsList.ItemText>
                      <Trans>Recommended Settings</Trans>
                    </SettingsList.ItemText>
                  </SettingsList.PressableItem>
                </View>
              </SettingsList.Item>
            </>
          )}
          
          <SettingsList.Item>
            <Admonition.Outer type="tip" style={[a.flex_1]}>
              <Admonition.Row>
                <Admonition.Icon />
                <View style={[a.flex_1, a.gap_sm]}>
                  <Admonition.Text>
                    <Trans>
                      Note: Bluesky is an open and public network. This setting
                      only limits the visibility of your content on the Bluesky
                      app and website, and other apps may not respect this
                      setting. Your content may still be shown to logged-out
                      users by other apps and websites.
                    </Trans>
                  </Admonition.Text>
                  <Admonition.Text>
                    <InlineLinkText
                      label={_(
                        msg`Learn more about what is public on Bluesky.`,
                      )}
                      to="https://sonetweb.zendesk.com/hc/en-us/articles/15835264007693-Data-Privacy">
                      <Trans>Learn more about what is public on Bluesky.</Trans>
                    </InlineLinkText>
                  </Admonition.Text>
                </View>
              </Admonition.Row>
            </Admonition.Outer>
          </SettingsList.Item>
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}

function NotificationDeclaration({
  data,
  isError,
}: {
  data?: {
    value: SonetNotificationDeclaration.Record
  }
  isError?: boolean
}) {
  if (isError) {
    return <Trans>Error loading preference</Trans>
  }
  switch (data?.value?.allowSubscriptions) {
    case 'mutuals':
      return <Trans>Only followers who I follow</Trans>
    case 'none':
      return <Trans>No one</Trans>
    case 'followers':
    default:
      return <Trans>Anyone who follows me</Trans>
  }
}
