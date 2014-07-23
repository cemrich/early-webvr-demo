// main container where the rendering takes place
var canvas;

// important three.js globals
// wee need two cameras - one for each eye
var camera, scene, renderer;
var cameraLeft, cameraRight;

// TODO: find out where these values come from
var winRenderWidth = 640; // window.innerWidth;
var winRenderHeight = winRenderWidth * (1080/1920); // window.innerHeight;

var renderWidth = winRenderWidth;
var renderHeight = winRenderHeight;

// status output
var statusHeadline = document.querySelector("#info h1");
var leftTranslationOutput = document.getElementById("leftTranslation");
var rightTranslationOutput = document.getElementById("rightTranslation");
var orientationOutput = document.getElementById("orientation");
var positionOutput = document.getElementById("position");
var angularVelocityOutput = document.getElementById("angularVelocity");
var linearVelocityOutput = document.getElementById("linearVelocity");
var angularAccelerationOutput = document.getElementById("angularAcceleration");
var linearAccelerationOutput = document.getElementById("linearAcceleration");

// globals related to VR devices
var vrHMD = null, vrPosDev = null, vrEnabled = false;


/*
 * Entry point when DOM has finished loading.
 * Init scene, add event listeners and search for VR devices.
 */
function start() {
  document.addEventListener("mozfullscreenchange", onFullscreenChanged, false);
  document.addEventListener("webkitfullscreenchange", onFullscreenChanged, false);
  initScene();
  
  if (navigator.getVRDevices) {
    // chromium or similar
    navigator.getVRDevices().then(vrDeviceCallback);
  } else if (navigator.mozGetVRDevices) {
    // firefox
    navigator.mozGetVRDevices(vrDeviceCallback);
  } else {
    // no vr support
    statusHeadline.innerHTML = "No support for webVR";
    setRenderSize(renderWidth, renderHeight, false);
    animate();
  }
}

window.addEventListener("load", start, false);


/*
 * Setup all three.js and view related stuff.
 */
function initScene() {
  var container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera( 60, renderWidth / renderHeight, 1, 10000 );
  camera.position.z = 500;

  cameraLeft = new THREE.Camera();
  cameraRight = new THREE.Camera();

  scene = new THREE.Scene();

  var geometry = new THREE.BoxGeometry( 100, 100, 100 );
  var material = new THREE.MeshNormalMaterial( { overdraw: 0.5 } );

  var group = new THREE.Object3D();

  for (var i = 0; i < 200; i ++) {
    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.x = Math.random() * 2000 - 1000;
    mesh.position.y = Math.random() * 2000 - 1000;
    mesh.position.z = Math.random() * 2000 - 1000;
    mesh.rotation.x = Math.random() * 2 * Math.PI;
    mesh.rotation.y = Math.random() * 2 * Math.PI;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    group.add(mesh);
  }

  scene.add(group);

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor( 0xffffff );
  renderer.setSize(renderWidth, renderHeight);
  renderer.domElement.setAttribute("id", "three_canvas");
  container.appendChild( renderer.domElement );
  canvas = renderer.domElement;
}

/*
 *  Called when the size of the container changed, e.g. when
 *  user toggled fullscreen mode.
 */
function setRenderSize(width, height, vrEnabled) {
  if (vrHMD) {
    cameraLeft.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("left"));
    cameraRight.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("right"));

    var leftTx = vrHMD.getEyeTranslation("left");
    var rightTx = vrHMD.getEyeTranslation("right");
    
    leftTranslationOutput.innerHTML = numObjectToString(leftTx);
    rightTranslationOutput.innerHTML = numObjectToString(rightTx);

    cameraLeft.position.add(new THREE.Vector3(leftTx.x, leftTx.y, leftTx.z));
    cameraRight.position.add(new THREE.Vector3(rightTx.x, rightTx.y, rightTx.z));

    renderer.setSize(width * 2, height, true, 2);
    canvas.style.width = (width * 2) + "px";
    canvas.style.height = height + "px";
  } else {
    camera.aspect = renderWidth / renderHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }

  renderWidth = width;
  renderHeight = height;
}

