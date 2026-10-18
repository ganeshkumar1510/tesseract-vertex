'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

const ModeContext = createContext({
  mode: 'quasar',
  isAether: false,
  toggle: () => {},
  setMode: () => {},
})

/** Reads the persisted mode synchronously so the first paint already has it. */
function readStoredMode() {
  if (typeof window === 'undefined') return 'quasar'
  const saved = localStorage.getItem('vertex-mode')
  return saved === 'aether' || saved === 'quasar' ? saved : 'quasar'
}

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('aether', mode === 'aether')
    root.classList.toggle('quasar', mode === 'quasar')
    localStorage.setItem('vertex-mode', mode)
  }, [mode])

  const toggle = () => setModeState(m => (m === 'aether' ? 'quasar' : 'aether'))
  const setMode = (m) => setModeState(m)

  return (
    <ModeContext.Provider value={{ mode, isAether: mode === 'aether', toggle, setMode }}>
      {children}
    </ModeContext.Provider>
  )
}

export const useMode = () => useContext(ModeContext)
