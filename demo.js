// main container where the rendering takes place
var container;

// important three.js globals
// wee need two cameras - one for each eye
var camera, scene, renderer;
var cameraLeft, cameraRight;

// TODO: find out where these values come from
var winRenderWidth = 640; // window.innerWidth;
var winRenderHeight = winRenderWidth * (1080/1920); // window.innerHeight;

var renderWidth = winRenderWidth;
var renderHeight = winRenderHeight;

// globals related to VR devices
var vrHMD = null, vrPosDev = null, vrEnabled = false;


/*
 * Entry point when DOM has finished loading.
 * Init scene, add event listeners and search for VR devices.
 */
function start() {
  document.addEventListener("mozfullscreenchange", onFullscreenChanged, false);
  initScene();
  setRenderSize(renderWidth, renderHeight, false);
  if (navigator.mozGetVRDevices)
    navigator.mozGetVRDevices(vrDeviceCallback);
  else
    animate();
}

window.addEventListener("load", start, false);


/*
 * Setup all three.js and view related stuff.
 */
function initScene() {
  container = document.getElementById("container");

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
}

/*
 *  Called when the size of the container changed, e.g. when
 *  user toggled fullscreen mode.
 */
function setRenderSize(width, height, vrEnabled) {
  if (vrEnabled) {
    cameraLeft.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("left"));
    cameraRight.projectionMatrix = FovToProjection(vrHMD.getRecommendedEyeFieldOfView("right"));

    var leftTx = vrHMD.getEyeTranslation("left");
    var rightTx = vrHMD.getEyeTranslation("right");

    cameraLeft.position.add(new THREE.Vector3(leftTx.x, leftTx.y, leftTx.z));
    cameraRight.position.add(new THREE.Vector3(rightTx.x, rightTx.y, rightTx.z));

    renderer.setSize(width * 2, height, true, 2);
    container.style.width = (width * 2) + "px";
    container.style.height = height + "px";
  } else {
    camera.aspect = renderWidth / renderHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    container.style.width = width + "px";
    container.style.height = height + "px";
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

  if (vrEnabled) {
    // read the orientation from the HMD, and set the rotation on both cameras
    var state = vrPosDev.getState();
    var qrot = new THREE.Quaternion();
    qrot.set(state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w);
    cameraLeft.setRotationFromQuaternion(qrot);
    cameraRight.setRotationFromQuaternion(qrot);

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

  if (!vrHMD)
   return;

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

  // kick off rendering
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

  container.mozRequestFullScreen({ vrDisplay: vrHMD });
}

/*
 * User toggled fullscreen - switch from normal to
 * vr mode or back.
 */
function onFullscreenChanged() {
  if (document.mozFullScreenElement) {
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

