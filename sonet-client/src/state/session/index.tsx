import React from 'react'
import {type SonetSessionEvent, type SonetAppAgent} from './sonet-agent'

import {isWeb} from '#/platform/detection'
import * as persisted from '#/state/persisted'
import {useCloseAllActiveElements} from '#/state/util'
import {useGlobalDialogsControlContext} from '#/components/dialogs/Context'
import {emitSessionDropped} from '../events'
import {
  sonetAgentToSessionAccount,
  createSonetAgentAndCreateAccount,
  createSonetAgentAndLogin,
  createSonetAgentAndResume,
  sessionAccountToSonetSession,
} from './sonet-agent'
import {getInitialState, reducer} from './reducer'
import {__setSonetUploadBridge} from '#/lib/api/upload-blob'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'

export {isSignupQueued} from './util'
import {addSessionDebugLog} from './logging'
export type {SessionAccount} from '#/state/session/types'
import {logger} from '#/logger'
import {
  type SessionApiContext,
  type SessionStateContext,
} from '#/state/session/types'

const StateContext = React.createContext<SessionStateContext>({
  accounts: [],
  currentAccount: undefined,
  hasSession: false,
})

const AgentContext = React.createContext<SonetAppAgent | null>(null)

const ApiContext = React.createContext<SessionApiContext>({
  createAccount: async () => {},
  login: async () => {},
  logoutCurrentAccount: async () => {},
  logoutEveryAccount: async () => {},
  resumeSession: async () => {},
  removeAccount: () => {},
  partialRefreshSession: async () => {},
})