/*
 * Main render loop.  
 */
function animate() {
  requestAnimationFrame(animate);
  render();
}

/*
 * Renders the scene with three.js.
 * Static when vr is disabled, according
 * to vr device rotation otherwise.
 */
function render() {
  renderer.enableScissorTest(true);

  if (vrPosDev) {
    // read the orientation from the HMD, and set the rotation on all cameras
    var state = vrPosDev.getState();
    var qrot = new THREE.Quaternion();
    qrot.set(state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w);
    cameraLeft.setRotationFromQuaternion(qrot);
    cameraRight.setRotationFromQuaternion(qrot);

    // status output
    orientationOutput.innerHTML = numObjectToString(state.orientation);
    positionOutput.innerHTML = numObjectToString(state.position);
    angularVelocityOutput.innerHTML = numObjectToString(state.angularVelocity);
    linearVelocityOutput.innerHTML = numObjectToString(state.linearVelocity);
    angularAccelerationOutput.innerHTML = numObjectToString(state.angularAcceleration);
    linearAccelerationOutput.innerHTML = numObjectToString(state.linearAcceleration);
    
    // render left eye
    renderer.setViewport(0, 0, renderWidth, renderHeight);
    renderer.setScissor(0, 0, renderWidth, renderHeight);
    renderer.render(scene, cameraLeft);

    // render right eye
    renderer.setViewport(renderWidth, 0, renderWidth, renderHeight);
    renderer.setScissor(renderWidth, 0, renderWidth, renderHeight);
    renderer.render(scene, cameraRight);
  } else {
    renderer.setViewport(0, 0, renderWidth, renderHeight);
    renderer.setScissor(0, 0, renderWidth, renderHeight);
    renderer.render(scene, camera);
  }
}

function vrDeviceCallback(vrdevs) {
  console.log(vrdevs.length, " VR Devices");

  // First, find a HMD -- just use the first one we find
  for (var i = 0; i < vrdevs.length; ++i) {
    if (vrdevs[i] instanceof HMDVRDevice) {
      vrHMD = vrdevs[i];
      break;
    }
  }

  if (!vrHMD) {
   statusHeadline.innerHTML = "No VR device detected!";
   return;
  }

  // Then, find that HMD's position sensor
  for (var i = 0; i < vrdevs.length; ++i) {
    if (vrdevs[i] instanceof PositionSensorVRDevice &&
        vrdevs[i].hardwareUnitId == vrHMD.hardwareUnitId)
    {
      vrPosDev = vrdevs[i];
      break;
    }
  }

  if (!vrPosDev) {
    alert("Found a HMD, but didn't find its orientation sensor?");
  }
  
  statusHeadline.innerHTML = "VR device detected: " + vrHMD.deviceName;

  // kick off rendering
  setRenderSize(renderWidth, renderHeight, false);
  animate();
}

/*
 * Call this to toggle fullscreen mode.
 * Will warn when there is no vr device available.
 */
function toggleFullscreen() {
  if (!vrHMD) {
    alert("no HMD found");
    return;
  }
  
  if (canvas.webkitRequestFullscreen) {
    // chromium
    canvas.webkitRequestFullscreen({ vrDisplay: vrHMD });
  } else if (canvas.mozRequestFullScreen) {
    // firefox
    canvas.mozRequestFullScreen({ vrDisplay: vrHMD });
  }
}

/*
 * User toggled fullscreen - switch from normal to
 * vr mode or back.
 */
function onFullscreenChanged() {
  if (document.mozFullScreenElement || document.webkitFullscreenElement) {
    renderWidth = (window.innerWidth / 2);
    renderHeight = (window.innerHeight);
    vrEnabled = true;
  } else {
    renderWidth = winRenderWidth;
    renderHeight = winRenderHeight;
    vrEnabled = false;
  }

  setRenderSize(renderWidth, renderHeight, vrEnabled);
}

function numObjectToString(obj) {
  var str = "";
  var num;
  for (attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      num = obj[attr].toFixed(5);
      if (num[0] != "-") num = "+" + num;
      str += attr + ": " + num + "  ";
    }
  }
  return str;
}