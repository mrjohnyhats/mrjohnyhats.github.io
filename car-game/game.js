class Game{
	constructor(){
		if (!Detector.webgl){
			Detector.addGetWebGLMessage();
		}
		
		this.stats;
		this.debug = true;
		this.debugPhysics = false;
		this.fixedTimeStep = 1.0/60.0;

		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
		this.camera.position.set( 0, 20, 10 );

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0x66aaff );
		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;

		this.config = new Config()

		this.container = document.createElement('div');
		this.container.style.height = '100%';
		document.body.appendChild( this.container );
		this.container.appendChild( this.renderer.domElement );
		
				
		this.js = {
			forward:0,
			turn:0,
			eBrake: false,
			reversing: false
		};

		this.clock = new THREE.Clock();

		this.helper = new CannonHelper(this.scene);
        this.addLights();
        
		window.addEventListener('resize', ()=>{ this.onWindowResize(); }, false );
		window.addEventListener('keydown', this.keydown.bind(this))
		window.addEventListener('keyup', this.keyup.bind(this))

		this.config.setListeners()
		

		// stats
		if (this.debug){
			this.stats = new Stats();
			this.container.appendChild( this.stats.dom );
		}

		this.proxies = {}
		this.checkpoints = []
		this.assets;
		this.car = {}
		this.obstacles = []
		this.points = 0


		this.loadAssets(this.initPhysics.bind(this));
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}
	}

	loadAssets(afterCB){
		const loader = new THREE.FBXLoader()

		this.car = {
			wheels: []
		}


		loader.load('assets/stang_2.fbx', (object)=>{
			object.traverse((child)=>{
				if(child.name == 'body'){
					this.car.chassis = child
					this.car.chassis.castShadow = true
				} else if(child.name.includes('Wheel')){
					for(var i = 1; i <= 4; i++){
						if(child.name.includes(i.toString())){
							this.car.wheels[i-1] = child
						}
					}
				}
			})
			this.scene.add(object)
			afterCB()
			// this.scene.add(object)
			// loader.load('assets/ramp.fbx', (object)=>{
			// 	this.ramp = new CustomObject({mass: 100, scale: new CANNON.Vec3(2,2,2)})
			// 	var colliderData = []
			// 	object.traverse((child)=>{
			// 		if(child.name == 'Ramp'){
			// 			this.ramp.setMesh(child)
			// 			this.rampCollider = new CANNON.Body({mass: 100})
			// 			this.rampCollider.addShape(makeRampShape())
			// 			this.rampCollider.threemesh = child
			// 		}
			// 		//  else if(child.name.includes('Collider')){
			// 		// 	child.isVisible = false
			// 		// 	colliderData.push(boxDataFromMesh(child))
			// 		// }
			// 	})
			// 	// this.ramp.setColliderData(colliderData)
			// 	afterCB()
			// })
		})
	}

	addLights(){
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        // LIGHTS
        const ambient = new THREE.AmbientLight( 0x888888 );
        this.scene.add( ambient );

        const light = new THREE.DirectionalLight( 0xdddddd );
        light.position.set( 3, 10, 4 );
        light.target.position.set( 0, 0, 0 );

        light.castShadow = true;

        const lightSize = this.config.lightSize;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = lightSize;
        light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
        light.shadow.camera.right = light.shadow.camera.top = lightSize;

        light.shadow.mapSize.width = this.config.shadowMapSize;
        light.shadow.mapSize.height = this.config.shadowMapSize;

        this.sun = light;
        this.scene.add(light);

        this.config.setSMChangeHandlerCB((n)=>{
        	this.sun.shadow.mapSize.width = n
        	this.sun.shadow.mapSize.height = n
        	this.sun.shadow.map.dispose()
        	this.sun.shadow.map = null
        	console.log(this.sun.shadow.mapSize.height)
        })
        this.config.setLSChangeHandlerCB((n)=>{
        	this.sun.shadow.camera.far = n
        	this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = n*-1
        	this.sun.shadow.camera.right = this.sun.shadow.camera.top = n
        })
    }
	
	initPhysics(){		
        const world = new CANNON.World();
		this.world = world;
		
		world.broadphase = new CANNON.SAPBroadphase(world);
		world.gravity.set(0, -10, 0);
		world.defaultContactMaterial.friction = 1;

		const groundMaterial = new CANNON.Material("groundMaterial");
		const wheelMaterial = new CANNON.Material("wheelMaterial");
		const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
			friction: 0.01,
			restitution: 0
		});

		// We must add the contact materials to the world
		world.addContactMaterial(wheelGroundContactMaterial);

		// const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
		const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 1, 4));
		// const chassisBody = new CANNON.Body({ mass: 150, material: groundMaterial });
		const chassisBody = new CANNON.Body({ mass: 3000, material: groundMaterial });
		chassisBody.addShape(chassisShape);
		chassisBody.position.set(0, 10, 0);
		// this.helper.addVisual(chassisBody, 'car');
		chassisBody.threemesh = this.car.chassis
		
        this.helper.shadowTarget = chassisBody.threemesh;

		const options = {
			radius: 0.75,
			directionLocal: new CANNON.Vec3(0, -1, 0),
			suspensionStiffness: 50,
			suspensionRestLength: 0.3,
			frictionSlip: 5,
			dampingRelaxation: 2.3,
			dampingCompression: 4.4,
			maxSuspensionForce: 100000,
			rollInfluence:  0.1,
			axleLocal: new CANNON.Vec3(-2, 0, 0),
			// axleLocal: new CANNON.Vec3(-1, 0, 0),
			chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
			maxSuspensionTravel: 0.3,
			customSlidingRotationalSpeed: 3,
			// customSlidingRotationalSpeed: -30,
			useCustomSlidingRotationalSpeed: true
			// useCustomSlidingRotationalSpeed: true
		};

		// Create the vehicle
		const vehicle = new CANNON.RaycastVehicle({
			chassisBody: chassisBody,
			indexRightAxis: 0,
			indexUpAxis: 1,
			indexForwardAxis: 2
		});

		options.chassisConnectionPointLocal.set(2, -0.5, -3);
		vehicle.addWheel(options);

		options.chassisConnectionPointLocal.set(-2, -0.5, -3);
		vehicle.addWheel(options);

		options.chassisConnectionPointLocal.set(2, -0.5, 3);
		vehicle.addWheel(options);

		options.chassisConnectionPointLocal.set(-2, -0.5, 3);
		vehicle.addWheel(options);

		vehicle.addToWorld(world);

		const wheelBodies = [];
		vehicle.wheelInfos.forEach((wheel, i)=>{
			let wheelBody
			if(i == 2 || i == 4){
				wheelBody = makeWheelBody(wheel, wheelMaterial, 'left')
			} else {
				wheelBody = makeWheelBody(wheel, wheelMaterial, 'left')
			}
			wheelBody.threemesh = this.car.wheels[i]
			wheelBodies.push(wheelBody);

		});

		// Update wheels
		world.addEventListener('postStep', ()=>{
			let index = 0;
			this.vehicle.wheelInfos.forEach((wheel)=>{
            	this.vehicle.updateWheelTransform(index);
                const t = wheel.worldTransform;
                wheelBodies[index].threemesh.position.copy(t.position);
                wheelBodies[index].threemesh.quaternion.copy(t.quaternion);
				index++; 
			});
		});
		
		this.vehicle = vehicle;

		var plane = makePlane(groundMaterial)
		world.add(plane);
		this.helper.addVisual(plane, 'plane', new THREE.MeshLambertMaterial({color: 0x55ff55}));

		const boxMaterial = new CANNON.Material('boxMaterial')
		const boxGroundContactMaterial = new CANNON.ContactMaterial(boxMaterial, groundMaterial, {
			friction: 0.02,
			restitution: 0.5
		})
		world.addContactMaterial(boxGroundContactMaterial)

		for(var i = 0; i < 50; i++){
			var box = makeCubeObstacle(
				new CANNON.Vec3(Math.random()*220-110,30+Math.random()*60,Math.random()*220-110), 
				new CANNON.Vec3(Math.random()*6+1,Math.random()*6+1,Math.random()*6+1),
				{mass: Math.random()*300+100, material: boxMaterial}
			)
			this.obstacles.push(box)
			world.add(box)
			var randColor = makeRandColor()
			this.helper.addVisual(box, 'box'+i, new THREE.MeshLambertMaterial({color: randColor}))
		}

		// var ramp = makeRampShape()
		// var rampBody = new CANNON.Body({mass: 100})
		// rampBody.position = new CANNON.Vec3(0,20,0)
		// rampBody.addShape(ramp)
		// this.world.add(rampBody)


		// this.world.add(this.ramp.body)
		// this.ramp.body.position = new CANNON.Vec3(0,20,0)
		// this.ramp.body.threemesh.material = new THREE.MeshPhongMaterial({color: makeRandColor()})
		// this.scene.add(this.ramp.body.threemesh)
		// this.obstacles.push(this.ramp.body)
		
		// this.rampCollider.position = new CANNON.Vec3(3,20,0)
		// this.rampCollider.threemesh.material = new THREE.MeshPhongMaterial({color: makeRandColor()})
		// this.rampCollider.threemesh.visible = false
		// this.world.add(this.rampCollider)
		// this.scene.add(this.rampCollider.threemesh)
		// this.obstacles.push(this.rampCollider)
		
		if(this.debugPhysics){
			this.debugRenderer = new THREE.CannonDebugRenderer(this.scene, world)
		}
		console.log(this.vehicle)
		this.animate();
	}

	keydown(evt){
		if(evt.code == 'KeyW'){
			this.js.forward = 1
		}
		if(evt.code == 'KeyS'){
			this.js.forward = -1
		}
		if(evt.code == 'KeyE'){
			this.js.eBrake = true
		}
		if(evt.code == 'KeyA'){
			this.js.turn = 0.5
		}
		if(evt.code == 'KeyD'){
			this.js.turn = -0.5
		}
	}

	keyup(evt){
		if(evt.code == 'KeyS' || evt.code == 'KeyW'){
			this.js.forward = 0
		}
		if(evt.code == 'KeyA' || evt.code == 'KeyD'){
			this.js.turn = 0
		}
		if(evt.code == 'KeyE'){
			this.js.eBrake = false
		}
	}
		
    updateDrive(forward=this.js.forward, turn=this.js.turn, eBrake=this.js.eBrake, reversing=this.js.reversing){
		const gearForces = [
			{
				speed: 0,
				force: 6000
			},
			{
				speed: 12,
				force: 9000
			},
			{
				speed: 20,
				force: 11000
			},
			{
				speed: 30,
				force: 12000
			},
			{
				speed: 40,
				force: 16000
			},
			{
				speed: 55,
				force: 20000
			}
		]
		const speed = this.vehicle.chassisBody.velocity.length()

		const maxSteerVal = 0.8;
		// const maxSteerVal = 0.5;
        // const maxForce = 8000;
        const brakeForce = 200;
        const reverseForce = -3000
		 
		// const force = maxForce * forward;
		const steer = maxSteerVal * turn;


		const releaseBrake = ()=>{
			this.vehicle.setBrake(0, 0);
			this.vehicle.setBrake(0, 1);
			this.vehicle.setBrake(0, 2);
			this.vehicle.setBrake(0, 3);
		}

		const killEngine = () =>{
			this.vehicle.applyEngineForce(0, 2);
			this.vehicle.applyEngineForce(0, 3);
			this.vehicle.applyEngineForce(0, 1);
			this.vehicle.applyEngineForce(0, 0);
		}

		const applyAWD = ()=>{
			//get force based on speed
			var i = 0
			var gear = gearForces[i]
			while(i < gearForces.length-1 && gearForces[i+1].speed < speed){
				i++
				gear = gearForces[i]
			}

			this.vehicle.applyEngineForce(gear.force, 2);
			this.vehicle.applyEngineForce(gear.force, 3);
			this.vehicle.applyEngineForce(gear.force, 1);
			this.vehicle.applyEngineForce(gear.force, 0);
			this.js.reversing = false
		}

		const brake = ()=>{
			this.vehicle.setBrake(brakeForce, 0);
			this.vehicle.setBrake(brakeForce, 1);
			this.vehicle.setBrake(brakeForce, 2);
			this.vehicle.setBrake(brakeForce, 3);
			this.js.reversing = false
		}

		const reverse = ()=>{
			this.vehicle.applyEngineForce(reverseForce, 0)
			this.vehicle.applyEngineForce(reverseForce, 1)
			this.vehicle.applyEngineForce(reverseForce, 2)
			this.vehicle.applyEngineForce(reverseForce, 3)
			this.js.reversing = true
		}

		if (forward > 0){
			releaseBrake()
			applyAWD()
	 	} else if(forward < 0){
	 		if(parseInt(this.vehicle.chassisBody.velocity.length()) != 0 && !reversing){
				brake()
			} else {
				releaseBrake()
				reverse()
			}
		} else {
			releaseBrake()
			killEngine();
		}

		if(eBrake){
			this.vehicle.applyEngineForce(0, 2);
			this.vehicle.applyEngineForce(0, 3);

			this.vehicle.setBrake(brakeForce, 2);
			this.vehicle.setBrake(brakeForce, 3);
		}
		
		this.vehicle.setSteeringValue(steer, 0);
		this.vehicle.setSteeringValue(steer, 1);
	}
	
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	updateCamera(){
		var lookAtPos = this.vehicle.chassisBody.threemesh.position.clone()
		this.camera.lookAt(lookAtPos);
		var cameraPos = lookAtPos.clone()
		cameraPos.y += 15
		// this.camera.position.copy(cameraPos.x)
		// console.log(this.vehicle.wheelInfos[0].directionWorld.x)
		// console.log(this.vehicle.wheelInfos[0].directionLocal)
		// updatePointCounter(this.vehicle.chassisBody.quaternion.y)
		var sqd = (n) => n*n
		var round4d = (n) => parseInt(n*10000)/10000
		var carQuat = this.vehicle.chassisBody.threemesh.quaternion
		// var carQuat = this.vehicle.chassisBody.quaternion
		var yawSin = round4d(2*(carQuat.y*carQuat.w + carQuat.z*carQuat.x))
		var yawCos = round4d(1 - 2*(sqd(carQuat.y) - sqd(carQuat.z)))	
		cameraPos.x += yawSin*30
		cameraPos.z += yawCos*30
		this.camera.position.lerp(cameraPos, 0.03)

        if (this.sun != undefined){
			this.sun.position.copy( this.camera.position );
			this.sun.position.y += 20;
		}
	}

	increasePoints(){
		this.points++
		updatePointCounter(this.points)
	}

	handleFallingObstacles(){
		var removedIndices = []

		this.obstacles.forEach((o, i)=>{
			if(o.position.y < -50){
				console.log('got rid of obstacle')
				this.world.removeBody(o)
				removedIndices.push(i)
				this.increasePoints()
			}
		})

		removedIndices.forEach((i)=>{
			this.obstacles.splice(i, 1)
		})
	}
								   
	animate() {
		const game = this;
		
		requestAnimationFrame( function(){ game.animate(); } );
		
		const now = Date.now();
		if (this.lastTime===undefined){
			this.lastTime = now;
		}
		const dt = (Date.now() - this.lastTime)/1000.0;
		this.FPSFactor = dt;
		this.lastTime = now;
		
		this.world.step(this.fixedTimeStep, dt);
		this.helper.updateBodies(this.world);

		this.handleFallingObstacles()
		
		this.updateDrive();
		this.updateCamera();
		updateSpeedDisplay(this.vehicle.chassisBody.velocity.length())

		if(this.debugRenderer != undefined && this.debugPhysics){
			this.debugRenderer.update()
		}
		
		this.renderer.render( this.scene, this.camera );

		if (this.stats != undefined){
			this.stats.update();
		}

	}
}

