'use client'

import { useEffect, useRef } from 'react'
// Type-only import: erased at build time, so `three` itself is still loaded
// dynamically at runtime and never enters the server bundle.
import type { Mesh, BufferAttribute, MeshStandardMaterial } from 'three'

/**
 * The KinderQuill night scene.
 *
 * A real 3D open book floating over the dusk: two cream pages catching a warm
 * lamp light from below, four pages turning slowly, and motes of light drifting
 * up past it against a starfield. It leans toward the pointer, or toward the
 * phone if the device reports its tilt.
 *
 * Rules this component obeys, because a decorative canvas must never cost the
 * reader anything:
 *   - one canvas, one render loop, no React state touched inside the loop
 *   - pixel ratio capped, so a 3x phone does not render 9x the pixels
 *   - the loop stops when the canvas scrolls off screen or the tab is hidden
 *   - if the device asks for reduced motion, it draws a single still frame
 *   - everything is disposed on unmount
 *   - `three` is imported dynamically, so it stays out of the server bundle
 */
export default function NightLightBookScene({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let teardown = () => {}

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    ;(async () => {
      const THREE = await import('three')
      const host = hostRef.current
      if (!host || disposed) return
      const hostEl: HTMLDivElement = host

      // ── Renderer ────────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
      renderer.setClearColor(0x000000, 0)
      hostEl.appendChild(renderer.domElement)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
      camera.position.set(0, 0.35, 7.2)

      // ── Light: one warm lamp below, a dim night around it ───────────────
      scene.add(new THREE.AmbientLight(0x5B5496, 1.15))
      const lamp = new THREE.PointLight(0xE0A046, 26, 14, 2)
      lamp.position.set(0, -1.5, 2.3)
      scene.add(lamp)
      const rim = new THREE.DirectionalLight(0x8FA6D8, 0.5)
      rim.position.set(-2.5, 3, -2)
      scene.add(rim)

      // ── The book ────────────────────────────────────────────────────────
      const book = new THREE.Group()
      book.rotation.x = -0.28
      book.scale.setScalar(0.74)
      book.position.y = -0.34
      scene.add(book)

      const pageGeo = new THREE.PlaneGeometry(1.98, 2.72)
      const pageMat = new THREE.MeshStandardMaterial({
        color: 0xf6e7c9,
        roughness: 0.88,
        metalness: 0,
        emissive: 0xb8792c,
        emissiveIntensity: 0.16,
        side: THREE.DoubleSide,
      })

      const leftPage = new THREE.Mesh(pageGeo, pageMat)
      leftPage.rotation.y = 0.19
      leftPage.position.set(-0.96, 0, 0)
      book.add(leftPage)

      const rightPage = new THREE.Mesh(pageGeo, pageMat)
      rightPage.rotation.y = -0.19
      rightPage.position.set(0.96, 0, 0)
      book.add(rightPage)

      // Painted spreads, so the book reads as a book with a story in it
      // rather than an empty rectangle. A cream margin is left around each
      // painting by making the art plane smaller than the page it sits on.
      const texLoader = new THREE.TextureLoader()
      const artGeo = new THREE.PlaneGeometry(1.72, 2.32)
      const artMats: MeshStandardMaterial[] = []
      const artSides = [
        { x: -0.96, ry: 0.19, file: '/art/page-1.png' },
        { x: 0.96, ry: -0.19, file: '/art/page-2.png' },
      ]
      for (const side of artSides) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.92,
          metalness: 0,
          emissive: 0x2a1e12,
          emissiveIntensity: 0.3,
          // Double sided: a page must never vanish because the model was
          // rotated a fraction the wrong way.
          side: THREE.DoubleSide,
        })
        texLoader.load(side.file, tex => {
          tex.colorSpace = THREE.SRGBColorSpace
          mat.map = tex
          mat.needsUpdate = true
        })
        artMats.push(mat)
        const spread = new THREE.Mesh(artGeo, mat)
        spread.rotation.y = side.ry
        spread.position.set(side.x, 0, 0.009)
        book.add(spread)
      }

      // The plum cover, just behind the open pages.
      const coverGeo = new THREE.PlaneGeometry(4.0, 2.86)
      const coverMat = new THREE.MeshStandardMaterial({
        color: 0x3a2340,
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
      })
      const cover = new THREE.Mesh(coverGeo, coverMat)
      cover.position.set(0, -0.06, -0.09)
      book.add(cover)

      // ── Turning pages ───────────────────────────────────────────────────
      // A turning page rotates about the SPINE, not about its own centre.
      // Rotating about its own centre made it sweep a circle centred on the
      // left page, so it spent half of every cycle parked on top of that
      // painting and made the page look blank and unfinished.
      const flipGeo = new THREE.PlaneGeometry(1.9, 2.66).translate(0.95, 0, 0)
      const FLIP_COUNT = 3
      const FLIP_CYCLE = 6.2
      const FLIP_DURATION = 1.15
      const flipping: Mesh[] = []
      for (let i = 0; i < FLIP_COUNT; i++) {
        const p = new THREE.Mesh(flipGeo, pageMat)
        p.position.set(0, 0, 0.014 + i * 0.006)
        p.rotation.y = 0
        // Staggered so at most one page is in the air at a time, and each
        // page rests for most of the cycle.
        p.userData.delay = (i * FLIP_CYCLE) / FLIP_COUNT
        book.add(p)
        flipping.push(p)
      }

      // A soft amber bloom behind the book. Without it the book reads as a
      // decal dropped on a starfield; with it the two share one light.
      const glowCanvas = document.createElement('canvas')
      glowCanvas.width = glowCanvas.height = 256
      const gctx = glowCanvas.getContext('2d')!
      const grad = gctx.createRadialGradient(128, 128, 4, 128, 128, 128)
      grad.addColorStop(0, 'rgba(224,160,70,0.55)')
      grad.addColorStop(0.45, 'rgba(224,160,70,0.16)')
      grad.addColorStop(1, 'rgba(224,160,70,0)')
      gctx.fillStyle = grad
      gctx.fillRect(0, 0, 256, 256)
      const glowTex = new THREE.CanvasTexture(glowCanvas)
      glowTex.colorSpace = THREE.SRGBColorSpace
      const glowGeo = new THREE.PlaneGeometry(7.2, 6.2)
      const glowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.position.set(0, -0.34, -0.55)
      book.add(glow)

      // ── Motes of light rising out of the book ───────────────────────────
      const MOTE_COUNT = 130
      const motePos = new Float32Array(MOTE_COUNT * 3)
      const moteSpeed = new Float32Array(MOTE_COUNT)
      let moteHalf = 2.4
      for (let i = 0; i < MOTE_COUNT; i++) {
        motePos[i * 3] = (Math.random() - 0.5) * 5.4
        motePos[i * 3 + 1] = (Math.random() - 0.5) * 2 * moteHalf
        motePos[i * 3 + 2] = (Math.random() - 0.5) * 1.6
        moteSpeed[i] = 0.0016 + Math.random() * 0.0034
      }
      const moteGeo = new THREE.BufferGeometry()
      moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3))
      const moteMat = new THREE.PointsMaterial({
        color: 0xe0a046,
        size: 0.055,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
        depthWrite: false,
      })
      const motes = new THREE.Points(moteGeo, moteMat)
      scene.add(motes)

      // ── Starfield, far behind ───────────────────────────────────────────
      const STAR_COUNT = 420
      const starPos = new Float32Array(STAR_COUNT * 3)
      for (let i = 0; i < STAR_COUNT; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 26
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 16
        starPos[i * 3 + 2] = -6 - Math.random() * 9
      }
      const starGeo = new THREE.BufferGeometry()
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
      const starMat = new THREE.PointsMaterial({
        color: 0xf4f2ec,
        size: 0.03,
        transparent: true,
        opacity: 0.62,
        sizeAttenuation: true,
        depthWrite: false,
      })
      const stars = new THREE.Points(starGeo, starMat)
      scene.add(stars)

      // ── Sizing ──────────────────────────────────────────────────────────
      function resize() {
        const w = hostEl.clientWidth || 1
        const h = hostEl.clientHeight || 1
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()

        // Pull the camera back until the open spread spans about 88 per cent
        // of the width. This is what stops a wide book from swallowing a tall
        // phone screen and reading as an abstract corridor.
        const tan = Math.tan((camera.fov * Math.PI) / 180 / 2)
        const spreadHalf = 2.35
        const dist = spreadHalf / (tan * camera.aspect * 0.88)
        camera.position.z = Math.max(4.6, Math.min(dist, 26))
        camera.position.y = 0.1
        camera.lookAt(0, 0, 0)

        // Motes and stars follow the taller of the two dimensions so the
        // composition fills the frame in portrait as well as landscape.
        moteHalf = Math.max(2.4, camera.position.z * tan * 1.15)
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(hostEl)

      // ── Lean toward the pointer, or the phone ───────────────────────────
      let targetX = 0
      let targetY = 0
      let curX = 0
      let curY = 0

      function onPointer(e: PointerEvent) {
        targetY = (e.clientX / window.innerWidth - 0.5) * 0.5
        targetX = (e.clientY / window.innerHeight - 0.5) * 0.32
      }
      function onTilt(e: DeviceOrientationEvent) {
        if (e.gamma == null || e.beta == null) return
        targetY = Math.max(-0.3, Math.min(0.3, (e.gamma / 90) * 0.4))
        targetX = Math.max(-0.2, Math.min(0.2, ((e.beta - 45) / 90) * 0.3))
      }
      window.addEventListener('pointermove', onPointer, { passive: true })
      window.addEventListener('deviceorientation', onTilt, { passive: true })

      // ── Pause when unseen ───────────────────────────────────────────────
      let onScreen = true
      const io = new IntersectionObserver(
        entries => { onScreen = entries[0]?.isIntersecting ?? true },
        { threshold: 0.02 }
      )
      io.observe(hostEl)

      let tabVisible = !document.hidden
      const onVis = () => { tabVisible = !document.hidden }
      document.addEventListener('visibilitychange', onVis)

      // ── Draw ────────────────────────────────────────────────────────────
      const clock = new THREE.Clock()

      function draw(elapsed: number) {
        const t = elapsed

        // pages turn in sequence, then reset
        for (const p of flipping) {
          const local = (t + (p.userData.delay as number)) % FLIP_CYCLE
          const k = Math.min(1, local / FLIP_DURATION)
          const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
          // Lifts off the right page and lands on the left, then slips into
          // the stack instead of sitting on the painting.
          p.rotation.y = -eased * Math.PI
          p.visible = k > 0.04 && k < 0.94
        }

        // motes rise and wrap
        const pos = moteGeo.attributes.position as BufferAttribute
        const arr = pos.array as Float32Array
        for (let i = 0; i < MOTE_COUNT; i++) {
          arr[i * 3 + 1] += moteSpeed[i]
          if (arr[i * 3 + 1] > moteHalf) {
            arr[i * 3 + 1] = -moteHalf
            arr[i * 3] = (Math.random() - 0.5) * 5.4
          }
        }
        pos.needsUpdate = true

        // gentle breathing lean
        curY += (targetY - curY) * 0.045
        curX += (targetX - curX) * 0.045
        book.rotation.y = curY + Math.sin(t * 0.22) * 0.06
        book.rotation.x = -0.28 + curX + Math.cos(t * 0.18) * 0.03
        book.position.y = -0.34 + Math.sin(t * 0.5) * 0.07

        stars.rotation.y = t * 0.012

        renderer.render(scene, camera)
      }

      let raf = 0
      if (reduce) {
        // One still frame. No loop, no battery cost, motion request honoured.
        draw(1.2)
      } else {
        const loop = () => {
          raf = requestAnimationFrame(loop)
          if (!onScreen || !tabVisible) return
          draw(clock.getElapsedTime())
        }
        raf = requestAnimationFrame(loop)
      }

      // ── Teardown ────────────────────────────────────────────────────────
      teardown = () => {
        cancelAnimationFrame(raf)
        io.disconnect()
        ro.disconnect()
        window.removeEventListener('pointermove', onPointer)
        window.removeEventListener('deviceorientation', onTilt)
        document.removeEventListener('visibilitychange', onVis)
        pageGeo.dispose()
        flipGeo.dispose()
        pageMat.dispose()
        coverGeo.dispose()
        coverMat.dispose()
        artGeo.dispose()
        for (const m of artMats) { m.map?.dispose(); m.dispose() }
        glowGeo.dispose()
        glowMat.dispose()
        glowTex.dispose()
        moteGeo.dispose()
        moteMat.dispose()
        starGeo.dispose()
        starMat.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })().catch(() => {
      /* a decorative canvas must never break the page */
    })

    return () => {
      disposed = true
      teardown()
    }
  }, [])

  return <div ref={hostRef} className={className} aria-hidden="true" />
}
