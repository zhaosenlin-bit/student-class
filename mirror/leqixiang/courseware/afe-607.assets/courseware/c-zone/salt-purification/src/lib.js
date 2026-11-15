/**
 * 统一三方依赖入口：业务模块只从这里取 Three.js 与固定版本插件。
 * vendor/ 内是锁定到 three@0.184.0 的薄入口；离线生产时替换为同版官方文件即可。
 */
export * from '../vendor/three.module.js'
export { OrbitControls } from '../vendor/OrbitControls.js'
export { RoomEnvironment } from '../vendor/RoomEnvironment.js'
export { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js'