class CustomObject{
	constructor({mesh, colliderData=[], mass=100, scale=new CANNON.Vec3(1,1,1)}={}){
		this.scale = scale
		this.mass = mass
		if(colliderData.length > 0){
			this.setColliderData(colliderData)
		}
		if(mesh != undefined){
			this.setMesh(mesh)
		}
	}
	setMesh(mesh){
		this.mesh = mesh
		this.mesh.geometry.scale(this.scale.x,this.scale.y,this.scale.z)
		this.mesh.castShadow = true
		if(this.body != undefined){
			this.body.threemesh = this.mesh
		}
		window.setTimeout(()=>{console.log(this.body)},500)
	}
	setColliderData(colliderData){
		this.colliderData = colliderData
		this.body = makeColliderBody(colliderData, this.mass, this.scale)
		if(this.mesh != undefined){
			this.body.threemesh = this.mesh
		}
	}
}


class CannonHelper{
    constructor(scene){
        this.scene = scene;
    }
    
    set shadowTarget(obj){
        if (this.sun!==undefined) this.sun.target = obj;    
    }
    
    createCannonTrimesh(geometry){
		if (!geometry.isBufferGeometry) return null;
		
		const posAttr = geometry.attributes.position;
		const vertices = geometry.attributes.position.array;
		let indices = [];
		for(let i=0; i<posAttr.count; i++){
			indices.push(i);
		}
		
		return new CANNON.Trimesh(vertices, indices);
	}
	
