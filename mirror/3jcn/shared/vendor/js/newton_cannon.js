var camera, scene, renderer, geometry, m_geometry, material, mesh, m, a, d, force, mover, attractor, width, height;

	// Boolean for start and restart
	var isPlay = false;

	var speed, animationID, value, numLoop;
	var theta = 0;
	var i = 0;
	var G = 6.67e-11;	
	var M = 5.972e24; // Earth's Mass
	var R = 6.371e6;   // Earth's Radius
	var mb = 5;  // mass of cannon's ball
		
	var textureloader = new THREE.TextureLoader();
	const texture = textureloader.load('images/earth.png');
	material = new THREE.MeshBasicMaterial({   // for Earth
	        map: texture,
	});
	var m_material = new THREE.MeshNormalMaterial();  // for the Cannon Ball
		
	initScene = function() {
	    width = window.innerWidth;
	    height = window.innerHeight;	
	    scene = new THREE.Scene();
	    camera = new THREE.PerspectiveCamera(
      			35,
      			window.innerWidth / window.innerHeight,
      			1,
      			1000
		  );
	    camera.position.set( 60, 50, 60 );  
	    camera.lookAt( scene.position );	
	    scene.add(camera);
		   
	    a = new Attractor();
	    m = new Mover();
		
	    // add Earth
	    geometry = new THREE.SphereGeometry(20, 40, 40);
	    mesh = new THREE.Mesh(geometry, material);
	    mesh.position.set(0,0,0);
	    scene.add(mesh);
		
	    // add cannon
	    var cannon = new THREE.Mesh( new THREE.CylinderGeometry( 0.3, 0.4, 2, 32 ), 
					 new THREE.MeshBasicMaterial({color:  0x556B2F }));
	    cannon.position.set(0,23,0); 
	    cannon.rotateZ(-Math.PI/2);
	    scene.add(cannon);
		
	    // add cannon's base: cone shape
	    var base = new THREE.Mesh( new THREE.ConeGeometry( 2, 3.2, 6 ), 
				new THREE.MeshBasicMaterial({color:  0xD2691E }));
	    base.position.set(0,21.6,0); 
	    scene.add(base);
		
	    renderer = new THREE.WebGLRenderer({ alpha: true }); 
	    renderer.setPixelRatio(window.devicePixelRatio);
	    renderer.setSize( width, height );
	    renderer.shadowMap.enabled = true;
	    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	    controls = new THREE.OrbitControls(camera, renderer.domElement);
	    controls.enableZoom = false;
	    world = document.querySelector('.world');
	    world.appendChild(renderer.domElement);
	    document.getElementById("startButtonId").addEventListener('click', StartAnimation);
            document.getElementById("resetButtonId").addEventListener('click', function(){location.reload();});	
	    requestAnimationFrame( render );
	}
        function StartAnimation() {	  
		isPlay = true;
	}
	function updateTextInput(val) {
          	document.getElementById('textInput').value = val; 
        }
	function onResize() {
		  width = window.innerWidth;
		  height = window.innerHeight;
		  camera.aspect = width / height;
		  camera.updateProjectionMatrix();
		  renderer.setSize(width, height);
	}	
	function changeSpeed(e){
		  var target = (e.target) ? e.target : e.srcElement;
		  speed = (target.value)/1000;
	}
	function render() {			
	        theta += 0.001;
		mesh.rotation.y = theta;
		animationID = requestAnimationFrame(render);	
		renderer.render(scene, camera);
		window.addEventListener('resize', onResize);
		controls.update();
		
		if(isPlay == true){	
  		        value = parseFloat(document.getElementById('textInput').value);
			var slider = document.getElementById("scale");
			speed = slider.value/1000;
		        m.velocity.x += speed;
		       
			if (value == 7300) {
			    numLoop = 347;
			} else if (value < 7300) {
			    numLoop = 55;
			} else {
			    numLoop = 200;
			}
			if(i < numLoop){
				scene.remove(mover);
				force = a.attract(m);
				m.applyForce(force);
				m.update();
				m.drawMover();
				i++;	
			} else {
				if(value < 7300) {
			                scene.remove(mover);
			                //m.rotateAroundY();
				}
		        }
		}	// end if(isPlay)
	}    // end function render()

	class Mover {  // cannon's ball
		  constructor() {		  
			  this.position = new THREE.Vector3(0,23,0);  
			  this.velocity = new THREE.Vector3(0.36,0,0); 
			  this.acceleration = new THREE.Vector3(0,0,0);
			  this.mass = mb;
			  this.drawMover();
		  }
		  applyForce(force) {
			    var f = force.divideScalar(this.mass);
			    this.acceleration = this.acceleration.add(f);
		  }
		  update() {
			    this.position = this.position.add(this.velocity);
			    this.velocity = this.velocity.add(this.acceleration);
			    this.acceleration = this.acceleration.multiplyScalar(0); 
		  }
		  drawMover() {	// draw cannon's ball
			    m_geometry = new THREE.SphereGeometry( 0.3, 32, 32 );
			    mover = new THREE.Mesh( m_geometry, m_material);
			    mover.position.set(this.position.getComponent(0),this.position.getComponent(1),this.position.getComponent(2));
			    scene.add(mover);
		  }
		    rotateAroundY() {
		        var self = this;
		        function rotate() {
		            self.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.000001);
		            mover.position.set(self.position.x, self.position.y, self.position.z);
		            requestAnimationFrame(rotate);
		        }
		        rotate();
		    }

	} // end of class of mover

	class Attractor {   // Earth

		constructor() {
		    this.mass = M;    // Mass, tied to size
		    this.position = new THREE.Vector3(0,0,0); 
		    this.drawAttractor();
		  }		
		  attract(m) {
			    //var force = dir.subVectors( this.position, m.position ).normalize();
			    var forc = (this.position).sub(m.position);     // Calculate direction of force
			    d = (this.position).distanceTo(m.position );   // Distance between Earth and Ball
			    var dist = 37*R; //d*R;		    
			    //forc.normalize();  // Normalize vector we just want this vector for direction
			    var strength = (G * this.mass * m.mass) / (dist * dist);     // Calculate gravitional force magnitude
			    forc = forc.normalize().multiplyScalar(strength);     // Get force vector --> magnitude * direction	  
			    return forc;
		  }
		  drawAttractor() {   // Draw Earth
			  attractor = new THREE.Mesh( new THREE.SphereGeometry( 20,40,40 ), material);
		          attractor.position.set(this.position.getComponent(0),
						 this.position.getComponent(1),
						 this.position.getComponent(2));
			  //scene.add(attractor);
		  }
	}  // end class attractor
		

	window.onload = initScene;
