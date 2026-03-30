import { createCardBackTexture } from './TextureGenerator.js';

export class Engine3D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020205, 0.04);
        
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 14);
        this.camera.lookAt(0, 3, 0);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.cardMeshes = [];
        this.particles = null;
        this.dealerMesh = null;
        this.deckPileMesh = null;
        
        // Entidade: Braços e Máquina de Estado
        this.dealerLeftHand = null;
        this.dealerRightHand = null;
        this.dealerTargetHandL = new THREE.Vector3(-4, 0, -10);
        this.dealerTargetHandR = new THREE.Vector3(4, 0, -10);
        this.handAnimSpeed = 0.1;
        this.dealerState = 'idle'; // 'idle', 'dealing', 'absorbing'

        // VFX: Partículas de fogo temporárias
        this.fireParticles = [];

        // VFX: Screen Shake
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;

        // VFX: Trail de Partículas
        this.trailParticles = [];

        this.shopMode = false;
        
        // Responsividade Câmera
        this.baseCamPos = new THREE.Vector3(0, 10, 14);
        
        this.cardBackTex = createCardBackTexture();
        this.clock = new THREE.Clock();

        // === Sprite Loader ===
        const loader = new THREE.TextureLoader();
        const spriteFilter = (tex) => {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
        };

        this.entityHeadTex = loader.load('assets/sprites/entity_head.png', spriteFilter);
        this.handOpenTexL = loader.load('assets/sprites/entity_hand_open_L.png', spriteFilter);
        this.handOpenTexR = loader.load('assets/sprites/entity_hand_open_R.png', spriteFilter);
        this.handClosedTexL = loader.load('assets/sprites/entity_hand_closed_L.png', spriteFilter);
        this.handClosedTexR = loader.load('assets/sprites/entity_hand_closed_R.png', spriteFilter);

        this.initLights();
        this.initEnvironment();
        this.initDealer();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0x111122, 1.0);
        this.scene.add(ambient);

        const spotLight = new THREE.SpotLight(0xff0000, 2);
        spotLight.position.set(0, 15, -10);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.8;
        this.scene.add(spotLight);

        const blueLight = new THREE.PointLight(0x0044ff, 1.5, 30);
        blueLight.position.set(0, 5, 5);
        this.scene.add(blueLight);
    }

    initEnvironment() {
        const grid = new THREE.GridHelper(100, 50, 0x440000, 0x110000);
        grid.position.y = -2;
        this.scene.add(grid);

        const partsGeo = new THREE.BufferGeometry();
        const partsCount = 400;
        const posArray = new Float32Array(partsCount * 3);
        for (let i = 0; i < partsCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 40;
        }
        partsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const partsMat = new THREE.PointsMaterial({
            size: 0.15,
            color: 0xff3300,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.particles = new THREE.Points(partsGeo, partsMat);
        this.scene.add(this.particles);
    }

    initDealer() {
        // === Cabeça da Entidade (Sprite) ===
        const geo = new THREE.PlaneGeometry(8, 8);
        const mat = new THREE.MeshBasicMaterial({
            map: this.entityHeadTex,
            transparent: true,
            side: THREE.FrontSide
        });
        this.dealerMesh = new THREE.Mesh(geo, mat);
        this.dealerMesh.position.set(0, 4, -14);
        this.scene.add(this.dealerMesh);

        // === Montante do Baralho (Deck Pile) ===
        const pileMats = [];
        const pileEdgeMat = new THREE.MeshBasicMaterial({ color: 0x110000 });
        const pileTopMat = new THREE.MeshBasicMaterial({ map: this.cardBackTex });
        pileMats.push(pileEdgeMat, pileEdgeMat, pileTopMat, pileEdgeMat, pileEdgeMat, pileEdgeMat);
        const pileGeo = new THREE.BoxGeometry(2.5, 1.2, 3.5);
        this.deckPileMesh = new THREE.Mesh(pileGeo, pileMats);
        this.deckPileMesh.position.set(-7, 0.6, -9);
        this.deckPileMesh.rotation.y = 0.15;
        this.scene.add(this.deckPileMesh);

        // === Braços da Entidade (Sprites) ===
        const handGeo = new THREE.PlaneGeometry(6, 6);
        const handMatL = new THREE.MeshBasicMaterial({
            map: this.handOpenTexL,
            transparent: true,
            side: THREE.FrontSide
        });
        const handMatR = new THREE.MeshBasicMaterial({
            map: this.handOpenTexR,
            transparent: true,
            side: THREE.FrontSide
        });

        this.dealerLeftHand = new THREE.Mesh(handGeo, handMatL);
        this.dealerLeftHand.position.copy(this.dealerTargetHandL);
        this.scene.add(this.dealerLeftHand);

        this.dealerRightHand = new THREE.Mesh(handGeo, handMatR);
        this.dealerRightHand.position.copy(this.dealerTargetHandR);
        this.scene.add(this.dealerRightHand);
    }

    // === VFX: Explosão de Fogo ===
    triggerFireExplosion(position, count = 30) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.15, 4, 4);
            const colors = [0xff4400, 0xff8800, 0xffcc00, 0xff2200, 0xff6600];
            const mat = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending
            });
            const spark = new THREE.Mesh(geo, mat);
            spark.position.copy(position);
            spark.position.x += (Math.random() - 0.5) * 3;
            spark.position.y += (Math.random() - 0.5) * 2;
            spark.position.z += (Math.random() - 0.5) * 1;

            spark.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.2 + 0.05,
                (Math.random() - 0.5) * 0.2
            );
            spark.userData.life = 1.0;
            spark.userData.decay = 0.015 + Math.random() * 0.025;

            this.scene.add(spark);
            this.fireParticles.push(spark);
        }
    }

    // === VFX: Combustão progressiva das cartas ===
    burnCards(meshes, onComplete) {
        let burnStep = 0;
        const burnInterval = setInterval(() => {
            burnStep++;
            meshes.forEach(mesh => {
                // Escurece progressivamente
                mesh.material.forEach(mat => {
                    if (mat.color) {
                        mat.color.lerp(new THREE.Color(0x220000), 0.15);
                    }
                    if (mat.transparent !== undefined) {
                        mat.transparent = true;
                        mat.opacity = Math.max(0, mat.opacity - 0.08);
                    }
                });
                // Achata as cartas como se esmagadas
                mesh.scale.y *= 0.88;
                mesh.scale.x *= 0.96;
            });

            if (burnStep >= 12) {
                clearInterval(burnInterval);
                if (onComplete) onComplete();
            }
        }, 60);
    }

    // === VFX: Screen Shake ===
    triggerScreenShake(intensity = 0.3) {
        this.shakeIntensity = Math.min(intensity, 1.5);
    }

    // === VFX: Trail de Partículas em cartas em movimento ===
    spawnTrail(position) {
        const geo = new THREE.SphereGeometry(0.04, 3, 3);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.0 + Math.random() * 0.08, 1, 0.5),
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const trail = new THREE.Mesh(geo, mat);
        trail.position.copy(position);
        trail.position.x += (Math.random() - 0.5) * 0.3;
        trail.position.y += (Math.random() - 0.5) * 0.3;
        trail.userData.life = 0.6 + Math.random() * 0.4;
        trail.userData.decay = 0.03;
        this.scene.add(trail);
        this.trailParticles.push(trail);
    }

    spawnCardMesh(cardData, cardWidth = 2.5, cardHeight = 3.5, cardThickness = 0.05) {
        const geo = new THREE.BoxGeometry(cardWidth, cardHeight, cardThickness);
        const frontMat = new THREE.MeshBasicMaterial({ map: cardData.texture });
        const backMat = new THREE.MeshBasicMaterial({ map: this.cardBackTex });
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        const materials = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];

        const mesh = new THREE.Mesh(geo, materials);

        mesh.position.set(15, -2, -5);
        mesh.rotation.y = Math.PI; 
        mesh.scale.set(0.1, 0.1, 0.1);

        mesh.userData = {
            cardData: cardData,
            targetPos: new THREE.Vector3(),
            targetRot: new THREE.Euler(),
            targetScale: new THREE.Vector3(1, 1, 1),
            isSelected: false,
            isHovered: false,
            state: 'hand'
        };

        this.scene.add(mesh);
        this.cardMeshes.push(mesh);
        return mesh;
    }

    updateCardPositions(handRadius = 12, gameState) {
        const handCards = this.cardMeshes.filter(m => m.userData.state === 'hand');
        
        // Separa logicamente entre cartas na pilha da mão vs Mão Secundária (Selecionadas)
        const unselectedCards = handCards.filter(m => !m.userData.isSelected);
        const selectedCards = handCards.filter(m => m.userData.isSelected);

        const isMobile = window.innerWidth < 768 || window.innerWidth < window.innerHeight;
        const currentRadius = isMobile ? 8 : handRadius;
        
        const totalU = unselectedCards.length;
        const arcAngle = Math.PI / 5;

        // --- 1. Mão Principal (Inferior/Esquerda) ---
        unselectedCards.forEach((mesh, index) => {
            const angle = -arcAngle / 2 + (index / Math.max(1, totalU - 1)) * arcAngle;
            let x = Math.sin(angle) * currentRadius;
            let z = Math.cos(angle) * currentRadius - currentRadius + 3 + (index * 0.05);
            let y = 0;
            let rotZ = -angle * 0.5;
            
            // Rebaixa um pouco para a esquerda se houver selecionadas e for Desktop
            if (!isMobile && selectedCards.length > 0) x -= 2;

            if (mesh.userData.isHovered && gameState === 'playing') {
                y += 0.8;
                z += 0.5;
                rotZ = 0;
            }

            mesh.userData.targetPos.set(x, y, z);
            mesh.userData.targetRot.set(-Math.PI / 12, 0, rotZ);
            mesh.userData.targetScale.set(1, 1, 1);
        });

        // --- 2. Mão "Jogada Preparada" (Direita, em Linha) ---
        // Aqui nós criamos o sistema de fileira tática de Buckshot/Inscryption
        const spacingX = isMobile ? 1.4 : 1.8;
        const startX = isMobile ? -((selectedCards.length - 1) * spacingX) / 2 : 4; 
        
        selectedCards.forEach((mesh, index) => {
            // Em mobile (sem espaço pros lados), as selecionadas flutuam RETAS no meio-topo da tela
            // Em Desktop, compõem uma esquadrilha na direita!
            let x = startX + (index * spacingX);
            let y = isMobile ? 3.5 : 2.5; 
            let z = 1.0 + (index * 0.01);

            mesh.userData.targetPos.set(x, y, z);
            mesh.userData.targetRot.set(0, 0, 0); // Sempre retas absolutas
            mesh.userData.targetScale.set(isMobile ? 0.9 : 1.1, isMobile ? 0.9 : 1.1, 1); // Dá um zoom leve no destaque
        });
    }

    removeMeshes(meshesToRemove) {
        meshesToRemove.forEach(m => this.scene.remove(m));
        this.cardMeshes = this.cardMeshes.filter(m => !meshesToRemove.includes(m));
    }

    clearCards() {
        this.cardMeshes.forEach(m => this.scene.remove(m));
        this.cardMeshes = [];
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Estratégia Híbrida Mobile: Câmera vai muito pra trás e sobe
        // se tiver em modo Portrait para caber O Dealer + O Leque de Cartas!
        const isMobile = window.innerWidth < 768 || window.innerWidth < window.innerHeight;
        if (isMobile) {
            this.baseCamPos.set(0, 16, 20);
        } else {
            this.baseCamPos.set(0, 10, 14);
        }
    }

    setShopMode(isShop) {
        this.shopMode = isShop;
        this.cardMeshes.forEach(mesh => mesh.visible = !isShop);
        if (this.deckPileMesh) this.deckPileMesh.visible = !isShop;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const time = this.clock.getElapsedTime();

        // Animação de câmera para a loja
        if (this.shopMode) {
            this.camera.position.lerp(new THREE.Vector3(0, 1.5, 3), 0.05);
            
            const lookPos = new THREE.Vector3(0, 0, -5); 
            const dummyCam = this.camera.clone();
            dummyCam.position.copy(this.camera.position);
            dummyCam.lookAt(lookPos);
            this.camera.quaternion.slerp(dummyCam.quaternion, 0.05);
            
            if (this.dealerMesh && this.dealerMesh.visible) {
                 this.dealerMesh.material.opacity -= 0.05;
                 if (this.dealerMesh.material.opacity <= 0) this.dealerMesh.visible = false;
            }
        } else {
            // Câmera base + Screen Shake
            const shakeTarget = this.baseCamPos.clone();
            if (this.shakeIntensity > 0.01) {
                shakeTarget.x += (Math.random() - 0.5) * this.shakeIntensity;
                shakeTarget.y += (Math.random() - 0.5) * this.shakeIntensity;
                this.shakeIntensity *= this.shakeDecay;
            }
            this.camera.position.lerp(shakeTarget, 0.08);
            
            const dummyCam = this.camera.clone();
            dummyCam.position.copy(this.camera.position);
            dummyCam.lookAt(0, 3, 0);
            this.camera.quaternion.slerp(dummyCam.quaternion, 0.05);
            
            if (this.dealerMesh && !this.dealerMesh.visible) {
                this.dealerMesh.visible = true;
            }
            if (this.dealerMesh && this.dealerMesh.material.opacity < 1) {
                this.dealerMesh.material.opacity += 0.05;
            }
        }

        if (this.particles) {
            this.particles.rotation.y += 0.0005;
            const pos = this.particles.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) {
                pos[i] += 0.03;
                if (pos[i] > 20) pos[i] = -10;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        if (this.dealerMesh) {
            this.dealerMesh.position.y = 3 + Math.sin(time * 1.5) * 0.2;
            this.dealerMesh.rotation.z = Math.sin(time * 0.5) * 0.02;
            
            // Fumaça para as mãos de acordo com Purgatório/Estado
            const hOpacity = this.dealerMesh.visible ? this.dealerMesh.material.opacity : 0;
            this.dealerLeftHand.material.opacity = hOpacity;
            this.dealerRightHand.material.opacity = hOpacity;
            this.dealerLeftHand.visible = this.dealerMesh.visible;
            this.dealerRightHand.visible = this.dealerMesh.visible;

            // Deck Pile oscila sutilmente junto do Dealer
            if (this.deckPileMesh && this.deckPileMesh.visible) {
                this.deckPileMesh.position.y = 0.6 + Math.sin(time * 1.5) * 0.05;
            }

            // Motor IK Falso das Mãos
            if (this.dealerState === 'idle') {
                this.dealerTargetHandL.set(-4 + Math.sin(time * 2) * 0.5, 1 + Math.cos(time * 3) * 0.3, -10);
                this.dealerTargetHandR.set(4 + Math.cos(time * 2) * 0.5, 1 + Math.sin(time * 3) * 0.3, -10);
                this.dealerLeftHand.rotation.z = Math.sin(time) * 0.1;
                this.dealerRightHand.rotation.z = -Math.sin(time) * 0.1;
                this.handAnimSpeed = 0.05;
                
                // Sprite: Mãos Abertas no Idle
                this.dealerLeftHand.material.map = this.handOpenTexL;
                this.dealerRightHand.material.map = this.handOpenTexR;
            }

            // Sprite: Mãos Fechadas quando Absorvendo
            if (this.dealerState === 'absorbing') {
                this.dealerLeftHand.material.map = this.handClosedTexL;
                this.dealerRightHand.material.map = this.handClosedTexR;
            }

            this.dealerLeftHand.position.lerp(this.dealerTargetHandL, this.handAnimSpeed);
            this.dealerRightHand.position.lerp(this.dealerTargetHandR, this.handAnimSpeed);
        }

        // === VFX: Atualiza partículas de fogo ===
        for (let i = this.fireParticles.length - 1; i >= 0; i--) {
            const p = this.fireParticles[i];
            p.position.add(p.userData.velocity);
            p.userData.velocity.y += 0.003;
            p.userData.life -= p.userData.decay;
            p.material.opacity = Math.max(0, p.userData.life);
            p.scale.multiplyScalar(0.97);

            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.fireParticles.splice(i, 1);
            }
        }

        // === VFX: Atualiza trail de partículas ===
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const t = this.trailParticles[i];
            t.userData.life -= t.userData.decay;
            t.material.opacity = Math.max(0, t.userData.life);
            t.scale.multiplyScalar(0.95);
            if (t.userData.life <= 0) {
                this.scene.remove(t);
                this.trailParticles.splice(i, 1);
            }
        }

        // === VFX: Spawn trails em cartas visivelmente em movimento ===
        this.cardMeshes.forEach(mesh => {
            if (mesh.userData.state === 'playing') {
                this.spawnTrail(mesh.position);
            }
        });

        this.cardMeshes.forEach(mesh => {
            mesh.position.lerp(mesh.userData.targetPos, 0.15);
            const targetQuat = new THREE.Quaternion().setFromEuler(mesh.userData.targetRot);
            mesh.quaternion.slerp(targetQuat, 0.15);
            mesh.scale.lerp(mesh.userData.targetScale, 0.15);
        });

        this.renderer.render(this.scene, this.camera);
    }
}
