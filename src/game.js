var Game = {
    scene: null,
    camera: null,
    renderer: null,
    plane: null, // will be loaded via GLTFLoader
    landscape: null,
    clouds: [],
    mountains: [],
    landmarks: [],
    obstacles: [],
    bullets: [],
    keys: {}, // store keyboard state
    gameOver: false,
    shootCooldown: 0,
    spaceActive: false, // new property to track space key state
    cameraAngle: 0, // horizontal rotation offset for the camera
    cameraRadius: 10, // new property for zoom control
    lastMouseX: 0,
    mouseControlActive: false,
    backgroundMusic: null,
    init: function() {
        console.log("Initializing Game...");
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Initial camera position; will be updated in animate()
        this.camera.position.set(0, 5, 10);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        var container = document.getElementById('game-container');
        if (!container) {
            console.error("No element with id 'game-container' found!");
        } else {
            container.appendChild(this.renderer.domElement);
        }
        
        // Play background music immediately
        this.backgroundMusic = new Audio("assets/sounds/background.mp3");
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3;
        this.backgroundMusic.play();
        
        // Lighting
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Load a real 3D plane model using GLTFLoader
        var loader = new THREE.GLTFLoader();
        loader.load("assets/models/plane.glb", function(gltf) {
            Game.plane = gltf.scene;
            Game.plane.traverse(function(child) {
                if(child.isMesh) {
                    child.castShadow = true;
                }
            });
            // Increase scale to make the plane bigger.
            Game.plane.scale.set(1.5, 1.5, 1.5);
            Game.plane.position.set(0, 2, 0);
            Game.plane.rotation.y = Math.PI; // Rotate plane 180° so the front faces correctly.
            Game.scene.add(Game.plane);
            console.log("Plane model loaded.");
        }, undefined, function(error) {
            console.error("Error loading plane model:", error);
        });
        
        // Create a static ground mesh as our base landscape.
        var terrainGeometry = new THREE.PlaneGeometry(500, 500, 64, 64);
        terrainGeometry.rotateX(-Math.PI / 2);
        var posAttr = terrainGeometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            let x = posAttr.getX(i);
            let z = posAttr.getZ(i);
            // Create a mild undulation using a sine/cosine pattern.
            let y = Math.sin(x / 10) * Math.cos(z / 10);
            posAttr.setY(i, y);
        }
        terrainGeometry.computeVertexNormals();
        var terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide });
        this.landscape = new THREE.Mesh(terrainGeometry, terrainMaterial);
        this.landscape.receiveShadow = true;
        // Center the ground initially
        this.landscape.position.set(0, 0, 0);
        this.scene.add(this.landscape);
        
        // Add extra objects
        this.addClouds();
        this.addMountains();
        this.addLandmarks();
        this.addObstacles();
        this.bullets = [];
        this.addExtraPlanes();
        
        // Keyboard listeners for movement and shooting
        window.addEventListener('keydown', function(e) {
            Game.keys[e.key] = true;
        });
        window.addEventListener('keyup', function(e) {
            Game.keys[e.key] = false;
        });
        // Mouse listeners for camera control
        window.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                Game.mouseControlActive = true;
                Game.lastMouseX = e.clientX;
            }
        });
        window.addEventListener('mouseup', function(e) {
            if (e.button === 0) {
                Game.mouseControlActive = false;
            }
        });
        window.addEventListener('mousemove', function(e) {
            if (Game.mouseControlActive) {
                let deltaX = e.clientX - Game.lastMouseX;
                Game.cameraAngle += deltaX * 0.005;
                Game.lastMouseX = e.clientX;
            }
        });
        // Add zoom control via mouse wheel
        window.addEventListener('wheel', function(e) {
            // e.deltaY < 0 zooms in; e.deltaY > 0 zooms out.
            Game.cameraRadius += e.deltaY * 0.01;
            // Set limits for zoom
            if (Game.cameraRadius < 5) Game.cameraRadius = 5;
            if (Game.cameraRadius > 20) Game.cameraRadius = 20;
        });
        // Restart button listener
        var restartBtn = document.getElementById('restart-button');
        if (restartBtn) {
            restartBtn.addEventListener('click', function() {
                location.reload();
            });
        }
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.animate();
    },
    addClouds: function() {
        var geometry = new THREE.SphereGeometry(1, 16, 16);
        var material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        for (let i = 0; i < 20; i++) {
            let cloud = new THREE.Mesh(geometry, material);
            cloud.position.set(
                Math.random() * 100 - 50,
                Math.random() * 20 + 10,
                Math.random() * -150
            );
            let scale = Math.random() * 2 + 1;
            cloud.scale.setScalar(scale);
            // Mark clouds as destructible if needed.
            cloud.userData.destructible = true;
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    },
    addMountains: function() {
        var material = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
        for (let i = 0; i < 5; i++) {
            var geometry = new THREE.ConeGeometry(10 + Math.random() * 5, 20 + Math.random() * 10, 4);
            var mountain = new THREE.Mesh(geometry, material);
            mountain.position.set(-200 + i * 100, 10, -200 - Math.random() * 100);
            mountain.castShadow = true;
            // Mountains are indestructible.
            mountain.userData.destructible = false;
            this.scene.add(mountain);
            this.mountains.push(mountain);
        }
    },
    addLandmarks: function() {
        // Trees (indestructible)
        for (let i = 0; i < 10; i++) {
            let trunkGeo = new THREE.CylinderGeometry(0.3, 0.3, 3);
            let trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            let trunk = new THREE.Mesh(trunkGeo, trunkMat);
            let x = Math.random() * 400 - 200;
            let z = Math.random() * 400 - 200;
            trunk.position.set(x, 1.5, z);
            trunk.castShadow = true;
            trunk.userData.destructible = false;
            let foliageGeo = new THREE.ConeGeometry(1.5, 3, 8);
            let foliageMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
            let foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.set(x, 4.5, z);
            foliage.castShadow = true;
            foliage.userData.destructible = false;
            this.scene.add(trunk);
            this.scene.add(foliage);
            this.landmarks.push(trunk, foliage);
        }
        // Houses, cars, farms (destructible)
        for (let i = 0; i < 5; i++) {
            let houseGeo = new THREE.BoxGeometry(4, 3, 4);
            let houseMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
            let house = new THREE.Mesh(houseGeo, houseMat);
            house.position.set(Math.random() * 400 - 200, 1.5, Math.random() * 400 - 200);
            house.castShadow = true;
            house.userData.destructible = true;
            this.scene.add(house);
            this.landmarks.push(house);
        }
        for (let i = 0; i < 8; i++) {
            let carGeo = new THREE.BoxGeometry(2, 1, 4);
            let carMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
            let car = new THREE.Mesh(carGeo, carMat);
            car.position.set(Math.random() * 400 - 200, 0.5, Math.random() * 400 - 200);
            car.castShadow = true;
            car.userData.destructible = true;
            this.scene.add(car);
            this.landmarks.push(car);
        }
        for (let i = 0; i < 3; i++) {
            let farmGroup = new THREE.Group();
            for (let j = 0; j < 4; j++) {
                let farmHouseGeo = new THREE.BoxGeometry(3, 2.5, 3);
                let farmHouseMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
                let farmHouse = new THREE.Mesh(farmHouseGeo, farmHouseMat);
                farmHouse.position.set(j * 5, 1.25, 0);
                farmHouse.castShadow = true;
                farmHouse.userData.destructible = true;
                farmGroup.add(farmHouse);
            }
            farmGroup.position.set(Math.random() * 400 - 200, 0, Math.random() * 400 - 200);
            this.scene.add(farmGroup);
            this.landmarks.push(farmGroup);
        }
    },
    addExtraPlanes: function() {
        // Wait until the main plane is loaded.
        if (!this.plane) {
            setTimeout(() => { this.addExtraPlanes(); }, 500);
            return;
        }
        // Create 3 extra planes by cloning the loaded 3D plane model.
        for (let i = 0; i < 3; i++) {
            // Clone the main plane (deep clone).
            let extraPlane = this.plane.clone(true);
            // Compute a random ground position.
            let posX = Math.random() * 400 - 200;
            let posZ = Math.random() * 400 - 200;
            let groundY = Math.sin(posX / 10) * Math.cos(posZ / 10);
            // For parked planes, set position at ground level; for airborne, add extra altitude.
            if (i % 2 === 0) {
                // Parked on the ground.
                extraPlane.position.set(posX, groundY + 1, posZ);
            } else {
                // Airborne.
                extraPlane.position.set(posX, groundY + (Math.random() * 10 + 5), posZ);
            }
            // Ensure the extra plane is rotated 180° (should be inherited from clone, but enforce if needed).
            extraPlane.rotation.y = Math.PI;
            // Mark as destructible (if you want bullets to destroy them).
            extraPlane.userData.destructible = true;
            this.scene.add(extraPlane);
            // Store in the landmarks array so collisions and bullets apply.
            this.landmarks.push(extraPlane);
        }
    },
    addObstacles: function() {
        var material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        for (let i = 0; i < 10; i++) {
            var geometry = new THREE.SphereGeometry(0.7, 16, 16);
            var obstacle = new THREE.Mesh(geometry, material);
            obstacle.position.set(
                Math.random() * 20 - 10,
                Math.random() * 10 + 1,
                -(50 + Math.random() * 100)
            );
            obstacle.castShadow = true;
            obstacle.userData.destructible = true;
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        }
    },
    shootBullet: function() {
        var geometry = new THREE.SphereGeometry(0.2, 8, 8);
        var material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        var bullet = new THREE.Mesh(geometry, material);
        if (this.plane) {
            bullet.position.copy(this.plane.position);
            bullet.position.z -= 2;
            bullet.velocity = new THREE.Vector3(0, 0, -1);
            this.scene.add(bullet);
            this.bullets.push(bullet);
        }
    },
    updateBullets: function() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let bullet = this.bullets[i];
            bullet.position.add(bullet.velocity);
            if (bullet.position.z < -500) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                continue;
            }
            // Increase collision detection threshold slightly for reliability.
            let targets = this.obstacles.concat(this.landmarks).concat(this.mountains).concat(this.clouds);
            for (let j = targets.length - 1; j >= 0; j--) {
                let target = targets[j];
                if (bullet.position.distanceTo(target.position) < 2.0) {
                    if (target.userData.destructible === false) {
                        this.scene.remove(bullet);
                        this.bullets.splice(i, 1);
                        break;
                    } else {
                        this.repositionTarget(target);
                        this.scene.remove(bullet);
                        this.bullets.splice(i, 1);
                        break;
                    }
                }
            }
        }
    },
    repositionObjects: function() {
        // If an object is behind the plane (z > plane.z + margin) or too far from the plane, reposition it ahead.
        let margin = 20;
        let threshold = 150;
        let reposition = function(obj) {
            if (!Game.plane) return;
            let dist = obj.position.distanceTo(Game.plane.position);
            // Since the plane moves in -z, use object's z relative to plane's z.
            if (obj.position.z > Game.plane.position.z + margin || dist > threshold) {
                // Place the object ahead: new z is a random distance in front of the plane (negative direction).
                let newZ = Game.plane.position.z - (Math.random() * 200 + 100);
                let newX = Game.plane.position.x + (Math.random() * 400 - 200);
                let groundY = Math.sin(newX / 10) * Math.cos(newZ / 10);
                let newY = (obj.position.y > 5) ? Math.random() * 10 + 5 : groundY + 1;
                obj.position.set(newX, newY, newZ);
            }
        };
        Game.obstacles.forEach(reposition);
        Game.landmarks.forEach(reposition);
        Game.mountains.forEach(reposition);
        Game.clouds.forEach(reposition);
    },
    repositionTarget: function(target) {
        if (!this.plane) return;
        let posX = this.plane.position.x + (Math.random() * 400 - 200);
        let posZ = this.plane.position.z + (Math.random() * 400 - 200);
        let groundY = Math.sin(posX / 10) * Math.cos(posZ / 10);
        let newY = (target.position.y > 5) ? Math.random() * 10 + 5 : groundY + 1;
        target.position.set(posX, newY, posZ);
    },
    checkCollisions: function() {
        if (!this.plane) return;
        let planePos = this.plane.position;
        // Combine all objects to check collision
        let allTargets = this.obstacles.concat(this.landmarks).concat(this.mountains).concat(this.clouds);
        for (let i = 0; i < allTargets.length; i++) {
            let target = allTargets[i];
            // Adjust the threshold here if needed to ensure detection on touch.
            if (planePos.distanceTo(target.position) < 2.0) {
                console.log("Collision detected!");
                this.endGame();
                return;
            }
        }
    },
    endGame: function() {
        this.gameOver = true;
        var gameOverEl = document.getElementById('game-over');
        if (gameOverEl) {
            gameOverEl.style.display = 'flex';
        }
        this.backgroundMusic.pause();
    },
    updateControls: function() {
        if (!this.plane) return;
        if (this.keys['ArrowLeft']) {
            this.plane.position.x -= 0.3;
        }
        if (this.keys['ArrowRight']) {
            this.plane.position.x += 0.3;
        }
        if (this.keys['ArrowUp']) {
            this.plane.position.z -= 0.3;
        }
        if (this.keys['ArrowDown']) {
            this.plane.position.z += 0.3;
        }
        if (this.keys['w'] || this.keys['W']) {
            this.plane.position.y += 0.3;
        }
        if (this.keys['s'] || this.keys['S']) {
            this.plane.position.y -= 0.3;
        }
        let currentGround = Math.sin(this.plane.position.x / 10) * Math.cos(this.plane.position.z / 10);
        if (this.plane.position.y < currentGround + 1) {
            this.plane.position.y = currentGround + 1;
        }
        // BULLET SHOOTING LOGIC:
        if (this.keys[' ']) {
            if (this.shootCooldown <= 0) {
                this.shootBullet();
                // Use an initial longer cooldown then burst with reduced cooldown
                this.shootCooldown = this.spaceActive ? 5 : 20;
                this.spaceActive = true;
            }
        } else {
            this.spaceActive = false;
        }
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
    },
    animate: function() {
        if (Game.gameOver) return;
        requestAnimationFrame(() => Game.animate());
        Game.updateControls();
        if (Game.plane) {
            Game.plane.position.z -= 0.2;
        }
        // Recenter the infinite landscape around the plane.
        Game.landscape.position.x = Game.plane ? Game.plane.position.x : 0;
        Game.landscape.position.z = Game.plane ? Game.plane.position.z : 0;
        
        Game.clouds.forEach(function(cloud) {
            cloud.position.z += 0.05;
            if (cloud.position.z > 20) {
                cloud.position.z = -150;
            }
        });
        Game.updateBullets();
        Game.repositionObjects();
        Game.checkCollisions();
        
        // Use cameraRadius for zoom control.
        var radius = Game.cameraRadius; 
        if (Game.plane) {
            Game.camera.position.x = Game.plane.position.x + radius * Math.sin(Game.cameraAngle);
            Game.camera.position.z = Game.plane.position.z + radius * Math.cos(Game.cameraAngle);
            Game.camera.position.y = Game.plane.position.y + 5;
            Game.camera.lookAt(Game.plane.position);
        }
        Game.renderer.render(Game.scene, Game.camera);
    },
    onWindowResize: function() {
        Game.camera.aspect = window.innerWidth / window.innerHeight;
        Game.camera.updateProjectionMatrix();
        Game.renderer.setSize(window.innerWidth, window.innerHeight);
    }
};

window.addEventListener('load', function() {
    Game.init();
});