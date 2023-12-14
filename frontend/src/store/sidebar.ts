import { create } from 'zustand'

type State = {
  isSidebarOpen: boolean
}

type Action = {
  toggleSidebar: () => void
}

export const useSidebar = create<State & Action>()((set, get) => ({
  isSidebarOpen: false,
  toggleSidebar: () => {
    const { isSidebarOpen } = get()

    set({ isSidebarOpen: !isSidebarOpen })
  },
}))
