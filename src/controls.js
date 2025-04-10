const controls = (() => {
    let planeDirection = 0; // 0: straight, -1: left, 1: right

    const initControls = () => {
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleTilt);
        } else {
            window.addEventListener('click', handleTap);
        }
    };

    const handleTilt = (event) => {
        const tilt = event.gamma; // Left-right tilt in degrees
        if (tilt < -10) {
            planeDirection = -1; // steer left
        } else if (tilt > 10) {
            planeDirection = 1; // steer right
        } else {
            planeDirection = 0; // go straight
        }
    };

    const handleTap = () => {
        planeDirection = planeDirection === 0 ? 1 : 0; // toggle steering right
    };

    const getPlaneDirection = () => {
        return planeDirection;
    };

    return {
        initControls,
        getPlaneDirection
    };
})();

export default controls;

var Controls = function(plane) {
    this.plane = plane;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    
    window.addEventListener('keydown', function(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'w':
            case 'W':
                this.moveUp = true;
                break;
            case 's':
            case 'S':
                this.moveDown = true;
                break;
        }
    }.bind(this));
    
    window.addEventListener('keyup', function(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'ArrowRight':
                this.moveRight = false;
                break;
            case 'w':
            case 'W':
                this.moveUp = false;
                break;
            case 's':
            case 'S':
                this.moveDown = false;
                break;
        }
    }.bind(this));
};

Controls.prototype.update = function() {
    if (this.plane) {
        if (this.moveLeft)  this.plane.position.x -= 0.5;
        if (this.moveRight) this.plane.position.x += 0.5;
        if (this.moveUp)    this.plane.position.y += 0.5;
        if (this.moveDown)  this.plane.position.y -= 0.5;
    }
};