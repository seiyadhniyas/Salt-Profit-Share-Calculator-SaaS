// @vitest-environment jsdom

import React, { act } from 'react'
import { describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import AccordionCard from './AccordionCard'

describe('AccordionCard', () => {
  it('opens when the defaultOpen prop changes after the component is mounted', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <AccordionCard title="Test" defaultOpen={false}>
          <div>Body content</div>
        </AccordionCard>
      )
    })

    expect(container.textContent).not.toContain('Body content')

    act(() => {
      root.render(
        <AccordionCard title="Test" defaultOpen={true}>
          <div>Body content</div>
        </AccordionCard>
      )
    })

    expect(container.textContent).toContain('Body content')
    root.unmount()
    container.remove()
  })
})
