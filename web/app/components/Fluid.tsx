"use client";

/* Site-wide fluid backdrop (storytelling-noomo pattern, Fides palette):
   domain-warped fbm in a fragment shader — slow silk of soft emerald over canvas.
   Fixed behind everything, pointer-events-none, very quiet so text always wins. */

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  varying vec2 vUv;

  vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0*fract(p*C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
    vec3 g;
    g.x = a0.x*x0.x + h.x*x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.0*dot(m,g);
  }
  float fbm(vec2 p){
    float f = 0.5*snoise(p);
    f += 0.25*snoise(p*2.02+11.3);
    f += 0.125*snoise(p*4.05-7.1);
    return f;
  }

  void main(){
    vec2 p = vUv * vec2(uRes.x/uRes.y, 1.0) * 1.35;
    float t = uTime * 0.03;
    // domain warp = the "silk"
    vec2 w = vec2(fbm(p + t), fbm(p - t*0.8 + 3.7));
    float f = fbm(p + 1.6*w + vec2(t*0.5, -t*0.3));

    vec3 canvasC = vec3(0.969, 0.969, 0.957);      // #F7F7F4
    vec3 mist    = vec3(0.905, 0.937, 0.905);      // green-grey mist
    vec3 emerald = vec3(0.118, 0.659, 0.302);      // #1EA84D

    float band = smoothstep(0.18, 0.55, f);
    vec3 col = mix(canvasC, mist, band);
    // rare emerald breath on the crests
    float crest = smoothstep(0.52, 0.78, f);
    col = mix(col, mix(col, emerald, 0.16), crest);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function FluidPlane() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } }),
    [],
  );
  useFrame(({ clock, size }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uRes.value.set(size.width, size.height);
  });
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} depthWrite={false} />
    </mesh>
  );
}

export function Fluid() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, alpha: false }} frameloop="always">
        <FluidPlane />
      </Canvas>
    </div>
  );
}
