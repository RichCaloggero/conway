/* Game of Life
* Implemented in TypeScript
* To learn more about TypeScript, please visit http://www.typescriptlang.org/
*/

module Conway {

export class Cell {
public row: number;
public col: number;
public live: boolean;

constructor(row: number, col: number, live: boolean) {
this.row = row;
this.col = col;
this.live = live
} //  constructor
} // class Cell

export class GameOfLife {
private gridSize: number;
private canvasSize: number;
private lineColor: string;
private liveColor: string;
private deadColor: string;
private initialLifeProbability: number;
private animationRate: number;
private cellSize: number;
private context: CanvasRenderingContext2D;
private world;
private options;
private audioDurationFactor: number;
private liveFrequency: number;
private deadFrequency: number;
private liveTone: AudioNode;
private deadTone: AudioNode;
private audio;
private audioEnabled: boolean;
private generations: number;
private lastGeneration: boolean;
private panners;
private testMode: boolean;
private initialLiveCells: string;
private running: boolean;

constructor(options) {
this.options = options;
this.gridSize = options.gridSize || 10;
this.canvasSize = 600;
this.lineColor = '#cdcdcd';
this.liveColor = '#666';
this.deadColor = '#eee';
this.initialLifeProbability = options.initialLifeProbability || 0.5;
this.animationRate = options.animationRate  || 60;
this.cellSize = 0;
this.generations = 0;
this.lastGeneration = false;
this.audioDurationFactor = options.audioDurationFactor  || 0.005;
this.liveFrequency = options.liveFrequency || 1200;
this.deadFrequency = options.deadFrequency || 400;
this.initialLiveCells = options.liveCells? getInitialLiveCells (options.liveCells) : [];
this.testMode = this.options.testMode;

this.audio = options.audio || new AudioContext ();
this.audioEnabled = options.liveFrequency > 0 || options.deadFrequency > 0;
this.audio.listener.setOrientation (0.0,0.0,-1.0, 0.0,1.0,0.0);
this.audio.listener.setPosition (0,0,0);

this.world = this.createWorld(this.initialLiveCells);
if (! this.initialLiveCells && this.options.alive) this.options.alive.call (this, this.countLiveCells());

//this.audio.suspend ();
this.panners = createPanners.call (this, this.gridSize);
this.liveTone = createOscillator.call (this, this.liveFrequency);
this.deadTone = createOscillator.call (this, this.deadFrequency);
this.audio.resume ();

this.circleOfLife(this.testMode);

function getInitialLiveCells (cells) {
return cells.split(" ").map (
(cell) => cell.split(",").map (
(n) => Number(n)
) // map
); // map
} // getInitialLiveCells 


function createOscillator (frequency) {
let osc = this.audio.createOscillator ();
osc.frequency.value = frequency;
osc.start ();
return osc;
} // createOscillator

function createPanners (gridSize: number) {
let output = this.audio.createGain ();
output.gain.value = (this.testMode)? 1 / this.countLiveCells() : 1 / (gridSize * gridSize);
output.connect (this.audio.destination);

let result = [];
for (let r =0; r < gridSize; r++) {
let row = [];

for (let c =0; c < gridSize; c++) {
let panner = createPanner (this.audio, r,c, gridSize);
panner.connect (output);
row.push (panner);
} // for col

result.push (row);
} // for row

return result;

function createPanner (audio, row: number, col: number, gridSize: number): AudioNode {
let panner = audio.createPanner ();
panner.setOrientation (0,0,0);
panner.panningModel = "HRTF";
panner.distanceModel = "linear";
//panner.distanceModel = 'inverse';
panner.refDistance = 1;
panner.maxDistance = 10000;
panner.rolloffFactor = 1;
panner.coneInnerAngle = 360;
panner.coneOuterAngle = 0;
panner.coneOuterGain = 0;

panner.setPosition (row-gridSize/2, 0, col-gridSize/2);
return panner;
} // createPanner
} // createPanners
} // GameOfLife constructor

public createWorld(liveCells) {
return this.travelWorld( (cell : Cell) =>  {
if (liveCells.length > 0) cell.live = includes(liveCells, cell.row, cell.col);
else cell.live = Math.random() < this.initialLifeProbability;
return cell;

function includes (a, r: number, c: number): boolean {
return a.find (x => x[0]===r && x[1]===c);
} // testIncludes
}); // callback
} //  public createWorld

public countLiveCells (): number {
let count = 0;

this.travelWorld ((cell: Cell) => count += (this.world[cell.row][cell.col].live? 1 : 0));

return count;
} // countLiveCells 

public currentLiveCells (toString: boolean = false) {
let cells;
cells = (toString)? "" : [];

this.travelWorld ((cell: Cell) => {
if (this.world[cell.row][cell.col].live) {
if (toString) cells += `${cell.row},${cell.col} `;
else cells.push([cell.row, cell.col]);
} // if
}); // travelWorld

return cells;
} // public currentLiveCells

public circleOfLife(testMode: boolean = false) : void {
let alive = 0;
this.running = true;
//this.audio.suspend ();

this.world = this.travelWorld( (cell: Cell) => {
cell = this.world[cell.row][cell.col];
this.draw(cell);
if (this.audioEnabled) this.generateAudio (cell);
if (! testMode) cell = this.resolveNextGeneration(cell);
if (cell.live) alive++;
return cell;
}); // travelWorld

let stopCallback = this.options.stop.bind(this);
let deadCallback = this.options.dead.bind(this);
let aliveCallback = this.options.alive.bind(this);
this.generations += 1;
this.running = false;
//this.audio.resume ();


if (alive === 0) {
this.disconnectAll ();
if (deadCallback) deadCallback (this.generations);
return;

} else if (this.lastGeneration) {
this.disconnectAll ();
if (stopCallback) stopCallback (this.generations, alive, this.currentLiveCells());
this.lastGeneration = false;
return;

} else if (testMode) {
setTimeout (() => this.disconnectAll(), 500);
//if (aliveCallback) aliveCallback.call (this, alive);
return;
} // if

// keep on truckin
setTimeout( () => this.circleOfLife(), this.animationRate);
} // public circleOfLife

public resolveNextGeneration(cell : Cell) {
var count = this.countNeighbors(cell);
var newCell = new Cell(cell.row, cell.col, cell.live);
if(count < 2 || count > 3) newCell.live = false;
else if(count == 3) newCell.live = true;
return newCell;
} // public resolveNextGeneration

public countNeighbors(cell : Cell) {
var neighbors = 0;
for(var row = -1; row <=1; row++) {
for(var col = -1; col <= 1; col++) {
if(row == 0 && col == 0) continue;
if(this.isAlive(cell.row + row, cell.col + col)) {
	neighbors++;
} // if
} // for col
} //  for row
return neighbors;
} // public countNeighbors

public isAlive(row : number, col : number) {
if(row < 0 || col < 0 || row >= this.gridSize || col >= this.gridSize) return false;
return this.world[row][col].live;
} // public isAlive

public travelWorld(callback) {
var result = [];

for(var row = 0; row < this.gridSize; row++) {
var rowData = [];

for(var col = 0; col < this.gridSize; col++) {
rowData.push(callback(new Cell(row, col, false)));
} // for col

result.push(rowData);
} // for row

return result;
} // travelWorld

public draw(cell : Cell) {
if(this.context == null) this.context = this.createDrawingContext();
if(this.cellSize == 0) this.cellSize = this.canvasSize/this.gridSize;

this.context.strokeStyle = this.lineColor;
this.context.strokeRect(cell.row * this.cellSize, cell.col*this.cellSize, this.cellSize, this.cellSize);
this.context.fillStyle = cell.live ? this.liveColor : this.deadColor;
this.context.fillRect(cell.row * this.cellSize, cell.col*this.cellSize, this.cellSize, this.cellSize);
} // public draw   

public createDrawingContext() {
var canvas = <HTMLCanvasElement> document.getElementById('conway-canvas');
if(canvas == null) {
canvas = document.createElement('canvas');
canvas.id = 'conway-canvas';
canvas.width = this.canvasSize;
canvas.height = this.canvasSize;
document.body.appendChild(canvas);
} // if

return canvas.getContext('2d');
} // public createDrawingContext

public generateAudio (cell: Cell, duration: number = 0): void {
let panner = this.panners[cell.row][cell.col];

try {this.liveTone.disconnect (panner);} catch (e) {}
try {this.deadTone.disconnect (panner);} catch (e) {}

if (cell.live && this.liveFrequency > 0) this.liveTone.connect (panner);
else if (this.deadFrequency > 0) this.deadTone.connect (panner);

document.dispatchEvent (new CustomEvent("playCell", {detail: {
cx: cell.row, cy: cell.col,
px: panner.positionX.value, py: panner.positionZ.value,
live: cell.live
} // detail
})); // dispatch

} // public generateAudio

public stop () {
this.lastGeneration = true;
} // stop

public replayLastGeneration () {
this.circleOfLife (true);

/*let alive = 0;

this.travelWorld ((cell: Cell) => {
cell = this.world[cell.row][cell.col];
this.generateAudio(cell);
if (cell.live) alive++;
}); // travel
setTimeout (() => this.disconnectAll(), 500);

if (alive > 0 && this.options.replay) this.options.replay.call (this, alive);
*/
} // replayLastGeneration

public playPattern (coordinates, dt = 500) {
if (coordinates.length > 0) {
let c = coordinates.shift ();
this.generateAudio (new Cell (c[0], c[1], true));
setTimeout (() => {
this.disconnectAll ();
setTimeout (() => this.playPattern(coordinates, dt), dt);
}, dt);

} else {
setTimeout (() => this.disconnectAll(), dt || 500);
} // if
} // playPattern

public disconnectAll () {
this.liveTone.disconnect ();
this.deadTone.disconnect ();
} // public disconnectAll
} // public class GameOfLife
} // module Conway

/*var game = new Conway.GameOfLife({
gridSize: 15,
audioDurationFactor: 0.002, // each tone lasts for audioDurationFactor * animationRate
animationRate: 60, // milliseconds between generations
}); // game
*/
