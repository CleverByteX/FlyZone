function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function loadTexture(url) {
    const textureLoader = new THREE.TextureLoader();
    return textureLoader.load(url);
}

function loadModel(url, onLoad) {
    const loader = new THREE.GLTFLoader();
    loader.load(url, onLoad);
}

function playSound(url) {
    const audio = new Audio(url);
    audio.play();
}

function getRandomPosition(range) {
    return getRandomNumber(-range, range);
}