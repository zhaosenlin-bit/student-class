/** @author: Thomas Nguyen
** gltf model from https://threejsfundamentals.org/threejs/resources/models/cartoon_lowpoly_small_city_free_pack/scene.gltf
** 2019 **/
function runSimulation() { 
	//plasmaBall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
	plasmaBall = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 20), new THREE.MeshBasicMaterial({
	    color: "red" 
	    }));
	    
	plasmaBalls.push(plasmaBall);
	emitter = new THREE.Object3D();
	emitter.position.set(0,5,0); 
	weapon.add(emitter);
	plasmaBall.position.copy(emitter.getWorldPosition()); 
	plasmaBall.quaternion.copy(weapon.quaternion); 
	scene.add(plasmaBall);
	if(audioBoolean){
	    audio1.play();
		audioBoolean=false;
	}
}
function checkCollision() {
        plasmaBalls.forEach(function (plasmaBall) {
            plasmaBall.material.transparent = false;
            plasmaBall.material.opacity = 1.0;
        });
        //var cube = scene.getObjectByName("planetmoon");  moon=cube
        var originPoint = moon.position.clone();
        for (var vertexIndex = 0; vertexIndex < moon.geometry.vertices.length; vertexIndex++) {
            var localVertex = moon.geometry.vertices[vertexIndex].clone();
            var globalVertex = localVertex.applyMatrix4(moon.matrix);
            var directionVector = globalVertex.sub(moon.position);
            var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
            var collisionResults = ray.intersectObjects(plasmaBalls);
            if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
		    if(audioBoolean2){
		    	    audio2.play();
			    audioBoolean2=false;
		    }
		    scene.remove( collisionResults[0].object );
		    scene.remove(moon);
		    //removeEntity(moon);
                    collisionResults[0].object.material.transparent = true;
                    collisionResults[0].object.material.opacity = 0.4;
		    document.getElementById('result').value=document.getElementById('studentname').value+" passed the test";  
		  /*  if(alertBoolean){
		    	    alert(document.getElementById("studentname").value + " passed the test with a computed angle of ("
				  + document.getElementById("angel").value + " degrees)" );
			    alertBoolean=false;
		    }   */
            }
        }
} 
function Check(){
	if ((parseFloat(document.getElementById("angel").value) > 16.9) && (parseFloat(document.getElementById("angel").value) < 23.1)){
		document.getElementById("hide-show").style.display = "block";
	}else{
		alert("Your computation is wrong.");
	}
}
function updateTextInput(val) {
          document.getElementById('velocitySlider').value=val; 
}
function updateAngleInput(val) {
          document.getElementById('angleSlider').value=val; 
}
function changeAngle(e){
	var target = (e.target) ? e.target : e.srcElement;
	angle = 1.57 - target.value;
	weapon.rotation.z = -angle; 
	degree = 90 - angle*180/Math.PI;
	degree = degree.toFixed(1);
        document.getElementById('output1').innerHTML = degree;
}
function changeVo(e){
	var target = (e.target) ? e.target : e.srcElement;
	Vo = (target.value);
	speed = Vo*100;
	speed = speed.toFixed(1);
        document.getElementById('output2').innerHTML = speed; 	
}
function onResize() {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
function onMouseDown() {
	mouseDown = true;
}
function rad(degrees) {
  return degrees * (Math.PI / 180);
}	
function removeEntity(object) {
    var selectedObject = scene.getObjectByName(object.name);
    scene.remove( selectedObject );
    animate();
}
function addLights() {
	  var wlight = new THREE.PointLight( 0xff0000, 1, 10 );
	  wlight.position.set( 5, 5, 5 );
	  scene.add( wlight );
	  const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.9);
	  scene.add(light);
	  const directLight1 = new THREE.DirectionalLight(0xffd798, 0.8);
	  directLight1.castShadow = true;
	  directLight1.position.set(9.5, 8.2, 8.3);
	  scene.add(directLight1);
	  const directLight2 = new THREE.DirectionalLight(0xc9ceff, 0.5);
	  directLight2.castShadow = true;
	  directLight2.position.set(-15.8, 5.2, 8);
	  scene.add(directLight2);
}
function drawCannon() {
  cannon = new Cannon();
  scene.add(cannon.group);
}
function drawCloud() {
  cloud = new Cloud();
  scene.add(cloud.group);
}

