/* Game of Life
* Implemented in TypeScript
* To learn more about TypeScript, please visit http://www.typescriptlang.org/
*/
var Conway;
(function (Conway) {
    var Cell = /** @class */ (function () {
        function Cell(row, col, live) {
            this.row = row;
            this.col = col;
            this.live = live;
        } //  constructor
        return Cell;
    }()); // class Cell
    Conway.Cell = Cell;
    var GameOfLife = /** @class */ (function () {
        function GameOfLife(options) {
            this.options = options;
            this.gridSize = options.gridSize || 10;
            this.canvasSize = 600;
            this.lineColor = '#cdcdcd';
            this.liveColor = '#666';
            this.deadColor = '#eee';
            this.initialLifeProbability = options.initialLifeProbability || 0.5;
            this.animationRate = options.animationRate || 60;
            this.cellSize = 0;
            this.generations = 0;
            this.lastGeneration = false;
            this.audioDurationFactor = options.audioDurationFactor || 0.005;
            this.liveFrequency = options.liveFrequency || 1200;
            this.deadFrequency = options.deadFrequency || 400;
            this.initialLiveCells = options.liveCells ? getInitialLiveCells(options.liveCells) : [];
            this.testMode = this.options.testMode;
            this.audio = options.audio || new AudioContext();
            this.audioEnabled = options.liveFrequency > 0 || options.deadFrequency > 0;
            this.audio.listener.setOrientation(0.0, 0.0, -1.0, 0.0, 1.0, 0.0);
            this.audio.listener.setPosition(0, 0, 0);
            this.world = this.createWorld(this.initialLiveCells);
            if (!this.initialLiveCells && this.options.alive)
                this.options.alive.call(this, this.countLiveCells());
            //this.audio.suspend ();
            this.panners = createPanners.call(this, this.gridSize);
            this.liveTone = createOscillator.call(this, this.liveFrequency);
            this.deadTone = createOscillator.call(this, this.deadFrequency);
            this.audio.resume();
            this.circleOfLife(this.testMode);
            function getInitialLiveCells(cells) {
                return cells.split(" ").map(function (cell) { return cell.split(",").map(function (n) { return Number(n); }); } // map
                ); // map
            } // getInitialLiveCells 
            function createOscillator(frequency) {
                var osc = this.audio.createOscillator();
                osc.frequency.value = frequency;
                osc.start();
                return osc;
            } // createOscillator
            function createPanners(gridSize) {
                var output = this.audio.createGain();
                output.gain.value = (this.testMode) ? 1 / this.countLiveCells() : 1 / (gridSize * gridSize);
                output.connect(this.audio.destination);
                var result = [];
                for (var r = 0; r < gridSize; r++) {
                    var row = [];
                    for (var c = 0; c < gridSize; c++) {
                        var panner = createPanner(this.audio, r, c, gridSize);
                        panner.connect(output);
                        row.push(panner);
                    } // for col
                    result.push(row);
                } // for row
                return result;
                function createPanner(audio, row, col, gridSize) {
                    var panner = audio.createPanner();
                    panner.setOrientation(0, 0, 0);
                    panner.panningModel = "HRTF";
                    panner.distanceModel = "linear";
                    //panner.distanceModel = 'inverse';
                    panner.refDistance = 1;
                    panner.maxDistance = 10000;
                    panner.rolloffFactor = 1;
                    panner.coneInnerAngle = 360;
                    panner.coneOuterAngle = 0;
                    panner.coneOuterGain = 0;
                    panner.setPosition(row - gridSize / 2, 0, col - gridSize / 2);
                    return panner;
                } // createPanner
            } // createPanners
        } // GameOfLife constructor
        GameOfLife.prototype.createWorld = function (liveCells) {
            var _this = this;
            return this.travelWorld(function (cell) {
                if (liveCells.length > 0)
                    cell.live = includes(liveCells, cell.row, cell.col);
                else
                    cell.live = Math.random() < _this.initialLifeProbability;
                return cell;
                function includes(a, r, c) {
                    return a.find(function (x) { return x[0] === r && x[1] === c; });
                } // testIncludes
            }); // callback
        }; //  public createWorld
        GameOfLife.prototype.countLiveCells = function () {
            var _this = this;
            var count = 0;
            this.travelWorld(function (cell) { return count += (_this.world[cell.row][cell.col].live ? 1 : 0); });
            return count;
        }; // countLiveCells 
        GameOfLife.prototype.currentLiveCells = function (toString) {
            var _this = this;
            if (toString === void 0) { toString = false; }
            var cells;
            cells = (toString) ? "" : [];
            this.travelWorld(function (cell) {
                if (_this.world[cell.row][cell.col].live) {
                    if (toString)
                        cells += cell.row + "," + cell.col + " ";
                    else
                        cells.push([cell.row, cell.col]);
                } // if
            }); // travelWorld
            return cells;
        }; // public currentLiveCells
        GameOfLife.prototype.circleOfLife = function (testMode) {
            var _this = this;
            if (testMode === void 0) { testMode = false; }
            var alive = 0;
            this.running = true;
            //this.audio.suspend ();
            this.world = this.travelWorld(function (cell) {
                cell = _this.world[cell.row][cell.col];
                _this.draw(cell);
                if (_this.audioEnabled)
                    _this.generateAudio(cell);
                if (!testMode)
                    cell = _this.resolveNextGeneration(cell);
                if (cell.live)
                    alive++;
                return cell;
            }); // travelWorld
            var stopCallback = this.options.stop.bind(this);
            var deadCallback = this.options.dead.bind(this);
            var aliveCallback = this.options.alive.bind(this);
            this.generations += 1;
            this.running = false;
            //this.audio.resume ();
            if (alive === 0) {
                this.disconnectAll();
                if (deadCallback)
                    deadCallback(this.generations);
                return;
            }
            else if (this.lastGeneration) {
                this.disconnectAll();
                if (stopCallback)
                    stopCallback(this.generations, alive, this.currentLiveCells());
                this.lastGeneration = false;
                return;
            }
            else if (testMode) {
                setTimeout(function () { return _this.disconnectAll(); }, 500);
                //if (aliveCallback) aliveCallback.call (this, alive);
                return;
            } // if
            // keep on truckin
            setTimeout(function () { return _this.circleOfLife(); }, this.animationRate);
        }; // public circleOfLife
        GameOfLife.prototype.resolveNextGeneration = function (cell) {
            var count = this.countNeighbors(cell);
            var newCell = new Cell(cell.row, cell.col, cell.live);
            if (count < 2 || count > 3)
                newCell.live = false;
            else if (count == 3)
                newCell.live = true;
            return newCell;
        }; // public resolveNextGeneration
        GameOfLife.prototype.countNeighbors = function (cell) {
            var neighbors = 0;
            for (var row = -1; row <= 1; row++) {
                for (var col = -1; col <= 1; col++) {
                    if (row == 0 && col == 0)
                        continue;
                    if (this.isAlive(cell.row + row, cell.col + col)) {
                        neighbors++;
                    } // if
                } // for col
            } //  for row
            return neighbors;
        }; // public countNeighbors
        GameOfLife.prototype.isAlive = function (row, col) {
            if (row < 0 || col < 0 || row >= this.gridSize || col >= this.gridSize)
                return false;
            return this.world[row][col].live;
        }; // public isAlive
        GameOfLife.prototype.travelWorld = function (callback) {
            var result = [];
            for (var row = 0; row < this.gridSize; row++) {
                var rowData = [];
                for (var col = 0; col < this.gridSize; col++) {
                    rowData.push(callback(new Cell(row, col, false)));
                } // for col
                result.push(rowData);
            } // for row
            return result;
        }; // travelWorld
        GameOfLife.prototype.draw = function (cell) {
            if (this.context == null)
                this.context = this.createDrawingContext();
            if (this.cellSize == 0)
                this.cellSize = this.canvasSize / this.gridSize;
            this.context.strokeStyle = this.lineColor;
            this.context.strokeRect(cell.row * this.cellSize, cell.col * this.cellSize, this.cellSize, this.cellSize);
            this.context.fillStyle = cell.live ? this.liveColor : this.deadColor;
            this.context.fillRect(cell.row * this.cellSize, cell.col * this.cellSize, this.cellSize, this.cellSize);
        }; // public draw   
        GameOfLife.prototype.createDrawingContext = function () {
            var canvas = document.getElementById('conway-canvas');
            if (canvas == null) {
                canvas = document.createElement('canvas');
                canvas.id = 'conway-canvas';
                canvas.width = this.canvasSize;
                canvas.height = this.canvasSize;
                document.body.appendChild(canvas);
            } // if
            return canvas.getContext('2d');
        }; // public createDrawingContext
        GameOfLife.prototype.generateAudio = function (cell, duration) {
            if (duration === void 0) { duration = 0; }
            var panner = this.panners[cell.row][cell.col];
            try {
                this.liveTone.disconnect(panner);
            }
            catch (e) { }
            try {
                this.deadTone.disconnect(panner);
            }
            catch (e) { }
            if (cell.live && this.liveFrequency > 0)
                this.liveTone.connect(panner);
            else if (this.deadFrequency > 0)
                this.deadTone.connect(panner);
            document.dispatchEvent(new CustomEvent("playCell", { detail: {
                    cx: cell.row, cy: cell.col,
                    px: panner.positionX.value, py: panner.positionZ.value,
                    live: cell.live
                } // detail
            })); // dispatch
        }; // public generateAudio
        GameOfLife.prototype.stop = function () {
            this.lastGeneration = true;
        }; // stop
        GameOfLife.prototype.replayLastGeneration = function () {
            this.circleOfLife(true);
            /*let alive = 0;
            
            this.travelWorld ((cell: Cell) => {
            cell = this.world[cell.row][cell.col];
            this.generateAudio(cell);
            if (cell.live) alive++;
            }); // travel
            setTimeout (() => this.disconnectAll(), 500);
            
            if (alive > 0 && this.options.replay) this.options.replay.call (this, alive);
            */
        }; // replayLastGeneration
        GameOfLife.prototype.playPattern = function (coordinates, dt) {
            var _this = this;
            if (dt === void 0) { dt = 500; }
            if (coordinates.length > 0) {
                var c = coordinates.shift();
                this.generateAudio(new Cell(c[0], c[1], true));
                setTimeout(function () {
                    _this.disconnectAll();
                    setTimeout(function () { return _this.playPattern(coordinates, dt); }, dt);
                }, dt);
            }
            else {
                setTimeout(function () { return _this.disconnectAll(); }, dt || 500);
            } // if
        }; // playPattern
        GameOfLife.prototype.disconnectAll = function () {
            this.liveTone.disconnect();
            this.deadTone.disconnect();
        }; // public disconnectAll
        return GameOfLife;
    }()); // public class GameOfLife
    Conway.GameOfLife = GameOfLife;
})(Conway || (Conway = {})); // module Conway
/*var game = new Conway.GameOfLife({
gridSize: 15,
audioDurationFactor: 0.002, // each tone lasts for audioDurationFactor * animationRate
animationRate: 60, // milliseconds between generations
}); // game
*/
