import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { readTheme } from '../lib/theme'

/**
 * The backdrop on the sign-in page: agents at work, in the shape the archive
 * actually records.
 *
 * Not a particle field. This is the one relationship the data model is built
 * around - a session spawns subagents, which is why `is_sidechain` and
 * `parent_session_id` exist and why a row can say it spawned eleven agents.
 * So the roots sit still and periodically emit children that travel outward on
 * a tether and fade. Anyone who has watched a run knows the shape.
 *
 * Constraints this is built to, because it sits behind a form:
 *   - it must never compete with the panel. Low opacity, no motion near the
 *     centre, and a CSS vignette darkens the middle where the form sits.
 *   - prefers-reduced-motion gets ONE static frame, not a slower animation.
 *   - it stops when the tab is hidden. A login page left open in a background
 *     tab must not hold a GPU at 60fps.
 *   - it is decorative. aria-hidden, and the page reads identically without it.
 */

/* The dials. Tuned deliberately quiet: this sits behind a form, and anything
 * that pulls the eye off the password field is a bug, not a flourish. Roughly
 * three children are alive at any moment (CHILD_LIFE / SPAWN_EVERY), each one
 * crossing its arc over five seconds. */
const ROOTS = 11
const CHILDREN = 64 // pool, reused - nothing is allocated per spawn
const SPAWN_EVERY = 1.4 // seconds between spawns
const CHILD_LIFE = 5.0 // seconds from spawn to gone
const FIELD = 15

