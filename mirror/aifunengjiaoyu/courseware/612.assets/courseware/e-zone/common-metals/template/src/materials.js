import {
  BackSide,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from '../vendor/three.module.js'

/**
 * Material definitions intentionally keep every metal distinct. Values are
 * calibrated for the neutral studio environment in scene.js.
 */
export function createMaterials() {
  const metals = {
    magnesium: new MeshPhysicalMaterial({
      name: 'magnesium-silver-white',
      color: 0xdfe5e3,
      metalness: 0.91,
      roughness: 0.27,
      clearcoat: 0.22,
      clearcoatRoughness: 0.16,
      side: DoubleSide,
    }),
    zinc: new MeshStandardMaterial({
      name: 'zinc-silver-gray',
      color: 0x8f999a,
      metalness: 0.84,
      roughness: 0.39,
      flatShading: true,
    }),
    iron: new MeshStandardMaterial({
      name: 'iron-silver-gray',
      color: 0x707b7c,
      metalness: 0.82,
      roughness: 0.33,
    }),
    copper: new MeshPhysicalMaterial({
      name: 'copper-purple-red',
      color: 0x9f4935,
      metalness: 0.9,
      roughness: 0.28,
      clearcoat: 0.18,
      clearcoatRoughness: 0.18,
    }),
    aluminum: new MeshPhysicalMaterial({
      name: 'aluminum-silver-white',
      color: 0xcfd6d5,
      metalness: 0.92,
      roughness: 0.2,
      clearcoat: 0.2,
      clearcoatRoughness: 0.1,
      side: DoubleSide,
    }),
  }

  const polished = {
    magnesium: metals.magnesium.clone(),
    zinc: metals.zinc.clone(),
    iron: metals.iron.clone(),
    copper: metals.copper.clone(),
    aluminum: metals.aluminum.clone(),
  }
  Object.entries(polished).forEach(([key, material]) => {
    material.name = `${key}-polished-patch`
    material.color.lerp(new Color(0xffffff), key === 'copper' ? 0.1 : 0.17)
    material.roughness = 0.08
    material.clearcoat = Math.max(material.clearcoat || 0, 0.4)
    material.clearcoatRoughness = 0.05
  })

  return {
    metals,
    polished,
    bench: new MeshPhysicalMaterial({ color: 0x59625f, roughness: 0.52, metalness: 0.06, clearcoat: 0.08 }),
    benchInset: new MeshStandardMaterial({ color: 0x89918e, roughness: 0.46, metalness: 0.08 }),
    tray: new MeshPhysicalMaterial({ color: 0xd7ddda, roughness: 0.3, metalness: 0.34, clearcoat: 0.18 }),
    trayDark: new MeshStandardMaterial({ color: 0x8d9693, roughness: 0.4, metalness: 0.44 }),
    sandpaper: new MeshStandardMaterial({ color: 0x8c6f53, roughness: 0.98, metalness: 0 }),
    sandpaperEdge: new MeshStandardMaterial({ color: 0xc9a77e, roughness: 0.86, metalness: 0 }),
    rust: new MeshStandardMaterial({ color: 0x8b4c2f, roughness: 0.88, metalness: 0.08 }),
    glass: new MeshPhysicalMaterial({
      color: 0xaed7dd,
      transparent: true,
      opacity: 0.2,
      roughness: 0.055,
      metalness: 0,
      ior: 1.46,
      clearcoat: 1,
      clearcoatRoughness: 0.035,
      side: DoubleSide,
      depthWrite: false,
    }),
    glassInner: new MeshPhysicalMaterial({
      color: 0xd9f2f4,
      transparent: true,
      opacity: 0.055,
      roughness: 0.05,
      side: BackSide,
      depthWrite: false,
    }),
    glassEdge: new MeshBasicMaterial({ color: 0xa4dbe2, transparent: true, opacity: 0.72, depthWrite: false }),
    acid: new MeshPhysicalMaterial({
      color: 0xe8f4f0,
      transparent: true,
      opacity: 0.34,
      roughness: 0.12,
      clearcoat: 0.35,
      depthWrite: false,
    }),
    copperSulfate: new MeshPhysicalMaterial({
      color: 0x167fbe,
      transparent: true,
      opacity: 0.76,
      roughness: 0.13,
      clearcoat: 0.32,
      depthWrite: false,
    }),
    liquidSurface: new MeshPhysicalMaterial({
      color: 0xbfe7ec,
      transparent: true,
      opacity: 0.7,
      roughness: 0.06,
      side: DoubleSide,
      depthWrite: false,
    }),
    bubble: new MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
      roughness: 0.03,
      metalness: 0,
      clearcoat: 1,
      side: DoubleSide,
      depthWrite: false,
    }),
    rack: new MeshStandardMaterial({ color: 0xaeb8b5, roughness: 0.34, metalness: 0.48 }),
    rackDark: new MeshStandardMaterial({ color: 0x495653, roughness: 0.46, metalness: 0.5 }),
    rubber: new MeshStandardMaterial({ color: 0x232a29, roughness: 0.82, metalness: 0.02 }),
    redWire: new MeshStandardMaterial({ color: 0xb6443f, roughness: 0.48, metalness: 0.08 }),
    blueWire: new MeshStandardMaterial({ color: 0x2f668a, roughness: 0.48, metalness: 0.08 }),
    brass: new MeshStandardMaterial({ color: 0xb28443, roughness: 0.27, metalness: 0.78 }),
    battery: new MeshPhysicalMaterial({ color: 0x315f5a, roughness: 0.34, metalness: 0.12, clearcoat: 0.38 }),
    ceramic: new MeshPhysicalMaterial({ color: 0xe8e4da, roughness: 0.5, metalness: 0, clearcoat: 0.17 }),
    bulbGlass: new MeshPhysicalMaterial({
      color: 0xf5f2d8,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      clearcoat: 1,
      depthWrite: false,
    }),
    bulbOff: new MeshStandardMaterial({ color: 0x4f4638, emissive: 0x1f160b, emissiveIntensity: 0.05, roughness: 0.34 }),
    bulbOn: new MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa52d, emissiveIntensity: 3.2, roughness: 0.22 }),
    copperDeposit: new MeshStandardMaterial({ color: 0x902f20, metalness: 0.66, roughness: 0.52 }),
    copperOxide: new MeshStandardMaterial({ color: 0x111516, metalness: 0.02, roughness: 0.82 }),
    dropperGlass: new MeshPhysicalMaterial({ color: 0xc8e7e8, transparent: true, opacity: 0.28, roughness: 0.06, depthWrite: false }),
    label: new MeshStandardMaterial({ color: 0x2f7668, roughness: 0.5, metalness: 0.06 }),
    flameOuter: new MeshBasicMaterial({ color: 0xff6a28, transparent: true, opacity: 0.58, side: DoubleSide, depthWrite: false }),
    flameMid: new MeshBasicMaterial({ color: 0xffc454, transparent: true, opacity: 0.7, side: DoubleSide, depthWrite: false }),
    flameInner: new MeshBasicMaterial({ color: 0x65bfff, transparent: true, opacity: 0.83, side: DoubleSide, depthWrite: false }),
  }
}

export const SOLUTION_COLORS = Object.freeze({
  copperSulfate: new Color(0x167fbe),
  paleIronSulfate: new Color(0x8fbc91),
  acidClear: new Color(0xe8f4f0),
  acidIronPaleGreen: new Color(0xd8e5c8),
})
