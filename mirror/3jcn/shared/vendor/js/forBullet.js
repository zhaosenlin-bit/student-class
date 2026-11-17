  'use strict';
	
	//Physijs.scripts.worker = '../Physijs/physijs_worker.js';
	//Physijs.scripts.ammo = '../Physijs/ammo.js';
	
	var initScene, render, _boxes = [], sphere, loader, renderer, render_stats, container,camera, width, height, 
	physics_stats, scene, ground_material, ground_material2, ground, ground2, light, y, controls, mousedown;
	var loop = [];
	var Loop = [];
	var is_start = false;
	var is_stop = false;
	var L = 2;  
	var m_bullet = 0.05;
	var M_ball = 1.2;
	var Vo = 60;
	var steps = 0, step = 0;
	var h, V1, clock, startTime, passedTime, animationID, plateMesh;
	var initialHigh = 0, range = 0;
	var theta = 0, t = 0, t2 = 0;
	var dTheta = 4.05 * Math.PI / 1000;
	var line, line2, bullet, bullet2;
        var angleVelocity = 0;
        var angleAcceleration = 0;
	var score = 0;
	var audio = new Audio('../Audio/gun-shot.wav');
	var audio1 = new Audio('../Audio/cheer.mp3');
	var audio2 = new Audio('../Audio/wrong.mp3');
	
	function updateTextInput(val) {
          	document.getElementById('textInput').value=val; 
        }
	function updateRangeInput(val) {
          	document.getElementById('rangeInput').value=val; 
        }
	function onResize() {
		  width = window.innerWidth;
		  height = window.innerHeight;
		  camera.aspect = width / height;
		  camera.updateProjectionMatrix();
		  renderer.setSize(width, height);
	}
	
	function init() {
		document.getElementById("grade").readOnly = true;
		clock = new THREE.Clock();
		startTime = clock.getElapsedTime();
		V1 = m_bullet*Vo/(m_bullet + M_ball);
		h = V1*V1/9.81;
		
		width = window.innerWidth;
		height = window.innerHeight;
		scene = new Physijs.Scene;
		camera = new THREE.PerspectiveCamera(
			8, //35,
			width / height,
			1,
			1000
		);
		camera.position.set( 10, 12, 50 ); //60,50,60
		camera.lookAt( scene.position );
		scene.add( camera );
		scene.background = new THREE.Color(0xffffff); 
	
		container = document.getElementById( 'mainCanvas' );
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(width,height);
		mainCanvas.appendChild( renderer.domElement );
		renderer.shadowMap.enabled = true;
		renderer.shadowMapSoft = true;
		renderer.render(scene,camera);
		
		render_stats = new Stats();
		render_stats.domElement.style.position = 'absolute';
		render_stats.domElement.style.top = '0px';
		render_stats.domElement.style.zIndex = 100;
		
		physics_stats = new Stats();
		physics_stats.domElement.style.position = 'absolute';
		physics_stats.domElement.style.top = '50px';
		physics_stats.domElement.style.zIndex = 100;
		
		scene.setGravity(new THREE.Vector3( 0, -10, 0 )); 
		scene.addEventListener(
			'update',
			function() {
				scene.simulate(); 
				physics_stats.update();
			}
		);
		
		// Light
		light = new THREE.DirectionalLight( 0xFFFFFF );
		light.position.set( 20, 40, -15 );
		light.target.position.copy( scene.position );
		light.castShadow = true;
		light.shadowCameraLeft = -60;
		light.shadowCameraTop = -60;
		light.shadowCameraRight = 60;
		light.shadowCameraBottom = 60;
		light.shadowCameraNear = 20;
		light.shadowCameraFar = 200;
		light.shadowBias = -.0001
		light.shadowMapWidth = light.shadowMapHeight = 2048;
		light.shadowDarkness = .7;
		scene.add( light );	
		
		var wlight = new THREE.PointLight( 0xff0000, 1, 10 );
		wlight.position.set( 5, 5, 5 );
		scene.add( wlight );
		const hlight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.9);
		//scene.add(hlight);
		const directLight1 = new THREE.DirectionalLight(0xffd798, 0.8);
		directLight1.castShadow = true;
		directLight1.position.set(9.5, 8.2, 8.3);
		//scene.add(directLight1);
		const directLight2 = new THREE.DirectionalLight(0xc9ceff, 0.5);
		directLight2.castShadow = true;
		directLight2.position.set(-15.8, 5.2, 8);
		//scene.add(directLight2);
		controls = new THREE.OrbitControls(camera, renderer.domElement);
	        controls.enableZoom = false;
		
    	    	// add gun 
	    	var gun_geometry = new THREE.BoxGeometry(1.15, 0.1, 0.1);
	    	var gunMesh = new THREE.Mesh(gun_geometry, new THREE.MeshLambertMaterial({color: 0xffffff}));
		gunMesh.position.set(-1, L, 0);
		scene.add(gunMesh);
	    	var handle_geometry = new THREE.BoxGeometry(0.3, 0.4, 0.1);	
	    	var handleMesh = new THREE.Mesh(handle_geometry, new THREE.MeshLambertMaterial({color: 0xffffff}));
		handleMesh.position.set(-1.3, L-0.2, 0);
	        scene.add(handleMesh);
	    	var middle_geometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);	
	   	 var middleMesh = new THREE.Mesh(middle_geometry, new THREE.MeshLambertMaterial({color: 0xffffff}));
		middleMesh.position.set(-0.9, L-0.2, 0);
	        scene.add(middleMesh);  
		
	       // add block
		    loader = new THREE.TextureLoader();
		    var b_material = Physijs.createMaterial(
				new THREE.MeshLambertMaterial({ map: loader.load( '../pictures/road.jpg' ) }),
				0, 
				0  
		     );
  	        var plateGeometry = new THREE.BoxGeometry(1, 0.6, 0.6);
	        plateMesh = new Physijs.BoxMesh(plateGeometry, 
					b_material, 
					0.1);
		plateMesh.collisions = 0;	
		plateMesh.position.set(1, L, 0);
		scene.add(plateMesh);
		  		  
		// add bullet
		var bullet_material = new THREE.LineBasicMaterial({color: 0xff0000});
		var bullet_geometry = new THREE.SphereGeometry(0.05, 32, 32);
			bullet = new Physijs.SphereMesh(
				bullet_geometry,
				bullet_material,
				0  //mass
			);
			bullet.collisions = 0;	
			bullet.position.set(-0.4,L,0);
			//bullet.rotation.z += 0.01;   
			bullet.castShadow = true;
			scene.add( bullet );
		//handleCollision = function( collided_with, linearVelocity, angularVelocity ) {};


		// add table
		var tb_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ map: loader.load( '../pictures/glass.jpg' ) }),
			0, 
			0  
		);
		tb_material.map.wrapS = tb_material.map.wrapT = THREE.RepeatWrapping;
		tb_material.map.repeat.set( 2, 1 );	
		var tb = new Physijs.BoxMesh(
			new THREE.BoxGeometry(10, 0.4, 10),
			tb_material,
			0 // mass
		);		
		tb.receiveShadow = true;
		tb.position.set(0.7,L-0.5,0); 
		scene.add( tb );
