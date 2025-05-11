import React from 'react'
import { useEffect, useRef, useState } from 'react';
import '../css/ThreeCanvas.css';
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

import bcMap from '../img/Moon_002_basecolor.png'
import aoMap from '../img/Moon_002_ambientOcclusion.png'
import nmMap from '../img/Moon_002_normal.png'
import rhMap from '../img/Moon_002_roughness.png'
import hgtMap from '../img/Moon_002_height.png'

const ThreeCanvas = ({onLoadComplete}) => {
  const canvasRef = useRef()
  const isDone = useRef(false)
  const particlesGroupRef = useRef()
  const sphereMeshRef = useRef()
  const sceneRef = useRef()
  const meshesRef = useRef()
  const moonTouched = useRef(false)
  let isDestroyed = false
  let particlesGroup
  let failedCount = 0
  
  const countColor = ['red', 'orange', 'yellow', 'rgb(0, 200, 0)', 'rgb(0, 0, 255)', 'rgb(0, 0, 100)','indigo', 'black']

  const gameLevel = useRef('default')

  const [gameOver, setGameOver] = useState(false)
  const [hideBtn, setHideBtn] = useState(false)
  const [isFind, setIsFind] = useState(false)
  const [mode, setMode] = useState('default')
  const modeChange = (e) => {
    setMode(e)
    gameLevel.current = e
    console.log(gameLevel.current)
  }
  const retryGame = () => {
    setGameOver(false)
    setIsFind(false)
    isDone.current = false
    moonTouched.current = false

    const particles = particlesGroupRef.current?.children
    if (!particles || particles.length === 0) return

    particles.forEach((particle, index) => {
      particle.userData.clicked = true // 모으는 시점에 클릭할 때를 방지
      gsap.to(
        particle.position,
        {
          duration: 3,
          x: 0,
          y: 0,
          z: -10,
          onComplete: () => {
            if (index === particles.length - 1) {
              sceneRef.current.remove(particlesGroupRef.current)
              particlesGroupRef.current = null

              if (sphereMeshRef.current) {
                sphereMeshRef.current.scale.set(0.2, 0.2, 0.2)
                sphereMeshRef.current.position.set(0, 0, -10)
                gsap.to(
                  sphereMeshRef.current.scale,
                  {
                    duration: 3,
                    x: 1,
                    y: 1,
                    z: 1
                  }
                )
                sceneRef.current.add(sphereMeshRef.current)
                meshesRef.current.push(sphereMeshRef.current)
                setHideBtn(false)
              }
            }
          }
        }
      )
    })

    isDestroyed = false
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    sceneRef.current = scene
    
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 0)
    scene.add(camera)

    const controls = new OrbitControls(camera, renderer.domElement)
  
    const amLight = new THREE.AmbientLight('white', 0.3)
    const dLight = new THREE.DirectionalLight('white', 1)
    dLight.position.copy(camera.position)

    scene.add(amLight, dLight)
  
    new RGBELoader()
      .setPath('/hdr/')
      .load('HDR_galactic_plane_hazy_nebulae.hdr', (hdrTex) => {
        hdrTex.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = hdrTex; // 배경에 적용

        onLoadComplete()
      })
    
    const textureLoader = new THREE.TextureLoader()
    const universeMap = textureLoader.load(bcMap)
    const universeRoughnessMap = textureLoader.load(rhMap)
    const universeAoMap = textureLoader.load(aoMap)
    const universeNormalMap = textureLoader.load(nmMap)
    const heightMap = textureLoader.load(hgtMap)

    const sphereGeo = new THREE.SphereGeometry(5, 32, 32)
    const sphereMat = new THREE.MeshStandardMaterial({
      map: universeMap,
      roughnessMap: universeRoughnessMap,
      aoMap: universeAoMap,
      normalMap: universeNormalMap,
      metalness: 0.1,
      roughness: 0.8,
      normalScale: new THREE.Vector2(0.8, 0.8) 
    })
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
    sphereMesh.position.z = -1300
    sphereMesh.name = 'moon'
    sphereMeshRef.current = sphereMesh
    scene.add(sphereMesh)

    const meshes = []
    meshes.push(sphereMesh)
    meshesRef.current = meshes

    gsap.to(
      sphereMesh.position,
      {
        duration: 7,
        z: -10
      }
    )
    gsap.to(
      sphereMesh.position, 
      {
        y: "+=0.3",         // 진폭 
        duration: 4,        // 시간
        yoyo: true,         // 되돌아옴
        repeat: -1,         // 반복
        ease: "sine.inOut"  // 부드러운 곡선
    })

    const dLightOffset = new THREE.Vector3(5, 5, 5)

    renderer.setAnimationLoop(() => {
      sphereMesh.rotation.y += THREE.MathUtils.degToRad(0.01)

      // controls.target.copy(sphereMesh.position)
      controls.target.copy(new THREE.Vector3(0, 0, -10))
      controls.update()

      dLight.position.copy(sphereMesh.position).add(dLightOffset)
      dLight.target.position.copy(sphereMesh.position)
      scene.add(dLight.target)

      renderer.render(scene, camera)
    })

    const setResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', setResize)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const detectMesh = (e) => {
      if (mouseMoved) return
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(meshes)
      
      // 클릭한 것이 달일 때 수행
      for (const item of intersects) {
        if (!moonTouched.current && item.object.name === 'moon') {
          // 달 클릭 시, 폭발함수 수행
          if (sphereMesh.position.z === -10) {
            moonTouched.current = true
            // 점점 극대화 시키기 위하여 타임라인으로 실행
            const timeLine = gsap.timeline()
            timeLine.to(
              sphereMesh.position,
              {
                duration: 0.08,
                x: 0.2,
                repeat: 5,
                yoyo: true
              }
            )
            .to(
              sphereMesh.position,
              {
                duration: 0.07,
                x: 0.4,
                repeat: 5,
                yoyo: true
              }
            )
            .to(
              sphereMesh.position,
              {
                duration: 0.06,
                x: 0.5,
                repeat: 5,
                yoyo: true
              }
            )
            .to(
              sphereMesh.position,
              {
                duration: 0.05,
                x: 0.7,
                repeat: 10,
                yoyo: true
              }
            )
            .call(() => {
              moonDestroyed()
            })
          }
          return
        }
      }

      const showStone = (item) => {
        const pos = item.object.position
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)

        const targetPosition = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(5))
        
        gsap.to(
          pos,
          {
            duration: 2,
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            ease: 'power2.out',
            // onComplete: () => {
            //   item.object.geometry.dispose()
            //   item.object.geometry = new THREE.BoxGeometry(1, 2, 0.2)
            // }
          }
        )
      }

      const showAnimation = (item) => {
        // console.log(item)
        const pos = item.object.position
        const randomDirection = Math.round(Math.random())
        const timeline = gsap.timeline()

        timeline.to(pos, {
          duration: 1,
          x: randomDirection === 1 ? "+=50" : "-=50",
          y: randomDirection === 1 ? "+=50" : "-=50",
          ease: "sine.inOut",
          yoyo: true,
          repeat: 10
        }, 0); // 0초부터 시작
      
        // z 방향으로 천천히 날아감
        timeline.to(pos, {
          duration: 25,
          z: pos.z - 1000,
          ease: "power2.out"
        }, 0); // 동시에 실행
      }
      
      // 달이 폭파되고 클릭한 것이 파편들일 때 수행
      if (isDestroyed && !isDone.current) {
        for (const item of intersects) {     
          if (particlesGroup.children.includes(item.object)) {
            if(item.object.userData.url && !item.object.userData.clicked) {
              // console.log(item.object.userData.url)
              console.log('찾았습니다. 실패횟수:', failedCount)
              item.object.userData.clicked = true
              failedCount = 0
              setIsFind(true)
              isDone.current = true
              showStone(item)
              return
            } else {
              if (failedCount === 8) {
                setGameOver(true)
                setIsFind(true)
                isDone.current = true
                failedCount = 0
              } else {
                if (!item.object.userData.clicked) {
                  item.object.userData.clicked = true
                  failedCount++
                  showAnimation(item)
                } else {
                  console.log("이미 클릭했습니다.")
                }
              }
            }
          }
          break      
        }
      }
    }

    canvas.addEventListener('click', e => {
      mouse.x = e.clientX / canvas.clientWidth * 2 - 1
      mouse.y = -(e.clientY / canvas.clientHeight * 2 - 1)

      detectMesh()
    })

    // 파티클 생성
    const moonDestroyed = () => {
      // console.log("boom!!")
      isDestroyed = true
      setHideBtn(true)

      let urlStone
      let usedStoneNum = []

      switch (gameLevel.current) {
        case 'normal':
          urlStone = 10
          break;
        case 'hard':
          urlStone = 15
          break;
        case 'extreme':
          urlStone = 20
          break;
        default:
          urlStone = 5
          break;
      }
      
      scene.remove(sphereMesh)
      for (let i=0; i<meshes.length; i++) {
        meshes.pop()
      }

      particlesGroup = new THREE.Group()
      let particlesNum
      switch (gameLevel.current) {
        case 'normal':
          particlesNum = 60
          break;
        case 'hard':
          particlesNum = 100
          break;
        case 'extreme':
          particlesNum = 150
          break;
        default:
          particlesNum = 30
          break;
      }

      while (usedStoneNum.length < urlStone) {
        let num = Math.round(Math.random() * (particlesNum - 1))
        if (usedStoneNum.includes(num)) continue
        usedStoneNum.push(num)
      }

      for (let i=0; i<particlesNum; i++) {
        const radius = Math.random() + 0.2;                 // 반지름: 0.2 ~ 1.2
        const widthSegments = Math.floor(Math.random() * 4) + 2;  // 2~6
        const heightSegments = Math.floor(Math.random() * 4) + 4; // 4~8
        const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments)
        const mat = new THREE.MeshStandardMaterial({
          map: universeMap,
          roughness: 0.8,
          color: 'white'
        })
        const mesh = new THREE.Mesh(geo, mat)

        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.position.copy(sphereMesh.position)
        mesh.name = i
        mesh.userData = {
          clicked: false
        }
        
        for (let j=0; j<usedStoneNum.length; j++) {
          if (usedStoneNum[j] === i) {
            mesh.userData = {
              url: "here"
            }
          } 
        }

        particlesGroup.add(mesh)
        meshes.push(mesh)
      }
      particlesGroupRef.current = particlesGroup
      meshesRef.current = meshes
      scene.add(particlesGroup)
      for (const item of particlesGroup.children) {
        gsap.to(
          item.position,
          {
            duration: 3,
            x: (Math.random() - 0.5) * 50,
            y: (Math.random() - 0.5) * 50,
            z: (Math.random() - 1) * 45 + 5
          }
        )
      }
    }

    let mouseMoved
    let clickStartX
    let clickStartY
    let clickStartTime

    canvas.addEventListener('mousedown', e => {
      clickStartX = e.clientX
      clickStartY = e.clientY
      clickStartTime = Date.now()
    })
    canvas.addEventListener('mouseup', e => {
      let xGap = Math.abs(e.clientX - clickStartX)
      let yGap = Math.abs(e.clientY - clickStartY)
      let timeGap = Date.now() - clickStartTime

      if (xGap > 5 || yGap > 5 || timeGap > 500) {
        mouseMoved = true
      } else {
        mouseMoved = false
      }
    })

    return () => {
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', setResize)
    }
  }, [])

  return (
    <div>
      <canvas ref={canvasRef} id='three-canvas'></canvas>
      {!hideBtn && 
      <div className='difficulty-level-div'>
        <p>Difficulty Level</p>
        <div className='difficulty-level-btn'>
          <button className={`${mode === 'default' ? 'clicked' : ""}`} onClick={() => modeChange('default')}>Easy</button>
          <button className={`${mode === 'normal' ? 'clicked' : ""}`} onClick={() => modeChange('normal')}>Normal</button>
          <button className={`${mode === 'hard' ? 'clicked' : ""}`} onClick={() => modeChange('hard')}>Hard</button>
          <button className={`${mode === 'extreme' ? 'clicked' : ""}`} onClick={() => modeChange('extreme')}>Extreme</button>
        </div>
      </div>
      }
      {isFind && 
      <div className='retry-btn-div'>
        <button className='retry-btn' onClick={retryGame}>Retry</button>
      </div>
      }
      {gameOver && 
      <div className='failed-content-div'>
        <p className='failed-content'>Mission Failed</p>
      </div>
      }
    </div>
  );
}

export default ThreeCanvas