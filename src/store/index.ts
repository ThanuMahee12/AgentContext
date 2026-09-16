import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

import contentReducer from './contentSlice'
import ui from './uiSlice'

export const store = configureStore({ reducer: { ui, content: contentReducer } })

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
