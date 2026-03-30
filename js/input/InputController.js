export class InputController {
    constructor(engine, onCardClickCallback, getStateCallback) {
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.onCardClick = onCardClickCallback;
        this.getState = getStateCallback;

        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('click', () => this.onClick());
        window.addEventListener('touchstart', (e) => this.onTouch(e), { passive: false });
    }

    onMouseMove(event) {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.getState() !== 'playing') return;

        this.mouse.x = mouseX;
        this.mouse.y = mouseY;
        this.raycaster.setFromCamera(this.mouse, this.engine.camera);

        const interactables = this.engine.cardMeshes.filter(m => m.userData.state === 'hand');
        const intersects = this.raycaster.intersectObjects(interactables);

        let hoveredMesh = null;
        if (intersects.length > 0) {
            hoveredMesh = intersects[0].object;
        }

        let changed = false;
        this.engine.cardMeshes.forEach(mesh => {
            if (mesh.userData.state === 'hand') {
                const wasHovered = mesh.userData.isHovered;
                mesh.userData.isHovered = (mesh === hoveredMesh);
                if (wasHovered !== mesh.userData.isHovered) changed = true;
            }
        });

        if (changed) this.engine.updateCardPositions(12, this.getState());
    }

    onClick() {
        if (this.getState() !== 'playing') return;

        const hoveredMesh = this.engine.cardMeshes.find(m => m.userData.isHovered && m.userData.state === 'hand');
        if (hoveredMesh) {
            this.onCardClick(hoveredMesh.userData);
        }
    }

    onTouch(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const mockEvent = { clientX: touch.clientX, clientY: touch.clientY };
            this.onMouseMove(mockEvent);
            setTimeout(() => this.onClick(), 50);
        }
    }
}
