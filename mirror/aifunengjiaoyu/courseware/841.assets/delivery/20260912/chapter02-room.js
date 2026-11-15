import {CylinderRoom} from './scene.js';
// Reuse chapter one's source-aspect UV mapping and frustum limits. No edge zoom.
export class ChapterTwoRoom extends CylinderRoom {
 diagnostics(){return {...super.diagnostics(),fieldOfView:this.camera.fov,mapping:'chapter-one-source-aspect'};}
}