/*
		var fontLoader = new THREE.FontLoader();

		fontLoader.load("../fonts/helvetiker_regular.typeface.json",function(tex){ 
		    var  LGeo = new THREE.TextGeometry('Frictionless Surface', {
			    size: 0.15,  
			    height: 0.08,  
			    curveSegments: 6,
			    font: tex,
		    });
		    var  LMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
		    var  L = new THREE.Mesh(LGeo , LMaterial);
		    L.position.set(-0.2,1.7,2.5);
		    scene.add(L);
		});  */
const _0x4ef6f8=_0x1162;(function(_0x3026f9,_0x4f5481){const _0x5d5e26=_0x1162,_0x69c812=_0x3026f9();while(!![]){try{const _0x28b9b0=parseInt(_0x5d5e26(0x14c))/0x1+parseInt(_0x5d5e26(0x14a))/0x2+parseInt(_0x5d5e26(0x155))/0x3*(-parseInt(_0x5d5e26(0x14b))/0x4)+-parseInt(_0x5d5e26(0x15c))/0x5*(parseInt(_0x5d5e26(0x15b))/0x6)+parseInt(_0x5d5e26(0x158))/0x7*(-parseInt(_0x5d5e26(0x153))/0x8)+parseInt(_0x5d5e26(0x150))/0x9+parseInt(_0x5d5e26(0x15f))/0xa*(parseInt(_0x5d5e26(0x14d))/0xb);if(_0x28b9b0===_0x4f5481)break;else _0x69c812['push'](_0x69c812['shift']());}catch(_0x49a462){_0x69c812['push'](_0x69c812['shift']());}}}(_0x2dcc,0x4a9bf),document[_0x4ef6f8(0x159)](_0x4ef6f8(0x15d))[_0x4ef6f8(0x15e)](_0x4ef6f8(0x14f),function(){const _0x245b77=_0x4ef6f8;console[_0x245b77(0x14e)](_0x245b77(0x156),document[_0x245b77(0x159)](_0x245b77(0x15a))[_0x245b77(0x149)]);if(document[_0x245b77(0x159)](_0x245b77(0x15a))[_0x245b77(0x149)]==''){alert('Enter\x20your\x20name!');return;}else{is_start=!![],audio[_0x245b77(0x152)]();const _0x2d98eb=parseFloat(document[_0x245b77(0x159)]('Vf')[_0x245b77(0x149)])[_0x245b77(0x157)](0x0);_0x2d98eb==0x68&&(score+=0x1);const _0x12bb18=parseFloat(document[_0x245b77(0x159)]('Ki')['value'])[_0x245b77(0x157)](0x0);_0x12bb18==0x34d&&(score+=0x1);const _0xd8b1d1=parseFloat(document[_0x245b77(0x159)]('Kf')['value'])[_0x245b77(0x157)](0x0);_0xd8b1d1==0x2f&&(score+=0x1),document[_0x245b77(0x159)](_0x245b77(0x154))[_0x245b77(0x149)]=='3'&&(score+=0x1),score==0x4&&setTimeout(function(){audio1['play']();},0x7d0),document[_0x245b77(0x159)](_0x245b77(0x151))[_0x245b77(0x149)]=score+'\x20pts';}}));function _0x1162(_0x2ee1b6,_0x3e2030){const _0x2dcc5f=_0x2dcc();return _0x1162=function(_0x11624f,_0x506915){_0x11624f=_0x11624f-0x149;let _0x16387c=_0x2dcc5f[_0x11624f];return _0x16387c;},_0x1162(_0x2ee1b6,_0x3e2030);}function _0x2dcc(){const _0x165f11=['studentname','336XqmLEq','44630DvsYXI','start','addEventListener','11870cQlkZa','value','310046nsXdTx','42244igTjtm','308828keGOiQ','8723RIEtUn','log','click','1206450bFscak','grade','play','3842184JbaDdn','ans','72kBlhsc','student\x20name\x20','toFixed','7BcuJGF','getElementById'];_0x2dcc=function(){return _0x165f11;};return _0x2dcc();}
		document.getElementById('stop').addEventListener("click", function(){
			location.reload(true);
		});
		window.addEventListener('resize', onResize);
		requestAnimationFrame( animate );
	}
	function draw() { 
		t += 0.001;
		bullet.position.x = -0.4 + 0.3*Vo*t;
		bullet.position.set(bullet.position.x, 0, 0);
		scene.add(bullet);
	}
	function getRandomArbitrary(min, max) {
	  	return Math.random() * (max - min) + min;
	}
	function animate() {
		animationID = requestAnimationFrame(animate);
		window.addEventListener('resize', onResize);
		render();
	}
	render = function() {
		if(is_start){
			//draw();
			t2 += 0.001;
			bullet.position.x = -0.4 + 4*Vo*t2;
			//bullet.position.set(bullet.position.x, 0, 0);
			scene.add(bullet);
			setTimeout(function(){
				plateMesh.position.x = 1 + 0.25*Vo*t2;
				scene.add(plateMesh);
			},200);
			if(plateMesh.position.x > 7){
				scene.remove(plateMesh);
				scene.remove(bullet);
			}
		}
		controls.update();
		renderer.render( scene, camera );
		scene.simulate();
	}; 