export default function AgentField() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Optional-called: matchMedia is missing in some embedded and test hosts,
    // and a decorative backdrop must not be the thing that throws.
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true

    const theme = readTheme(host, ['--hue', '--line-lit'])
    const hue = new THREE.Color(theme['--hue'])
    const idle = new THREE.Color(theme['--line-lit'])

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // no context: the page is complete without this
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' })
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 200)
    camera.position.set(0, 0, 26)

    // --- roots: the sessions ------------------------------------------------
    // Pushed out of the middle on purpose - the form sits there.
    const roots: THREE.Vector3[] = []
    for (let i = 0; i < ROOTS; i++) {
      const a = (i / ROOTS) * Math.PI * 2 + Math.random() * 0.4
      const r = FIELD * (0.55 + Math.random() * 0.45)
      roots.push(
        new THREE.Vector3(Math.cos(a) * r * 1.5, Math.sin(a) * r, (Math.random() - 0.5) * 10),
      )
    }

    const rootGeo = new THREE.BufferGeometry().setFromPoints(roots)
    const rootPts = new THREE.Points(
      rootGeo,
      new THREE.PointsMaterial({
        color: idle,
        size: 0.46,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
      }),
    )
    scene.add(rootPts)

    // --- children: the subagents -------------------------------------------
    // One pool, one draw call each for the points and the tethers. A scene
    // graph node per spawn would churn the GPU for no visible gain.
    const cPos = new Float32Array(CHILDREN * 3)
    const cAlpha = new Float32Array(CHILDREN)
    const from = new Float32Array(CHILDREN * 3)
    const to = new Float32Array(CHILDREN * 3)
    const born = new Float32Array(CHILDREN).fill(-Infinity)

    const childGeo = new THREE.BufferGeometry()
    childGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3))
    childGeo.setAttribute('alpha', new THREE.BufferAttribute(cAlpha, 1))
    const childPts = new THREE.Points(
      childGeo,
      new THREE.PointsMaterial({
        color: hue,
        size: 0.3,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
      }),
    )
    scene.add(childPts)

    // Tethers: parent -> child, one segment per pooled child.
    const linePos = new Float32Array(CHILDREN * 6)
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: 0.14 }),
    )
    scene.add(lines)

    let cursor = 0
    const spawn = (t: number) => {
      const parent = roots[(Math.random() * roots.length) | 0]
      const i = cursor
      cursor = (cursor + 1) % CHILDREN
      const a = Math.random() * Math.PI * 2
      const reach = 2.4 + Math.random() * 3.6
      from[i * 3] = parent.x
      from[i * 3 + 1] = parent.y
      from[i * 3 + 2] = parent.z
      to[i * 3] = parent.x + Math.cos(a) * reach
      to[i * 3 + 1] = parent.y + Math.sin(a) * reach
      to[i * 3 + 2] = parent.z + (Math.random() - 0.5) * 3
      born[i] = t
    }

    const step = (t: number) => {
      for (let i = 0; i < CHILDREN; i++) {
        const age = t - born[i]
        if (age < 0 || age > CHILD_LIFE) {
          cAlpha[i] = 0
          linePos.fill(0, i * 6, i * 6 + 6)
          continue
        }
        const k = age / CHILD_LIFE
        // Quadratic, not cubic. The cubic version launched each child hard
        // enough to catch the eye away from the form; this crosses the same
        // arc without the snap at the start.
        const ease = 1 - Math.pow(1 - k, 2)
        const x = from[i * 3] + (to[i * 3] - from[i * 3]) * ease
        const y = from[i * 3 + 1] + (to[i * 3 + 1] - from[i * 3 + 1]) * ease
        const z = from[i * 3 + 2] + (to[i * 3 + 2] - from[i * 3 + 2]) * ease
        cPos[i * 3] = x
        cPos[i * 3 + 1] = y
        cPos[i * 3 + 2] = z
        cAlpha[i] = Math.sin(k * Math.PI)
        linePos[i * 6] = from[i * 3]
        linePos[i * 6 + 1] = from[i * 3 + 1]
        linePos[i * 6 + 2] = from[i * 3 + 2]
        linePos[i * 6 + 3] = x
        linePos[i * 6 + 4] = y
        linePos[i * 6 + 5] = z
      }
      childGeo.attributes.position.needsUpdate = true
      lineGeo.attributes.position.needsUpdate = true
    }

    // --- loop ---------------------------------------------------------------
    let frame = 0
    let last = 0
    let nextSpawn = 0
    let clock = 0

    const draw = (ms: number) => {
      frame = requestAnimationFrame(draw)
      const now = ms / 1000
      const dt = Math.min(last ? now - last : 0, 0.05) // a backgrounded tab must not jump
      last = now
      clock += dt
      if (clock >= nextSpawn) {
        spawn(clock)
        nextSpawn = clock + SPAWN_EVERY * (0.6 + Math.random())
      }
      step(clock)
      // Half the amplitude and two-thirds the rate of the first pass: enough
      // parallax that the field is not flat, not enough to register as motion.
      scene.rotation.y = Math.sin(clock * 0.025) * 0.07
      renderer.render(scene, camera)
    }

    const start = () => {
      if (!frame && !still) {
        last = 0
        frame = requestAnimationFrame(draw)
      }
    }
    const stop = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    if (still) {
      // One frame, seeded so it is a populated field rather than an empty one.
      for (let i = 0; i < 14; i++) spawn(-CHILD_LIFE * (0.15 + Math.random() * 0.6))
      step(0)
      renderer.render(scene, camera)
    } else {
      document.addEventListener('visibilitychange', onVisibility)
      start()
    }

    const resize = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = host
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      if (still) renderer.render(scene, camera)
    })
    resize.observe(host)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      resize.disconnect()
      rootGeo.dispose()
      childGeo.dispose()
      lineGeo.dispose()
      ;(rootPts.material as THREE.Material).dispose()
      ;(childPts.material as THREE.Material).dispose()
      ;(lines.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    // Absolute inside the brand column, not fixed to the viewport: the split is
    // what made the backdrop workable - it is beside the form now instead of
    // underneath it, so it needs no mask and cannot reduce a label's contrast.
    // pointer-events-none so it never eats a click meant for the form.
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 [&>canvas]:opacity-[0.42] motion-reduce:[&>canvas]:opacity-30"
    />
  )
}