export function Provider({children}: React.PropsWithChildren<{}>) {
  const cancelPendingTask = useOneTaskAtATime()
  const [state, dispatch] = React.useReducer(reducer, null, () => {
    const initialState = getInitialState(persisted.get('session').accounts)
    addSessionDebugLog({type: 'reducer:init', state: initialState})
    return initialState
  })

  const onAgentSessionChange = React.useCallback(
    (agent: SonetAppAgent, accountUserId: string, sessionEvent: SonetSessionEvent) => {
      const refreshedAccount = sonetAgentToSessionAccount(agent) // Mutable, so snapshot it right away.
      if (sessionEvent.type === 'expired' || sessionEvent.type === 'create-failed') {
        emitSessionDropped()
      }
      dispatch({
        type: 'received-agent-event',
        agent,
        refreshedAccount,
        accountDid: accountUserId,
        sessionEvent,
      })
    },
    [],
  )

  const createAccount = React.useCallback<SessionApiContext['createAccount']>(
    async (params, metrics) => {
      addSessionDebugLog({type: 'method:start', method: 'createAccount'})
      const signal = cancelPendingTask()
      logger.metric('account:create:begin', {}, {statsig: true})
      const {agent, account} = await createSonetAgentAndCreateAccount(
        params,
        onAgentSessionChange,
      )

      if (signal.aborted) {
        return
      }
      dispatch({
        type: 'switched-to-account',
        newAgent: agent,
        newAccount: account,
      })
      logger.metric('account:create:success', metrics, {statsig: true})
      addSessionDebugLog({type: 'method:end', method: 'createAccount', account})
    },
    [onAgentSessionChange, cancelPendingTask],
  )

  const login = React.useCallback<SessionApiContext['login']>(
    async (params, logContext) => {
      addSessionDebugLog({type: 'method:start', method: 'login'})
      const signal = cancelPendingTask()
      const {agent, account} = await createSonetAgentAndLogin(
        params,
        onAgentSessionChange,
      )

      if (signal.aborted) {
        return
      }
      dispatch({
        type: 'switched-to-account',
        newAgent: agent,
        newAccount: account,
      })
      logger.metric(
        'account:loggedIn',
        {logContext, withPassword: true},
        {statsig: true},
      )
      addSessionDebugLog({type: 'method:end', method: 'login', account})
    },
    [onAgentSessionChange, cancelPendingTask],
  )

  const logoutCurrentAccount = React.useCallback<
    SessionApiContext['logoutCurrentAccount']
  >(
    logContext => {
      addSessionDebugLog({type: 'method:start', method: 'logout'})
      cancelPendingTask()
      dispatch({
        type: 'logged-out-current-account',
      })
      logger.metric(
        'account:loggedOut',
        {logContext, scope: 'current'},
        {statsig: true},
      )
      addSessionDebugLog({type: 'method:end', method: 'logout'})
    },
    [cancelPendingTask],
  )

  const logoutEveryAccount = React.useCallback<
    SessionApiContext['logoutEveryAccount']
  >(
    logContext => {
      addSessionDebugLog({type: 'method:start', method: 'logout'})
      cancelPendingTask()
      dispatch({
        type: 'logged-out-every-account',
      })
      logger.metric(
        'account:loggedOut',
        {logContext, scope: 'every'},
        {statsig: true},
      )
      addSessionDebugLog({type: 'method:end', method: 'logout'})
    },
    [cancelPendingTask],
  )

  const resumeSession = React.useCallback<SessionApiContext['resumeSession']>(
    async storedAccount => {
      addSessionDebugLog({
        type: 'method:start',
        method: 'resumeSession',
        account: storedAccount,
      })
      const signal = cancelPendingTask()
      const {agent, account} = await createSonetAgentAndResume(
        storedAccount,
        onAgentSessionChange,
      )

      if (signal.aborted) {
        return
      }
      dispatch({
        type: 'switched-to-account',
        newAgent: agent,
        newAccount: account,
      })
      addSessionDebugLog({type: 'method:end', method: 'resumeSession', account})
    },
    [onAgentSessionChange, cancelPendingTask],
  )

  const partialRefreshSession = React.useCallback<
    SessionApiContext['partialRefreshSession']
  >(async () => {
    const agent = state.currentAgentState.agent as SonetAppAgent
    const signal = cancelPendingTask()
    if (!agent.session) return
    
    try {
      const user = await agent.api.getUser(agent.session.user.username)
      if (signal.aborted) return
      dispatch({
        type: 'partial-refresh-session',
        accountDid: agent.session.user.id,
        patch: {
          emailConfirmed: true, // Sonet assumes email is confirmed
          emailAuthFactor: false, // Not used in Sonet
        },
      })
    } catch (error) {
      logger.error('Failed to refresh session', error)
    }
  }, [state, cancelPendingTask])

  const removeAccount = React.useCallback<SessionApiContext['removeAccount']>(
    account => {
      addSessionDebugLog({
        type: 'method:start',
        method: 'removeAccount',
        account,
      })
      cancelPendingTask()
      dispatch({
        type: 'removed-account',
        accountDid: account.userId,
      })
      addSessionDebugLog({type: 'method:end', method: 'removeAccount', account})
    },
    [cancelPendingTask],
  )

  React.useEffect(() => {
    if (state.needsPersist) {
      state.needsPersist = false
      const persistedData = {
        accounts: state.accounts,
        currentAccount: state.accounts.find(
          a => a.userId === state.currentAgentState.userId,
        ),
      }
      addSessionDebugLog({type: 'persisted:broadcast', data: persistedData})
      persisted.write('session', persistedData)
    }
  }, [state])

  React.useEffect(() => {
    return persisted.onUpdate('session', nextSession => {
      const synced = nextSession
      addSessionDebugLog({type: 'persisted:receive', data: synced})
      dispatch({
        type: 'synced-accounts',
        syncedAccounts: synced.accounts,
        syncedCurrentDid: synced.currentAccount?.userId,
      })
      const syncedAccount = synced.accounts.find(
        a => a.userId === synced.currentAccount?.userId,
      )
      if (syncedAccount && syncedAccount.refreshJwt) {
        if (syncedAccount.userId !== state.currentAgentState.userId) {
          resumeSession(syncedAccount)
        } else {
          const agent = state.currentAgentState.agent as SonetAppAgent
          const prevSession = agent.session
          agent.sessionManager.setSession(sessionAccountToSonetSession(syncedAccount))
          addSessionDebugLog({
            type: 'agent:patch',
            agent,
            prevSession,
            nextSession: agent.session,
          })
        }
      }
    })
  }, [state, resumeSession])

  const stateContext = React.useMemo(
    () => ({
      accounts: state.accounts,
      currentAccount: state.accounts.find(
        a => a.userId === state.currentAgentState.userId,
      ),
      hasSession: !!state.currentAgentState.userId,
    }),
    [state],
  )

  // Install Sonet upload bridge if Sonet session is present
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  React.useEffect(() => {
    if (sonetSession.hasSession) {
      __setSonetUploadBridge(async (file, filename, mime) => {
        const {media} = await sonet.getApi().uploadMedia(file, filename, mime)
        return {media}
      })
      // Expose minimal global helpers for composer until full migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).__SONET_ACTIVE = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).__SONET_CREATE_NOTE = async ({text}: {text: string}) => {
        return sonet.getApi().createNote({text})
      }
    } else {
      __setSonetUploadBridge(null as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).__SONET_ACTIVE = false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).__SONET_CREATE_NOTE = undefined
    }
  }, [sonet, sonetSession.hasSession])

  const api = React.useMemo(
    () => ({
      createAccount,
      login,
      logoutCurrentAccount,
      logoutEveryAccount,
      resumeSession,
      removeAccount,
      partialRefreshSession,
    }),
    [
      createAccount,
      login,
      logoutCurrentAccount,
      logoutEveryAccount,
      resumeSession,
      removeAccount,
      partialRefreshSession,
    ],
  )

  // @ts-expect-error window type is not declared, debug only
  if (__DEV__ && isWeb) window.agent = state.currentAgentState.agent

  const agent = state.currentAgentState.agent as BskyAppAgent
  const currentAgentRef = React.useRef(agent)
  React.useEffect(() => {
    if (currentAgentRef.current !== agent) {
      // Read the previous value and immediately advance the pointer.
      const prevAgent = currentAgentRef.current
      currentAgentRef.current = agent
      addSessionDebugLog({type: 'agent:switch', prevAgent, nextAgent: agent})
      // We never reuse agents so let's fully neutralize the previous one.
      // This ensures it won't try to consume any refresh tokens.
      prevAgent.dispose()
    }
  }, [agent])

  return (
    <AgentContext.Provider value={agent}>
      <StateContext.Provider value={stateContext}>
        <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
      </StateContext.Provider>
    </AgentContext.Provider>
  )
}

function useOneTaskAtATime() {
  const abortController = React.useRef<AbortController | null>(null)
  const cancelPendingTask = React.useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    abortController.current = new AbortController()
    return abortController.current.signal
  }, [])
  return cancelPendingTask
}

export function useSession() {
  return React.useContext(StateContext)
}

export function useSessionApi() {
  return React.useContext(ApiContext)
}

export function useRequireAuth() {
  const {hasSession} = useSession()
  const closeAll = useCloseAllActiveElements()
  const {signinDialogControl} = useGlobalDialogsControlContext()

  return React.useCallback(
    (fn: () => void) => {
      if (hasSession) {
        fn()
      } else {
        closeAll()
        signinDialogControl.open()
      }
    },
    [hasSession, signinDialogControl, closeAll],
  )
}

export function useAgent(): SonetAppAgent {
  const agent = React.useContext(AgentContext)
  if (!agent) {
    throw Error('useAgent() must be below <SessionProvider>.')
  }
  return agent
}
