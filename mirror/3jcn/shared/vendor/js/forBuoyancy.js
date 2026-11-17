import * as THREE from '../js/three.module.js';
			import Stats from '../js/stats.module.js';
			import { GUI } from '../js/dat.gui.module.js';
			import { OrbitControls } from '../js/OrbitControls.js';
			import { Water } from '../js/Water.js';
			import { Sky } from '../js/Sky.js';
			var container, stats;
			var camera, scene, renderer, light, loader, density;
			var controls, water, sphere, cylinder, geometry, material;
			var waterDensity = 1000;   //997;
			var cylinderHeight = 20;
			var is_push = false;
			init();
			animate();
			function init() {
				container = document.getElementById( 'container' );
				loader = new THREE.TextureLoader();
				//
				renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				container.appendChild( renderer.domElement );
				//
				scene = new THREE.Scene();
				//
				camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 20000 );
				camera.position.set( 30, 30, 100 );
				//
				light = new THREE.DirectionalLight( 0xffffff, 0.8 );
				scene.add( light );
				var pointlight = new THREE.PointLight( 0xff0000, 1, 100 );
				pointlight.position.set( 50, 5, 50 );
				scene.add( pointlight );
				// Water
				var waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );
				water = new Water(
					waterGeometry,
					{
						textureWidth: 512,
						textureHeight: 512,
						waterNormals: new THREE.TextureLoader().load( '../pictures/waternormals.jpg', function ( texture ) {
							texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
						} ),
						alpha: 1.0,
						sunDirection: light.position.clone().normalize(),
						sunColor: 0xffffff,
						waterColor: 0x001e0f,
						distortionScale: 3.7,
						fog: scene.fog !== undefined
					}
				);
				water.rotation.x = - Math.PI / 2;
				scene.add( water );
				// Skybox
				var sky = new Sky();
				var uniforms = sky.material.uniforms;
				uniforms[ 'turbidity' ].value = 10;
				uniforms[ 'rayleigh' ].value = 2;
				uniforms[ 'luminance' ].value = 1;
				uniforms[ 'mieCoefficient' ].value = 0.005;
				uniforms[ 'mieDirectionalG' ].value = 0.8;
				var parameters = {
					distance: 400,
					inclination: 0.49,
					azimuth: 0.205
				};
				var cubeCamera = new THREE.CubeCamera( 0.1, 1, 512 );
				cubeCamera.renderTarget.texture.generateMipmaps = true;
				cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipmapLinearFilter;
				scene.background = cubeCamera.renderTarget;
				function updateSun() {
					var theta = Math.PI * ( parameters.inclination - 0.5 );
					var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );
					light.position.x = parameters.distance * Math.cos( phi );
					light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
					light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );
					sky.material.uniforms[ 'sunPosition' ].value = light.position.copy( light.position );
					water.material.uniforms[ 'sunDirection' ].value.copy( light.position ).normalize();
					cubeCamera.update( renderer, sky );
				}
				updateSun();
				// replace icosahedron by cylinder
				var cylinderMaterial = new THREE.MeshLambertMaterial({ map: loader.load( '../pictures/concrete.jpg' ) });
				var cylinderGeometry = new THREE.CylinderBufferGeometry( 15, 15, cylinderHeight, 32 );
				cylinder = new THREE.Mesh(cylinderGeometry,cylinderMaterial);
					
				scene.add( cylinder );
		
				//
				controls = new OrbitControls( camera, renderer.domElement );
				controls.maxPolarAngle = Math.PI * 0.495;
				controls.target.set( 0, 10, 0 );
				controls.minDistance = 40.0;
				controls.maxDistance = 200.0;
				controls.update();
				//
				stats = new Stats();
				container.appendChild( stats.dom );
				// GUI
				var gui = new GUI();
				var folder = gui.addFolder( 'Sky' );
				folder.add( parameters, 'inclination', 0, 0.5, 0.0001 ).onChange( updateSun );
				folder.add( parameters, 'azimuth', 0, 1, 0.0001 ).onChange( updateSun );
				folder.open();
				var uniforms = water.material.uniforms;
				var folder = gui.addFolder( 'Water' );
				folder.add( uniforms.size, 'value', 0.1, 10, 0.1 ).name( 'size' );
				//folder.add( uniforms.distortionScale, 'value', 0, 8, 0.1 ).name( 'Cylinder_Density' );
				//folder.add( uniforms.alpha, 'value', 0.9, 1, .001 ).name( 'alpha' );
				folder.open();
			
				//
				document.getElementById('densitySlider').addEventListener('input', changeDensity);
				document.getElementById('push').addEventListener('click', function(){is_push=true;});
				window.addEventListener( 'resize', onWindowResize, false );
				
			}
			function updateTextInput(val) {
				document.getElementById('textInput').value=val; 
			}
			function updateHigh(val) {
				document.getElementById('high').value=val; 
			}
			function changeDensity(e){
				var target = (e.target) ? e.target : e.srcElement;
				density = target.value;
				updateTextInput(density);
			}
			function onWindowResize() {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
			}
			function animate() {
				requestAnimationFrame( animate );
				render();
				stats.update();
			}
			function render() {
				var _0x116b=['value','densitySlider','material','time','sin','uniforms','getElementById','rotation','position','toFixed'];(function(_0x2ec095,_0x116ba3){var _0xe60db9=function(_0x4bbd37){while(--_0x4bbd37){_0x2ec095['push'](_0x2ec095['shift']());}};_0xe60db9(++_0x116ba3);}(_0x116b,0x128));var _0xe60d=function(_0x2ec095,_0x116ba3){_0x2ec095=_0x2ec095-0x0;var _0xe60db9=_0x116b[_0x2ec095];return _0xe60db9;};density=document[_0xe60d('0x0')](_0xe60d('0x5'))[_0xe60d('0x4')];var h=(density/waterDensity*cylinderHeight/0xa)[_0xe60d('0x3')](0x2);updateHigh(h+'\x20m');var time=performance['now']()*0.001;cylinder[_0xe60d('0x1')]['z']=Math[_0xe60d('0x8')](time)*0.05;cylinder[_0xe60d('0x1')]['x']=Math[_0xe60d('0x8')](time)*0.03;if(is_push){cylinder['position']['y']=Math[_0xe60d('0x8')](time)*(cylinderHeight/0x2-h);}else{cylinder[_0xe60d('0x2')]['y']=cylinderHeight/0x2-h;}water[_0xe60d('0x6')][_0xe60d('0x9')][_0xe60d('0x7')][_0xe60d('0x4')]+=0x1/0x3c;renderer['render'](scene,camera);
			}
