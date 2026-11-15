/**
 * surface.js —— 二氧化碳课件接入氧气实验室共享岛台。
 */
import { Mesh } from 'three'
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
import { createOxygenLabEnvironment } from '../../../../shared/oxygen-lab-environment.js'

const roundedBox = (width, height, depth, radius, material) => (
  new Mesh(new RoundedBoxGeometry(width, height, depth, 5, radius), material)
)

export function buildSurface(root) {
  return createOxygenLabEnvironment({
    root,
    roundedBox,
    width: 10.9,
    depth: 4.9,
    topY: 0.062,
    name: 'co2-oxygen-lab-environment',
  })
}
