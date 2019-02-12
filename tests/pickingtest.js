const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
    antialias: true
});
scene.background = new THREE.Color(0,0,0);

let camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
window.globalCamera = camera;

renderer.setSize(window.innerWidth, window.innerHeight);
Network.Materials.sphereMaterial.uniforms.screen.value.set(window.innerWidth, window.innerHeight);
Network.Materials.lineMaterial.uniforms.screen.value.set(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);







let currentlySelected = null;
const GUI = new dat.GUI();
GUI.width = window.innerWidth / 4;
let GUIOptions = [];
GUIOptions.push(GUI.add(window, 'minimizeCrossing'));

const nodes = 2;
const layers = 2;
const width = 10;
const height = 10;





let graph = new Network.LayeredGraph(layers, nodes);
graph.directed = true;
graph.position.set(-(layers-1)*width/2, -(nodes-1)*height/2, 0);
graph.scale.set(width, height, 1);

let graph2 = new Network.PickableGraph();
graph2.position.copy(graph.position);
graph2.scale.copy(graph2.scale);

let renderGraph = graph;

//add nodes
for(let layer = 0; layer < layers; ++layer){
    for(let e = 0; e < nodes * 1.5; ++e){
        let src = Math.floor(Math.random() * nodes);
        let tgt = Math.floor(Math.random() * nodes);
        graph.addEdge(`l${layer-1}n${src}`, `l${layer}n${tgt}`);
    }
}



for(let e = 0; e < graph.edges.length; ++e){
    let intensity = Math.round(Math.random());
    graph.edges[e].intensity = intensity;
}

for(let n = 0; n < graph.nodes.length; ++n){
    let intensity = Math.random();
    let col = new Network.Vec3(1, 0.65, 0).multiplyScalar(1 - intensity).add(new Network.Vec3(0, 0, 1).multiplyScalar(intensity));
    graph.nodes[n].color = col;
}

graph.setEdgeGeom();
graph.setNodeGeom();


scene.add(graph);
scene.add( new THREE.GridHelper(10, 10) );
scene.add( new THREE.AxesHelper(10) );
let gridhelp = new THREE.GridHelper(10, 10);
gridhelp.lookAt(new THREE.Vector3(0,1,0));
scene.add(gridhelp);
window.graph = graph;



// camera.position.z = 50;
camera.position.set(0,0,50);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;

async function animate(){
    requestAnimationFrame(animate);
    
    renderer.render(scene, camera);
    controls.update();
}
animate();

const w = window.innerHeight;
const h = window.innerWidth;
let pickingScene = new THREE.Scene();
let pickingTexture = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height);
// pickingTexture.texture.minFilter = THREE.LinearFilter;
let canvas = document.querySelector('canvas');

canvas.addEventListener('click', function(e){
    pick(e);
});

function pick(event){
    
    renderGraph.prepareForPicking();
    pickingScene.add(renderGraph);
    renderer.render(pickingScene, camera, pickingTexture);
    renderGraph.revertToNormal();
    scene.add(renderGraph);


    let pixelBuffer = new Uint8Array(4);
    renderer.readRenderTargetPixels(pickingTexture, event.clientX, pickingTexture.height - event.clientY, 1, 1, pixelBuffer);
    let id = (pixelBuffer[0]<<16)|(pixelBuffer[1]<<8)|(pixelBuffer[2]);
    // console.log(event, pixelBuffer, id);
    if(id){
        currentlySelected = graph.nodes[id-1];
        setGUI(currentlySelected);
        console.log(id, pixelBuffer);
        console.log(graph.nodes[id-1], graph.getConnectedReverse(graph.nodes[id-1]));

        // let ng = graph.getConnectedReverse(graph.nodes[id-1]);
        // graph2.nodes = ng.nodes;
        // graph2.edges = ng.edges;
        // graph2.setEdgeGeom();
        // graph2.setNodeGeom();

        // renderGraph = graph2;
        // scene.remove(graph);
        // scene.add(graph2);
    }
    else{
        renderGraph = graph;
        scene.remove(graph2);
        scene.add(graph);
        setGUI();
    }
}

function setGUI(node){
    console.log(node);
    for(let pop of GUIOptions){
        GUI.remove(pop);
    }
    GUIOptions = [];
    if(node){
        GUIOptions.push(GUI.add(node, 'name'));
        GUIOptions.push(GUI.add(window, 'displayAffectedNodes'));
        GUIOptions.push(GUI.add(window, 'displayAffectingNodes'));
        GUIOptions.push(GUI.add(window, 'displayConnectedNodes'));
        GUIOptions.push(GUI.add(window, 'resetDisplay'));
    }
    else{
        GUIOptions.push(GUI.add(window, 'minimizeCrossing'));
    }
}

function displayAffectedNodes(){
    let ng = graph.getConnected(currentlySelected);
    graph2.nodes = ng.nodes;
    graph2.edges = ng.edges;
    graph2.setEdgeGeom();
    graph2.setNodeGeom();

    renderGraph = graph2;
    scene.remove(graph);
    scene.add(graph2);
}

function displayAffectingNodes(){
    let ng = graph.getConnectedReverse(currentlySelected);
    graph2.nodes = ng.nodes;
    graph2.edges = ng.edges;
    graph2.setEdgeGeom();
    graph2.setNodeGeom();

    renderGraph = graph2;
    scene.remove(graph);
    scene.add(graph2);
}

function displayConnectedNodes(){
    let ng = graph.getConnected(currentlySelected);
    let ng2 = graph.getConnectedReverse(currentlySelected);
    graph2.nodes = ng.nodes.concat(ng2.nodes);
    graph2.edges = ng.edges.concat(ng2.edges);
    graph2.setEdgeGeom();
    graph2.setNodeGeom();

    renderGraph = graph2;
    scene.remove(graph);
    scene.add(graph2);
}

function resetDisplay(){
    renderGraph = graph;
    scene.remove(graph2);
    scene.add(graph);
}

function minimizeCrossing(){
    graph.oscm();
    graph.updateNodeGeom();
    graph.updateEdgeGeom();
}