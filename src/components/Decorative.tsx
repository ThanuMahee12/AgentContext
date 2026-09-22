import { Component, type ReactNode } from 'react'

/**
 * Renders nothing if its child throws.
 *
 * For decoration only. React unmounts the whole tree on an uncaught render
 * error, so without a boundary a WebGL context failure, a missing browser API
 * or a chunk that will not load takes the page down with it. Anything wrapped
 * here costs the reader a flourish instead.
 *
 * Deliberately silent: it has no fallback UI, because a message explaining
 * that an ornament failed is worth less than the space it occupies.
 */
export default class Decorative extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
