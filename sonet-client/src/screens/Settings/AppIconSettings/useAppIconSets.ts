import {useMemo} from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {type AppIconSet} from '#/screens/Settings/AppIconSettings/types'

export function useAppIconSets() {
  const {_} = useLingui()

  return useMemo(() => {
    const defaults = [
      {
        id: 'default_light',
        name: _(msg({context: 'Name of app icon variant', message: 'Light'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_default_light.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_default_light.png`,
          )
        },
      },
      {
        id: 'default_dark',
        name: _(msg({context: 'Name of app icon variant', message: 'Dark'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_default_dark.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_default_dark.png`,
          )
        },
      },
    ] satisfies AppIconSet[]

    /**
     * Sonet+
     */
    const core = [
      {
        id: 'core_blue_classic',
        name: _(msg({context: 'Name of app icon variant', message: 'Blue Classic'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_blue_classic.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_blue_classic.png`,
          )
        },
      },
      {
        id: 'core_lavender',
        name: _(msg({context: 'Name of app icon variant', message: 'Lavender'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_lavender.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_lavender.png`,
          )
        },
      },
      {
        id: 'core_violet_vibes',
        name: _(msg({context: 'Name of app icon variant', message: 'Violet Vibes'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_violet_vibes.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_violet_vibes.png`,
          )
        },
      },
      {
        id: 'core_shadow_jay',
        name: _(msg({context: 'Name of app icon variant', message: 'Shadow Jay'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_shadow_jay.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_shadow_jay.png`,
          )
        },
      },
      {
        id: 'core_golden_hour',
        name: _(msg({context: 'Name of app icon variant', message: 'Golden Hour'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_golden_hour.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_golden_hour.png`,
          )
        },
      },
      {
        id: 'core_bubblegum',
        name: _(msg({context: 'Name of app icon variant', message: 'Bubblegum'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_bubblegum.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_bubblegum.png`,
          )
        },
      },
      {
        id: 'core_storm_gray',
        name: _(msg({context: 'Name of app icon variant', message: 'Storm Gray'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_storm_gray.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_storm_gray.png`,
          )
        },
      },
      {
        id: 'core_ocean_depth',
        name: _(msg({context: 'Name of app icon variant', message: 'Ocean Depth'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_ocean_depth.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_ocean_depth.png`,
          )
        },
      },
      {
        id: 'core_emerald_wings',
        name: _(msg({context: 'Name of app icon variant', message: 'Emerald Wings'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_emerald_wings.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_emerald_wings.png`,
          )
        },
      },
      {
        id: 'core_arctic_jay',
        name: _(msg({context: 'Name of app icon variant', message: 'Arctic Jay'})),
        iosImage: () => {
          return require(
            `../../../../assets/app-icons/ios_icon_core_arctic_jay.png`,
          )
        },
        androidImage: () => {
          return require(
            `../../../../assets/app-icons/android_icon_core_arctic_jay.png`,
          )
        },
      },
    ] satisfies AppIconSet[]

    return {
      defaults,
      core,
    }
  }, [_])
}
