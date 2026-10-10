import { createContext, useContext, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const QueryContext = createContext<string[]>(['default'])

export function QueryScope({ scope, children }: { scope: string; children: ReactNode }) {
  return <QueryContext.Provider value={[scope]}>{children}</QueryContext.Provider>
}

export function useQueryScope(): string[] {
  return useContext(QueryContext)
}

export function useInvalidate() {
  const scopes = useQueryScope()
  const queryClient = useQueryClient()
  return () => {
    scopes.forEach((scope) => queryClient.invalidateQueries({ queryKey: [scope] }))
  }
}

export { useMutation, useQueryClient }