	createCannonConvex(geometry){
		if (!geometry.isBufferGeometry) return null;
		
		const posAttr = geometry.attributes.position;
		const floats = geometry.attributes.position.array;
		const vertices = [];
		const faces = [];
		let face = [];
		let index = 0;
		for(let i=0; i<posAttr.count; i+=3){
			vertices.push( new CANNON.Vec3(floats[i], floats[i+1], floats[i+2]) );
			face.push(index++);
			if (face.length==3){
				faces.push(face);
				face = [];
			}
		}
		
		return new CANNON.ConvexPolyhedron(vertices, faces);
	}
    
    addVisual(body, name, material=(new THREE.MeshLambertMaterial({color:0x888888})), castShadow=true, receiveShadow=true){
		body.name = name;
		this.material = material
		if (this.settings === undefined){
			this.settings = {
				stepFrequency: 60,
				quatNormalizeSkip: 2,
				quatNormalizeFast: true,
				gx: 0,
				gy: 0,
				gz: 0,
				iterations: 3,
				tolerance: 0.0001,
				k: 1e6,
				d: 3,
				scene: 0,
				paused: false,
				rendermode: "solid",
				constraints: false,
				contacts: false,  // Contact points
				cm2contact: false, // center of mass to contact points
				normals: false, // contact normals
				axes: false, // "local" frame axes
				particleSize: 0.1,
				shadows: false,
				aabbs: false,
				profiling: false,
				maxSubSteps:3
			}
			this.particleGeo = new THREE.SphereGeometry( 1, 16, 8 );
			this.particleMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
		}
		// What geometry should be used?
		let mesh;
		if(body instanceof CANNON.Body){
			mesh = this.shape2Mesh(body, castShadow, receiveShadow);
		}

		if(mesh) {
			// Add body
			body.threemesh = mesh;
            mesh.castShadow = castShadow;
            mesh.receiveShadow = receiveShadow;
			this.scene.add(mesh);
		}
	}
	
