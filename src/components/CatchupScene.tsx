import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Daily activity as a 3D field: weeks run left to right, weekdays front to
 * back, and a bar's height is the number of sessions that day.
 *
 * It is the calendar's own layout lifted off the page. The 2D heat grid can
 * only encode volume as colour, which saturates - a 40-session day and a
 * 12-session day are both "dark". Height does not saturate, so a spike reads as
 * a spike from across the room, and the flat stretches read as flat.
 *
 * Reads the PUBLIC `daily` totals only, so the view works signed out. Nothing
 * from the private archive is in scope here.
 *
 * Loaded through React.lazy from Catchup. three.js is ~650 kB of module before
 * minification, which is more than the rest of this app put together; a static
 * import would put it in the entry chunk and make every reader of a text page
 * download a renderer they never see.
 */
export interface DayBar {
  date: string
  sessions: number
  commands: number
}

const DAY_MS = 86_400_000

export default function CatchupScene({
  data,
  selected,
  onPick,
}: {
  data: DayBar[]
  selected?: string
  onPick?: (date: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  // Held in a ref so pointer handlers see the current values without the whole
  // scene being torn down and rebuilt every time the selection changes.
  const stateRef = useRef({ data, selected, onPick })
  stateRef.current = { data, selected, onPick }

  /** Set by the scene effect; lets a selection change re-colour the bars in
   *  place instead of rebuilding the WebGL context. */
  const relayoutRef = useRef<null | (() => void)>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const bars = [...data]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
      .sort((a, b) => a.date.localeCompare(b.date))
    if (!bars.length) return

    // --- colours come from the design tokens, not from this file ------------
    // getComputedStyle resolves the var() chain, so the scene follows
    // [data-section="catchup"] and any future theme change with it.
    const css = getComputedStyle(host)
    const read = (name: string, fallback: string) =>
      new THREE.Color(css.getPropertyValue(name).trim() || fallback)
    const hue = read('--hue', '#3987e5')
    const ground = read('--ground', '#0b0f16')
    const dim = read('--line-lit', '#2f3a4f')

    // --- renderer -----------------------------------------------------------
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      // Software rendering, a blocked context, an old machine. A dead canvas
      // with no explanation is worse than the 2D view the page already has.
      host.textContent = 'This browser cannot open a 3D context. The calendar view above still works.'
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    host.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(ground.getHex(), 40, 110)

    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 500)
    camera.position.set(0, 26, 42)

    scene.add(new THREE.AmbientLight(0xffffff, 1.7))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(18, 34, 22)
    scene.add(key)

    // --- geometry -----------------------------------------------------------
    // One InstancedMesh for every day of the archive: a year is 365 bars, which
    // as separate meshes would be 365 draw calls a frame for no reason.
    const start = new Date(bars[0].date + 'T00:00:00')
    start.setDate(start.getDate() - start.getDay()) // back to the Sunday
    const weekOf = (iso: string) =>
      Math.floor((new Date(iso + 'T00:00:00').getTime() - start.getTime()) / (7 * DAY_MS))

    const weeks = weekOf(bars[bars.length - 1].date) + 1
    const busiest = Math.max(1, ...bars.map((b) => b.sessions))

    const CELL = 1.25
    const geometry = new THREE.BoxGeometry(0.9, 1, 0.9)
    const material = new THREE.MeshLambertMaterial()
    const mesh = new THREE.InstancedMesh(geometry, material, bars.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const dummy = new THREE.Object3D()
    const colour = new THREE.Color()

    const layout = () => {
      const { selected: sel } = stateRef.current
      bars.forEach((bar, i) => {
        const x = (weekOf(bar.date) - weeks / 2) * CELL
        const z = (new Date(bar.date + 'T00:00:00').getDay() - 3) * CELL
        // A zero-session day still gets a tile, so gaps read as "nothing
        // happened" rather than as missing data.
        const h = 0.08 + (bar.sessions / busiest) * 7

        dummy.position.set(x, h / 2, z)
        dummy.scale.set(1, h, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        const t = bar.sessions / busiest
        colour.copy(dim).lerp(hue, 0.25 + t * 0.75)
        if (bar.date === sel) colour.offsetHSL(0, 0.1, 0.25)
        mesh.setColorAt(i, colour)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    layout()
    scene.add(mesh)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(weeks * CELL + 6, 7 * CELL + 4),
      new THREE.MeshBasicMaterial({ color: ground.getHex(), transparent: true, opacity: 0.55 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    scene.add(floor)

    // --- controls -----------------------------------------------------------
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 12
    controls.maxDistance = 90
    controls.maxPolarAngle = Math.PI / 2.15 // never orbit under the floor
    controls.target.set(0, 2, 0)
    controls.update()

    // Rendered on demand rather than in a permanent requestAnimationFrame loop.
    // Nothing here animates by itself, so a loop would spin the GPU on a static
    // picture - and an idle 3D panel is exactly what prefers-reduced-motion
    // users are asking not to be given.
    let queued = false
    const render = () => {
      queued = false
      renderer.render(scene, camera)
    }
    const invalidate = () => {
      if (!queued) {
        queued = true
        requestAnimationFrame(render)
      }
    }
    controls.addEventListener('change', invalidate)
    render()

    // --- picking ------------------------------------------------------------
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downAt = { x: 0, y: 0 }

    const hit = (e: PointerEvent): number | null => {
      const r = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const found = raycaster.intersectObject(mesh)[0]
      return found?.instanceId ?? null
    }

    const onMove = (e: PointerEvent) => {
      const i = hit(e)
      renderer.domElement.style.cursor = i == null ? 'grab' : 'pointer'
      renderer.domElement.title = i == null ? '' :
        `${bars[i].date} · ${bars[i].sessions} session${bars[i].sessions === 1 ? '' : 's'}` +
        ` · ${bars[i].commands} command${bars[i].commands === 1 ? '' : 's'}`
    }
    // Distinguish a click from the end of a drag: orbiting past a bar should
    // not select it.
    const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY } }
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) return
      const i = hit(e)
      if (i != null) stateRef.current.onPick?.(bars[i].date)
    }

    const el = renderer.domElement
    el.style.cursor = 'grab'
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)

    // --- resize -------------------------------------------------------------
    const resize = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = host
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      invalidate()
    })
    resize.observe(host)

    // Re-colour without rebuilding when the page's selected day changes.
    const recolour = () => { layout(); invalidate() }
    relayoutRef.current = recolour

    // --- teardown -----------------------------------------------------------
    // Every one of these leaks if skipped, and StrictMode runs this effect
    // twice in development, so a partial cleanup shows up as a second canvas.
    return () => {
      relayoutRef.current = null
      resize.disconnect()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      controls.removeEventListener('change', invalidate)
      controls.dispose()
      geometry.dispose()
      material.dispose()
      mesh.dispose()
      floor.geometry.dispose()
      ;(floor.material as THREE.Material).dispose()
      renderer.dispose()
      el.remove()
    }
    // Rebuilt only when the underlying series changes. `selected` is handled by
    // the recolour path below, because tearing down a WebGL context to move a
    // highlight would drop the camera the reader had positioned.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => { relayoutRef.current?.() }, [selected])

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={
        `Three-dimensional chart of daily activity across ${data.length} days. ` +
        `The same figures are listed in the calendar and totals above.`
      }
      style={{ width: '100%', height: 380, borderRadius: 10, overflow: 'hidden' }}
    />
  )
}
