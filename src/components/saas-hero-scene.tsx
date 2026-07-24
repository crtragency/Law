"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function SaasHeroScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.15, 7.8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const rig = new THREE.Group();
    rig.rotation.x = -0.18;
    rig.rotation.z = 0.12;
    scene.add(rig);

    const brass = new THREE.MeshPhysicalMaterial({
      color: 0xd3b36a,
      metalness: 0.72,
      roughness: 0.25,
      clearcoat: 0.8,
      clearcoatRoughness: 0.22,
    });
    const emerald = new THREE.MeshPhysicalMaterial({
      color: 0x2f765f,
      metalness: 0.45,
      roughness: 0.34,
      clearcoat: 0.55,
      transparent: true,
      opacity: 0.86,
    });

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.75, 0.052, 20, 180),
      brass
    );
    outerRing.rotation.set(1.05, 0.2, 0.15);
    rig.add(outerRing);

    const middleRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.02, 0.035, 16, 160),
      emerald
    );
    middleRing.rotation.set(0.46, 1.08, -0.34);
    rig.add(middleRing);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.025, 14, 140),
      brass
    );
    innerRing.rotation.set(1.42, 0.18, 0.62);
    rig.add(innerRing);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.38, 1),
      emerald
    );
    core.scale.set(1, 1.45, 1);
    rig.add(core);

    const pointGeometry = new THREE.BufferGeometry();
    const pointCount = 120;
    const positions = new Float32Array(pointCount * 3);
    for (let index = 0; index < pointCount; index += 1) {
      const angle = index * 2.399963;
      const radius = 2.8 + ((index * 17) % 100) / 80;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle) * radius * 0.56;
      positions[index * 3 + 2] = ((index * 29) % 100) / 50 - 1;
    }
    pointGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    const points = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({
        color: 0xe6ca86,
        size: 0.025,
        transparent: true,
        opacity: 0.48,
        sizeAttenuation: true,
      })
    );
    rig.add(points);

    scene.add(new THREE.HemisphereLight(0xf8f4e8, 0x09221a, 2.1));
    const keyLight = new THREE.DirectionalLight(0xf5d995, 4.2);
    keyLight.position.set(4, 4, 5);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x58b59a, 2.6, 12);
    fillLight.position.set(-4, -1, 3);
    scene.add(fillLight);

    let targetX = 0;
    let targetY = 0;
    let frameId = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      renderer.setSize(Math.max(rect.width, 1), Math.max(rect.height, 1), false);
      camera.aspect = Math.max(rect.width, 1) / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 0.24;
      targetY = (event.clientY / window.innerHeight - 0.5) * 0.16;
    };

    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      if (!reducedMotion) {
        rig.rotation.y += (targetX + elapsed * 0.035 - rig.rotation.y) * 0.025;
        rig.rotation.x += (-0.18 + targetY - rig.rotation.x) * 0.035;
        outerRing.rotation.z = elapsed * 0.055;
        middleRing.rotation.z = -elapsed * 0.075;
        innerRing.rotation.z = elapsed * 0.11;
        core.rotation.y = elapsed * 0.16;
        core.rotation.x = elapsed * 0.09;
      }
      renderer.render(scene, camera);
      if (!reducedMotion) frameId = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    resize();
    render();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      outerRing.geometry.dispose();
      middleRing.geometry.dispose();
      innerRing.geometry.dispose();
      core.geometry.dispose();
      pointGeometry.dispose();
      brass.dispose();
      emerald.dispose();
      (points.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="saas-hero-scene" aria-hidden="true" />;
}