	shape2Mesh(body, castShadow, receiveShadow){
		const obj = new THREE.Object3D();
		const material = this.material
		const game = this;
		let index = 0;
		
		body.shapes.forEach (function(shape){
			let mesh;
			let geometry;
			let v0, v1, v2;

			switch(shape.type){

			case CANNON.Shape.types.SPHERE:
				const sphere_geometry = new THREE.SphereGeometry( shape.radius, 8, 8);
				mesh = new THREE.Mesh( sphere_geometry, material );
				break;

			case CANNON.Shape.types.PARTICLE:
				mesh = new THREE.Mesh( game.particleGeo, game.particleMaterial );
				const s = this.settings;
				mesh.scale.set(s.particleSize,s.particleSize,s.particleSize);
				break;

			case CANNON.Shape.types.PLANE:
				geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
				mesh = new THREE.Object3D();
				const submesh = new THREE.Object3D();
				const ground = new THREE.Mesh( geometry, material );
				ground.scale.set(100, 100, 100);
				submesh.add(ground);

				mesh.add(submesh);
				break;

			case CANNON.Shape.types.BOX:
				const box_geometry = new THREE.BoxGeometry( shape.halfExtents.x*2,
															shape.halfExtents.y*2,
															shape.halfExtents.z*2 );
				mesh = new THREE.Mesh( box_geometry, material );
				break;

			case CANNON.Shape.types.CONVEXPOLYHEDRON:
				const geo = new THREE.BufferGeometry();

				// Add vertices
				var vertices = []
				shape.vertices.forEach(function(v){
					vertices.push(v.x)
					vertices.push(v.y)
					vertices.push(v.z)
					// geo.attributes.position.push(new THREE.Vector3(v.x, v.y, v.z));
				});
				geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))

				var faceIndices = []
				shape.faces.forEach(function(face){
					// add triangles
					const a = face[0];
					for (let j = 1; j < face.length - 1; j++) {
						const b = face[j];
						const c = face[j + 1];
						faceIndices.push(a, b, c);
					}
				});
				geo.setIndex(faceIndices)

				geo.computeBoundingSphere();
				geo.computeVertexNormals();
				mesh = new THREE.Mesh( geo, material );
				break;

			// case CANNON.Shape.types.HEIGHTFIELD:
			// 	geometry = new THREE.Geometry();

			// 	v0 = new CANNON.Vec3();
			// 	v1 = new CANNON.Vec3();
			// 	v2 = new CANNON.Vec3();
			// 	for (let xi = 0; xi < shape.data.length - 1; xi++) {
			// 		for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
			// 			for (let k = 0; k < 2; k++) {
			// 				shape.getConvexTrianglePillar(xi, yi, k===0);
			// 				v0.copy(shape.pillarConvex.vertices[0]);
			// 				v1.copy(shape.pillarConvex.vertices[1]);
			// 				v2.copy(shape.pillarConvex.vertices[2]);
			// 				v0.vadd(shape.pillarOffset, v0);
			// 				v1.vadd(shape.pillarOffset, v1);
			// 				v2.vadd(shape.pillarOffset, v2);
			// 				geometry.vertices.push(
			// 					new THREE.Vector3(v0.x, v0.y, v0.z),
			// 					new THREE.Vector3(v1.x, v1.y, v1.z),
			// 					new THREE.Vector3(v2.x, v2.y, v2.z)
			// 				);
			// 				var i = geometry.vertices.length - 3;
			// 				geometry.faces.push(new THREE.Face3(i, i+1, i+2));
			// 			}
			// 		}
			// 	}
			// 	geometry.computeBoundingSphere();
			// 	geometry.computeFaceNormals();
			// 	mesh = new THREE.Mesh(geometry, material);
			// 	break;

			// case CANNON.Shape.types.TRIMESH:
			// 	geometry = new THREE.Geometry();

			// 	v0 = new CANNON.Vec3();
			// 	v1 = new CANNON.Vec3();
			// 	v2 = new CANNON.Vec3();
			// 	for (let i = 0; i < shape.indices.length / 3; i++) {
			// 		shape.getTriangleVertices(i, v0, v1, v2);
			// 		geometry.vertices.push(
			// 			new THREE.Vector3(v0.x, v0.y, v0.z),
			// 			new THREE.Vector3(v1.x, v1.y, v1.z),
			// 			new THREE.Vector3(v2.x, v2.y, v2.z)
			// 		);
			// 		var j = geometry.vertices.length - 3;
			// 		geometry.faces.push(new THREE.Face3(j, j+1, j+2));
			// 	}
			// 	geometry.computeBoundingSphere();
			// 	geometry.computeFaceNormals();
			// 	mesh = new THREE.Mesh(geometry, MutationRecordaterial);
			// 	break;

			default:
				throw "Visual type not recognized: "+shape.type;
			}

			mesh.receiveShadow = receiveShadow;
			mesh.castShadow = castShadow;
            
            mesh.traverse( function(child){
                if (child.isMesh){
                    child.castShadow = castShadow;
					child.receiveShadow = receiveShadow;
                }
            });

			var o = body.shapeOffsets[index];
			var q = body.shapeOrientations[index++];
			mesh.position.set(o.x, o.y, o.z);
			mesh.quaternion.set(q.x, q.y, q.z, q.w);

			obj.add(mesh);
		});

		return obj;
	}
    
    updateBodies(world){
        world.bodies.forEach( function(body){
            if ( body.threemesh != undefined){
            	// if(body.id == 13){
            	// 	// console.log(body)
            	// }
                body.threemesh.position.copy(body.position);
                body.threemesh.quaternion.copy(body.quaternion);
            }
        });
    }
    cannonToThreeVector(cVec){
    	return new THREE.Vector3(cVec.x,cVec.y,cVec.z)
    }
}