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
  const canvasRef = useRef()                        // 캔버스 참조용
  const isDone = useRef(false)                      // 파편 클릭 남용 방지용
  const particlesGroupRef = useRef()                // 파편 그룹 참조용
  const sphereMeshRef = useRef()                    // 달 Mesh 참조용
  const sceneRef = useRef()                         // Scene 참조용
  const meshesRef = useRef()                        // Mesh 배열 참조용
  const moonTouched = useRef(false)                 // 달 클릭 여부 감지용
  const pickParticleRef = useRef()                  // 유효한 파편 저장
  const copyParticleRef = useRef()                  // 유효한 파편 복제 (모핑용)
  let isDestroyed = false                           // 달 폭파 여부 저장
  let particlesGroup                                // 파편 그룹 저장
  let failedCount = 0                               // 유효하지 않은 파편 선택 횟수
  
  const [countTries, setCountTries] = useState(0)   // 파편 선택 횟수 (화면 렌더링용)

  const gameLevel = useRef('default')               // 게임 난이도 (파편 수, 유효 파편 수 상이)

  const [gameOver, setGameOver] = useState(false)   // 게임 실패 판별용
  const [hideBtn, setHideBtn] = useState(false)     // 버튼 화면 렌더링 여부용
  const [isFind, setIsFind] = useState(false)       // 유효한 파편 선택 유무용
  const [mode, setMode] = useState('default')       // 버튼을 통해 gameLevel 조정
  
  // 버튼으로 모드(난이도)를 변경
  const modeChange = (e) => {
    setMode(e)
    gameLevel.current = e
    // console.log(gameLevel.current)
  }
  
  // Retry 버튼 클릭 시, 실행되는 함수
  const retryGame = () => {
    setGameOver(false)                              //    
    setIsFind(false)                                //    초
    setHideBtn(false)                               //    
    isDone.current = false                          //    기
    moonTouched.current = false                     //
    setCountTries(failedCount)                      //    화
    
    if (copyParticleRef.current) {                  // 모핑한 도형이 있다면
      console.log(copyParticleRef.current)          // 출력하고
      gsap.to(                                      // 애니메이션 실행
        copyParticleRef.current.scale,              // 해당 도형의 스케일을
        {
          duration: 0.5,                            // 0.5초 동안
          x: 0,                                     // x
          y: 0,                                     // y
          z: 0,                                     // z의 값을 0으로 줄임
          onComplete: () => {                       // duration 시간이 지나면 실행
            sceneRef.current.remove(copyParticleRef.current)    // Scene에서 제거
            copyParticleRef.current = undefined                 // 모핑 도형 자체를 삭제
          }
        }
      )
    }
    
    // 유효한 파편이 있었다면 해당 파편을 다시 보이게 함
    if (pickParticleRef.current) pickParticleRef.current.object.visible = true

    const particles = particlesGroupRef.current?.children       // 파편 그룹 원소들
    if (!particles || particles.length === 0) return            // 없다면 return

    particles.forEach((particle, index) => {        // 각 파티클마다 수행
      particle.userData.clicked = true              // 모으는 시점에 클릭 방지
      gsap.to(                                      
        particle.position,                          // 파티클의 포지션을
        {
          duration: 3,                              // 3초 동안
          x: 0,                                     // 0
          y: 0,                                     // 0
          z: -10,                                   // -10 위치로 모이도록 설정
          onComplete: () => {                       // 3초가 지나면 수행
            if (index === particles.length - 1) {   // 마지막 파편이라면
              sceneRef.current.remove(particlesGroupRef.current)  // 파편 그룹을 Scene에서 삭제
              particlesGroupRef.current = null                    // 파편 그룹 자체도 null로 삭제

              if (sphereMeshRef.current) {                        // 달이 있다면
                sphereMeshRef.current.scale.set(0.2, 0.2, 0.2)    // 해당 달의 스케일을 0.2로 줄이고
                sphereMeshRef.current.position.set(0, 0, -10)     // 0, 0, -10 위치로 이동시킨 후
                gsap.to(
                  sphereMeshRef.current.scale,
                  {
                    duration: 3,
                    x: 1,
                    y: 1,
                    z: 1
                  }
                )                                                 // 스케일을 1까지 커지게 애니메이션 실행
                sceneRef.current.add(sphereMeshRef.current)       // Scene에 달을 추가
                meshesRef.current.push(sphereMeshRef.current)     // meshes 배열에 달 추가
              }
            }
          }
        }
      )
    })

    isDestroyed = false                                           // 폭파 여부를 false로 변경
  }

  useEffect(() => {                                               // 렌더링 후 실행
    const canvas = canvasRef.current                              // canvas 태그를 참조
    const renderer = new THREE.WebGLRenderer({                    // three WebGL renderer 생성
      canvas,             // 캔버스
      antialias: true     // 계단 현상을 줄여 부드러운 그래픽 제공
    })
    renderer.setSize(window.innerWidth, window.innerHeight)       // 화면 크기만큼 덮음
    renderer.shadowMap.enabled = true                             // 그림자 생성 가능하도록 설정
    renderer.shadowMap.type = THREE.PCFSoftShadowMap              // 그림자 옵션 설정

    const scene = new THREE.Scene()                               // Scene 생성
    sceneRef.current = scene                                      // ref로 저장
    
    const camera = new THREE.PerspectiveCamera(                   // 원근카메라 설정
      75,                                       // fov 시야각
      window.innerWidth / window.innerHeight,   // aspect 화면 비율
      0.1,                                      // near 
      1000                                      // far
    )
    camera.position.set(0, 0, 0)                // 카메라 위치 초기화
    scene.add(camera)                           // Scene에 카메라 추가

    const controls = new OrbitControls(camera, renderer.domElement) // 마우스 컨트롤 가능
                                                                    // (화면 전환, 줌 인/아웃)
    const amLight = new THREE.AmbientLight('white', 0.3)            // 환경광 생성
    const dLight = new THREE.DirectionalLight('white', 1)           // 태양광 생성
    dLight.position.copy(camera.position)       // 카메라의 위치에 태양광 설치

    scene.add(amLight, dLight)                  // 환경광, 태양광 Scene에 추가
  
    new RGBELoader()                            // HDR 파일 로더
      .setPath('/hdr/')                         // public/hdr 디렉토리 경로
      .load('HDR_galactic_plane_hazy_nebulae.hdr', (hdrTex) => {
        hdrTex.mapping = THREE.EquirectangularReflectionMapping;  // 해당 HDR 파일로 맵핑
        scene.background = hdrTex;                                // 배경에 적용

        onLoadComplete()                        // 로딩이 완료되면 callback 함수 호출 
      })
    
    // Texture 로더로 여러 Map을 로드 ****************************
    const textureLoader = new THREE.TextureLoader()
    const universeMap = textureLoader.load(bcMap)
    const universeRoughnessMap = textureLoader.load(rhMap)
    const universeAoMap = textureLoader.load(aoMap)
    const universeNormalMap = textureLoader.load(nmMap)
    const heightMap = textureLoader.load(hgtMap)
    // ********************************************************

    // 달 Texture를 입힌 구 형태의 Mesh 생성 ----------------------
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
    sphereMesh.position.z = -1300   // 처음 위치 초기화
    sphereMesh.name = 'moon'        // Mesh 이름 지정
    sphereMeshRef.current = sphereMesh
    scene.add(sphereMesh)
    // ---------------------------------------------------------

    // meshes 배열에 sphere 추가
    const meshes = []
    meshes.push(sphereMesh)
    meshesRef.current = meshes

    // 달의 초기 위치(z = -1000)에서 -10 위치까지 애니메이션 실행
    gsap.to(
      sphereMesh.position,
      {
        duration: 7,
        z: -10
      }
    )
    // 달이 상하 운동을 하여 우주에 둥둥 뜨고 있는 모습 구현
    gsap.to(
      sphereMesh.position, 
      {
        y: "+=0.3",         // 진폭 
        duration: 4,        // 시간
        yoyo: true,         // 되돌아옴
        repeat: -1,         // 반복
        ease: "sine.inOut"  // 부드러운 곡선
    })

    // 태양광 오프셋 벡터 값
    const dLightOffset = new THREE.Vector3(5, 5, 5)

    // 애니메이션 루프를 통해 렌더링을 지속적으로 수행 ************************
    renderer.setAnimationLoop(() => {
      sphereMesh.rotation.y += THREE.MathUtils.degToRad(0.01)     // 달 주기적으로 우회전

      // controls.target.copy(sphereMesh.position)
      if (copyParticleRef.current) {                              // 모핑 파편이 있으면
        controls.target.copy(copyParticleRef.current.position)    // 해당 파편의 기준으로
        controls.update()                                         // 화면 전환
      } else {                                                    // 없다면
        controls.target.copy(new THREE.Vector3(0, 0, -10))        // 달의 초기 위치 기준으로
        controls.update()                                         // 화면 전환
      }

      dLight.position.copy(sphereMesh.position).add(dLightOffset) // 태양광을 달의 위치로 복사하고 오프셋 추가
      dLight.target.position.copy(sphereMesh.position)            // 태양광이 달을 향하도록 지정
      scene.add(dLight.target)

      renderer.render(scene, camera)
    })
    // *****************************************************************

    // 화면 크기에 따라 카메라 화면 비율 동적 할당 ----------------------
    const setResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', setResize)
    // ------------------------------------------------------------

    // 마우스 클릭으로 물체 감지하기 위한 raycaster
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    // 클릭한 물체 감지하는 함수 *********************************************************
    const detectMesh = (e) => {
      if (mouseMoved) return
      raycaster.setFromCamera(mouse, camera)                  // 마우스의 좌표를 통해 물체 감지
      const intersects = raycaster.intersectObjects(meshes)   // meshes 배열에서 감지된 물체
      
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
              moonDestroyed()  // 달 폭발 함수
            })
          }
          return
        }
      }

      // 유효한 파편을 모핑하기 위한 함수
      const showStone = (item) => {
        console.log(item)
        pickParticleRef.current = item
        const pos = item.object.position
        
        // 해당 파편이 카메라 바로 앞으로 오도록 설정
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        const targetPosition = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(5))

        // 모핑을 위한 복제품 생성
        const geo = new THREE.BufferGeometry().copy(item.object.geometry)
        const wSeg = item.object.userData.widthSeg
        const hSeg = item.object.userData.heightSeg
        const plane = new THREE.PlaneGeometry(5, 8, wSeg, hSeg)

        if (geo.attributes.position.count !== plane.attributes.position.count) {
          console.log("맞지 않습니다.", "1: ", geo.attributes.position.count, "2: ", plane.attributes.position.count)
        } else {
          console.log("정확하게 일치합니다.", geo.attributes.position.count)
        }
        // plane의 정점 배열을 복제 Mesh의 정점 위치로 복사 (후에 모핑하기 위함)
        geo.morphAttributes.position = [plane.attributes.position]

        const mat = new THREE.MeshStandardMaterial().copy(item.object.material)
        mat.side = THREE.DoubleSide

        const mesh = new THREE.Mesh(geo, mat)
        copyParticleRef.current = mesh
        scene.add(copyParticleRef.current)

        copyParticleRef.current.position.copy(pos)        // 복제 파편을 원래 파편 위치로 설정
        pickParticleRef.current.object.visible = false    // 유효한 파편은 안보이게 설정

        // 타임라인을 생성
        const timeline = gsap.timeline()
        // 1. 복제품이 카메라 바로 앞으로 오도록 애니메이션 설정
        timeline.to(
          copyParticleRef.current.position,
          {
            duration: 2,
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            ease: 'power2.out',
          }, 0
        )

        // 2. 유효한 파편은 visible이 false라 안보이지만 scene 내부에서
        // 복제품과 같은 위치로 오도록 설정
        timeline.to(
          pos,
          {
            duration: 2,
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            ease: 'power2.out',
          }, 0
        )

        // 3. 복제품이 모핑되도록 해당 배열의 값을 1로 설정 (duration 값에 따라 속도 조절)
        timeline.to(
          copyParticleRef.current.morphTargetInfluences,
          {
            duration: 2,
            0: 1,
            ease: "power2.out"
          }, 0
        )        
      }

      // 유효하지 않은 파편을 클릭했을 때 수행하는 함수
      const showAnimation = (item) => {
        // console.log(item)
        const pos = item.object.position
        const randomDirection = Math.round(Math.random())
        const timeline = gsap.timeline()

        // 랜덤값을 통해 x와 y의 방향으로 궤도를 그리며 움직임
        timeline.to(pos, {
          duration: 1,
          x: randomDirection === 1 ? "+=50" : "-=50",
          y: randomDirection === 1 ? "+=50" : "-=50",
          ease: "sine.inOut",
          yoyo: true,           // 반복
          repeat: 10            // 횟수
        }, 0); // 0초부터 시작
      
        // z 방향으로 날아감
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
              // 해당 파편이 유효한 경우 수행하는 부분
              console.log('찾았습니다. 실패횟수:', failedCount)
              item.object.userData.clicked = true
              failedCount = 0
              setIsFind(true)
              isDone.current = true
              showStone(item)
              return
            } else {
              // 해당 파편이 유효하지 않았을 때 8번 실패한 경우
              if (failedCount === 8) {
                setGameOver(true)
                setIsFind(true)
                isDone.current = true
                failedCount = 0
              } else {
                // 8번까지 실패하기 전의 경우
                if (!item.object.userData.clicked) {
                  item.object.userData.clicked = true
                  failedCount++
                  setCountTries(failedCount)
                  showAnimation(item)
                } else {
                  // 유효하지 않은 파편 중복 클릭 시
                  console.log("이미 클릭했습니다.")
                }
              }
            }
          }
          break      
        }
      }
    }
    // *******************************************************************************

    // 캔버스를 마우스로 클릭했을 때 이벤트 발생
    canvas.addEventListener('click', e => {
      // 마우스의 좌표를 저장
      mouse.x = e.clientX / canvas.clientWidth * 2 - 1
      mouse.y = -(e.clientY / canvas.clientHeight * 2 - 1)

      detectMesh()    // 해당 함수를 호출
    })

    // 달이 폭발하고 파티클을 생성하는 함수
    const moonDestroyed = () => {
      // console.log("boom!!")
      isDestroyed = true
      setHideBtn(true)

      let urlStone
      let usedStoneNum = []

      // 난이도에 따른 유효한 파편의 갯수
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
      
      // 파편이 생기면 달은 Scene에서 삭제
      scene.remove(sphereMesh)
      for (let i=0; i<meshes.length; i++) {
        meshes.pop()
      }

      // 난이도에 따른 파편의 총 갯수
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

      // 유효한 파편의 수 만큼 중복되지 않는 랜덤의 파편을 유효한 파편으로 저장
      while (usedStoneNum.length < urlStone) {
        let num = Math.round(Math.random() * (particlesNum - 1))
        if (usedStoneNum.includes(num)) continue
        usedStoneNum.push(num)
      }

      // 각각의 파편은 랜덤한 크기와 세그먼트를 가짐
      for (let i=0; i<particlesNum; i++) {
        const radius = Math.random() + 0.2;                 // 반지름: 0.2 ~ 1.2
        const widthSegments = Math.floor(Math.random() * 4) + 5;  // 5~9
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
          clicked: false,
          widthSeg: widthSegments,
          heightSeg: heightSegments
        }
        
        // 유효한 파편의 경우 userData에 데이터를 저장
        for (let j=0; j<usedStoneNum.length; j++) {
          if (usedStoneNum[j] === i) {
            mesh.userData.url = 'here'
          } 
        }

        // meshes 배열에 파편들을 전부 push
        particlesGroup.add(mesh)
        meshes.push(mesh)
      }

      particlesGroupRef.current = particlesGroup
      meshesRef.current = meshes
      scene.add(particlesGroup)

      // 각각의 파편들이 랜덤한 위치로 흩날림
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

    // 마우스를 통한 이벤트
    let mouseMoved        // 마우스 움직임을 판별
    let clickStartX       // 마우스 클릭 시작점 X 좌표
    let clickStartY       // 마우스 클릭 시작점 Y 좌표
    let clickStartTime    // 마우스 클릭 시작 시간

    // 마우스를 눌렀을 때 이벤트 - 시작 시간과 시작한 위치를 저장
    canvas.addEventListener('mousedown', e => {
      clickStartX = e.clientX
      clickStartY = e.clientY
      clickStartTime = Date.now()
    })

    // 마우스를 뗄 때 이벤트 - 눌렀을 때의 값과 비교
    canvas.addEventListener('mouseup', e => {
      let xGap = Math.abs(e.clientX - clickStartX)
      let yGap = Math.abs(e.clientY - clickStartY)
      let timeGap = Date.now() - clickStartTime

      // 마우스의 이동 반경이나 마우스를 누른 시간을 계산하여 드래그와 클릭을 구분
      if (xGap > 5 || yGap > 5 || timeGap > 500) {
        mouseMoved = true
      } else {
        mouseMoved = false
      }
    })

    // 메모리 누수 방지를 위해 return시, 메모리 해제
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
      {gameOver ? 
      <div className='failed-content-div'>
        <p className='failed-content'>Mission Failed</p>
      </div>
      : hideBtn && !isFind ? 
      <div className='failed-content-div'>
        <p className='failed-content'>{9-countTries} {9-countTries === 1 ? 'Chance' : 'Chances'} left</p>
      </div>
      : ''
      }
    </div>
  );
}

export default ThreeCanvas