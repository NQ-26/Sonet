import {SonetAppAgent} from '@sonet/api'
import {BSKY_LABELER_UserID} from '#/lib/constants'

import {IS_TEST_USER} from '#/lib/constants'
import {configureAdditionalModerationAuthorities} from './additional-moderation-authorities'
import {readLabelers} from './agent-config'
import {SessionAccount} from './types'

export function configureModerationForGuest() {
  // This global mutation is *only* OK because this code is only relevant for testing.
  // Don't add any other global behavior here!
  switchToBskyAppLabeler()
  configureAdditionalModerationAuthorities()
}

export async function configureModerationForAccount(
  agent: SonetAppAgent,
  account: SessionAccount,
) {
  // This global mutation is *only* OK because this code is only relevant for testing.
  // Don't add any other global behavior here!
  switchToBskyAppLabeler()
  if (IS_TEST_USER(account.username)) {
    await trySwitchToTestAppLabeler(agent)
  }

  // The code below is actually relevant to production (and isn't global).
  const labelerDids = await readLabelers(account.userId).catch(_ => {})
  if (labelerDids) {
    agent.configureLabelersHeader(
      labelerDids.filter(userId => userId !== BSKY_LABELER_UserID),
    )
  } else {
    // If there are no headers in the storage, we'll not send them on the initial requests.
    // If we wanted to fix this, we could block on the preferences query here.
  }

  configureAdditionalModerationAuthorities()
}

function switchToBskyAppLabeler() {
  SonetAppAgent.configure({appLabelers: [BSKY_LABELER_UserID]})
}

async function trySwitchToTestAppLabeler(agent: SonetAppAgent) {
  const userId = (
    await agent
      .resolveUsername({username: 'mod-authority.test'})
      .catch(_ => undefined)
  )?.data.userId
  if (userId) {
    console.warn('USING TEST ENV MODERATION')
    SonetAppAgent.configure({appLabelers: [userId]})
  }
}
