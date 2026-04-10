import React from 'react'

export default function AccessibleButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
        (props.className || '')
      }
      tabIndex={0}
      aria-pressed={props['aria-pressed']}
    >
      {children}
    </button>
  )
}
