import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const container = document.getElementById('root')
const root = createRoot(container)
console.log('index: bootstrapping app, root element:', !!container)
root.render(<App />)
