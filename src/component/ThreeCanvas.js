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
  
    useEffect(() => {
      const canvas = canvasRef.current
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
      })
      renderer.setSize(window.innerWidth, window.innerHeight)
    
      const scene = new THREE.Scene()
      
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      )
      // camera.position.set(0, 0, 10)
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
        // aoMap: universeAoMap,
        normalMap: universeNormalMap,
        metalness: 0.1,
        roughness: 0.8,
        normalScale: new THREE.Vector2(0.8, 0.8)   
      })
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
      sphereMesh.position.z = -150
      scene.add(sphereMesh)
  
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
  
      // const clock = new THREE.Clock()
      // const delta = clock.getDelta()
  
      const dLightOffset = new THREE.Vector3(5, 5, 5)
  
      renderer.setAnimationLoop(() => {
        sphereMesh.rotation.y += THREE.MathUtils.degToRad(0.01)
  
        controls.target.copy(sphereMesh.position)
        controls.update()
  
        dLight.position.copy(sphereMesh.position).add(dLightOffset)
        dLight.target.position.copy(sphereMesh.position)
        scene.add(dLight.target)
  
        renderer.render(scene, camera)
      })
  
      return () => {
        renderer.setAnimationLoop(null)
      }
      
    }, [])
  
    return (
      <canvas ref={canvasRef} id='three-canvas'></canvas>
    );
}

export default ThreeCanvas