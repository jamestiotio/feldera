'use client'

import { authContext, useAuthStore } from '$lib/compositions/auth/useAuth'
import { OpenAPI } from '$lib/services/manager'
import { PipelineManagerQuery } from '$lib/services/pipelineManagerQuery'
import { ReactNode } from 'react'
import { match, P } from 'ts-pattern'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { useQuery } from '@tanstack/react-query'

export const AuthenticationProvider = (props: { children: ReactNode }) => {
  const { data: auth, isLoading } = useQuery(PipelineManagerQuery.getAuthConfig())
  const { auth: authState, setAuth } = useAuthStore()

  if (typeof authState === 'object') {
    OpenAPI.TOKEN = authState.bearer
  }
  if (isLoading) {
    return <></>
  }

  if (auth && typeof authState !== 'object' && authState !== 'Unauthenticated') {
    setAuth('Unauthenticated')
    return <></>
  }
  if (!auth && typeof authState !== 'object' && authState !== 'NoAuth') {
    setAuth('NoAuth')
    return <></>
  }

  return (
    <authContext.Provider value={authState}>
      {' '}
      {match(auth)
        .with(undefined, () => props.children)
        .with({ AwsCognito: P._ }, () => {
          return props.children
        })
        .with({ GoogleIdentity: P.select() }, config => {
          return <GoogleOAuthProvider clientId={config.client_id}>{props.children}</GoogleOAuthProvider>
        })
        .otherwise(() => props.children)}
    </authContext.Provider>
  )
}