class Cannon {		
	  constructor() {
	    this.group = new THREE.Group();
	    this.group.position.y = 0.4;
	    this.group.position.x = 0; 

	    this.woolMaterial = new THREE.MeshStandardMaterial({
	      color: 0xffffff,
	      roughness: 1,
	      shading: THREE.FlatShading
	    });
	    this.skinMaterial = new THREE.MeshStandardMaterial({
	      color: 0xffaf8b,
	      roughness: 1,
	      shading: THREE.FlatShading
	    });
	    this.darkMaterial = new THREE.MeshStandardMaterial({
	      color: 0x4b4553,
	      roughness: 1,
	      shading: THREE.FlatShading
	    });

	    this.vAngle = 0;

	    this.drawCannon();
	  }
          drawCannon() {
		slider = document.getElementById("angleSlider");
		angleSlider.addEventListener("input", changeAngle);
		//vel_slider = document.getElementById("velocitySlider");
		//velocitySlider.addEventListener("input", changeVo); 
		const gltfLoader = new THREE.GLTFLoader();  
		const url = 'https://threejsfundamentals.org/threejs/resources/models/cartoon_lowpoly_small_city_free_pack/scene.gltf';
		      gltfLoader.load(url, (gltf) => {
			   gltf.scene.scale.set(0.01,0.01,0.01);
			   gltf.scene.position.set(-15,-5,0); 
			   //gltf.scene.rotation.y += 0.2;
			   const root = gltf.scene;
			   scene.add(root);
		      });     
	
		weapon = new THREE.Mesh( new THREE.CylinderGeometry( 0.5, 0.6, 5, 32 ), 
					new THREE.MeshBasicMaterial({color:  0x556B2F }));

		weapon.position.set(-14,-1,0.75); 
		weapon.rotateZ(-Math.PI * 0.5); 
		this.group.add(weapon); 
		const rightWheel = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32); 
		rightWheel.translate(0, -0.25, 0); 

		this.rightwheel = new THREE.Mesh(rightWheel, new THREE.MeshBasicMaterial({color: 0x808000 }));
						 //this.skinMaterial);
		this.rightwheel.castShadow = true;
		this.rightwheel.receiveShadow = true;
		this.rightwheel.position.set(0.25, -0.12, 0.35); //x=0.25
		this.rightwheel.rotateX(-Math.PI * 0.5); 
		weapon.add(this.rightwheel);
		this.leftwheel = this.rightwheel.clone();
		this.rightwheel.position.set(0.25, -0.12, -0.8);
		weapon.add(this.leftwheel);

		var quaternion = new THREE.Quaternion();
		quaternion.setFromAxisAngle( new THREE.Vector3( 0, 5, 0.75 ), Math.PI / 2 );
		var vector = new THREE.Vector3( 1, 0, 0.75 );
		vector.applyQuaternion( quaternion );
		/*
		document.getElementById("shoot").addEventListener("click", runSimulation); 

		function runSimulation() {
		    plasmaBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 20), new THREE.MeshBasicMaterial({
		    color: "aqua"
		    }));
			//plasmaBall.position.set(0,2,0);
			plasmaBall.position.copy(emitter.getWorldPosition()); 
			plasmaBall.quaternion.copy(weapon.quaternion); 
			scene.add(plasmaBall);
			plasmaBalls.push(plasmaBall);
		}
			     */
		clock = new THREE.Clock();
		(function render() {
			  requestAnimationFrame(render); 
			  plasmaBalls.forEach(b => {  
				  //Vox = Vo*Math.cos(angle);
				  //Voy = Vo*Math.sin(angle);
				  Vox = 10*Math.cos(angle);
				  Voy = 10*Math.sin(angle);
				  delta = clock.getElapsedTime(); 
				  if(degree < 0){
					posx = -Vox*delta/4;  
					posy = Voy*delta - 9.5*delta*delta;
					//b.position.set(posx,posy,0);
					b.translateY(posy);
					b.translateX(posx);
					b.translateZ(0);	
				  }else{
					posx = Vox*delta/4;  
					posy = Voy*delta - 9.5*delta*delta;
					b.translateY(posy);
					b.translateX(posx);
					b.translateZ(0); 
				  }
			   });	
		  })()     			    
	  } // end drawcannon()
}//end class Cannon

class Cloud {
	  constructor() {
	    this.group = new THREE.Group();
	    this.group.position.y = -2;
	    this.group.scale.set(1.5, 1.5, 1.5);

	    this.material = new THREE.MeshStandardMaterial({
		      color: 0xacb3fb,
		      roughness: 1,
		      shading: THREE.FlatShading
	    });

	    this.vAngle = 0;

	    this.drawParts(); 
	    this.group.traverse((part) => {
		      part.castShadow = true;
		      part.receiveShadow = true;
	    });
	  } 
	
	  drawParts() {  
		// create a alien moon and add to scene
		// var moonGeometry = new THREE.SphereGeometry(20,50,50); 
		const moonGeo = new THREE.IcosahedronGeometry(1.4, 0);
		var moonMaterial = new THREE.MeshPhongMaterial({
			  map: THREE.ImageUtils.loadTexture("../Simulation/images/moon.png")
		});
                moon = new THREE.Mesh(moonGeo, moonMaterial); 
		//var cubeGeometry = PolygonGeometry(6,11);
		//var cubeMaterial = new THREE.MeshLambertMaterial({color: 0xf0f0f0});
		//moon = new THREE.Mesh(cubeGeometry, cubeMaterial); 
		moon.name = "planetmoon";
		moon.position.set(17,10,1); 
                moon.__dirtyPosition = true;  
  		moon.verticesNeedUpdate = true; //test
		scene.add(moon);   
	  } 
} 
	
function animate() {
  moon.rotation.y += 0.06; 
  moon.rotation.z += 0.001; 
  moon.__dirtyRotation = true;
  requestAnimationFrame(animate);
  controls.update();
  render();
}  
function render() {
  theta += dTheta;
  moon.position.x = -r * Math.cos(theta);
  moon.position.z = r * Math.sin(theta);
  checkCollision();
  renderer.render(scene, camera);
}
