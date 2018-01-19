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
private audio;
private generations: number;
private lastGeneration: boolean;
private panners;

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

this.audio = options.audio || new AudioContext ();
this.audio.listener.setOrientation (0.0,0.0,-1.0, 0.0,1.0,0.0);
this.audio.listener.setPosition (0,0,0);
this.panners = createPanners.call (this, this.gridSize);

this.world = this.createWorld();
this.circleOfLife();


function createPanners (gridSize) {
let result = [];
let output = this.audio.createGain ();
output.gain.value = 1 / (this.gridSize * this.gridSize);
output.connect (this.audio.destination);

for (var row =0; row < gridSize; row++) {
let panners = [];
for (var col =0; col < gridSize; col++) {
let panner = createPanner.call (this, row, col);
panner.connect (output);
panners.push (panner);
} // for col

result.push (panners);
} // for row

return result;


function createPanner (row: number, col: number): AudioNode {
let panner = this.audio.createPanner ();
panner.setOrientation (0,0,0);
panner.panningModel = "HRTF";
panner.distanceModel = "linear";
panner.distanceModel = 'inverse';
panner.refDistance = 1;
panner.maxDistance = 10000;
panner.rolloffFactor = 1;
panner.coneInnerAngle = 360;
panner.coneOuterAngle = 0;
panner.coneOuterGain = 0;

panner.setPosition (row-this.gridSize/2, 0, col-this.gridSize/2);
return panner;
} // createPanner
} // createPanners
} // constructor

public createWorld() {
return this.travelWorld( (cell : Cell) =>  {
cell.live = Math.random() < this.initialLifeProbability;
return cell;
});
} //  public createWorld

public circleOfLife() : void {
let alive = 0;
//this.audio.suspend ();

this.world = this.travelWorld( (cell: Cell) => {
cell = this.world[cell.row][cell.col];
this.draw(cell);
this.generateAudio (cell, true);
cell = this.resolveNextGeneration(cell);
if (cell.live) alive++;
return cell;
});

let stopCallback = this.options.stop;
let deadCallback = this.options.dead;
this.generations += 1;
//if (! confirm(`gen: ${this.generations}, ${alive}, ${this.lastGeneration}`)) this.stop();

if (alive === 0) {
if (deadCallback) deadCallback.call (this, this.generations);
return;
} else if (this.lastGeneration) {
if (stopCallback) stopCallback.call (this, this.generations);
return;
} // if

//if (this.generations % 10 === 0) alert(`${this.generations} generations`);
//this.audio.resume ();

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

public generateAudio (cell: Cell, showDead: boolean = false, duration: number = 0): void {
var beep = (output: AudioNode, frequency: number = 1000, duration: number = this.audioDurationFactor * this.animationRate) => {
if (frequency === 0) return;
let osc = this.audio.createOscillator ();
let t = this.audio.currentTime;
osc.frequency.value = frequency;
osc.connect (output);
osc.start ();
osc.stop (t+duration);
/*osc.onended = () => {
osc.disconnect ();
}; // onended
*/
}; // beep

let liveFrequency = this.options.liveFrequency || 1000;
let deadFrequency = (showDead && this.options.deadFrequency)? this.options.deadFrequency  : 0;

beep (
this.panners[cell.row][cell.col],
cell.live? liveFrequency : deadFrequency,
duration > 0? duration : undefined
); // beep
} // public generateAudio

public stop () {
this.lastGeneration = true;
} // stop

public replayLastGeneration () {
let alive = 0;

this.travelWorld ((cell: Cell) => {
cell = this.world[cell.row][cell.col];
this.generateAudio(cell, true, 0.5);
if (cell.live) alive++;
}); // travel

if (alive > 0 && this.options.replay) this.options.replay.call (this, alive);
} // replayLastGeneration


} // public class GameOfLife
} // module Conway

/*var game = new Conway.GameOfLife({
gridSize: 15,
audioDurationFactor: 0.002, // each tone lasts for audioDurationFactor * animationRate
animationRate: 60, // milliseconds between generations
}); // game
*/
