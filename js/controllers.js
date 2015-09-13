var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Base64Binary = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    /* will return a  Uint8Array type */
    decodeArrayBuffer: function (input) {
        var bytes = (input.length / 4) * 3;
        var ab = new ArrayBuffer(bytes);
        this.decode(input, ab);
        return ab;
    },
    decode: function (input, arrayBuffer) {
        //get last chars to see if are valid
        var lkey1 = this._keyStr.indexOf(input.charAt(input.length - 1));
        var lkey2 = this._keyStr.indexOf(input.charAt(input.length - 2));
        var bytes = (input.length / 4) * 3;
        if (lkey1 == 64)
            bytes--; //padding chars, so skip
        if (lkey2 == 64)
            bytes--; //padding chars, so skip
        var uarray;
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        var j = 0;
        if (arrayBuffer)
            uarray = new Uint8Array(arrayBuffer);
        else
            uarray = new Uint8Array(bytes);
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        for (i = 0; i < bytes; i += 3) {
            //get the 3 octects in 4 ascii chars
            enc1 = this._keyStr.indexOf(input.charAt(j++));
            enc2 = this._keyStr.indexOf(input.charAt(j++));
            enc3 = this._keyStr.indexOf(input.charAt(j++));
            enc4 = this._keyStr.indexOf(input.charAt(j++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            uarray[i] = chr1;
            if (enc3 != 64)
                uarray[i + 1] = chr2;
            if (enc4 != 64)
                uarray[i + 2] = chr3;
        }
        return uarray;
    }
};
var $cmd;
var $msg;
function scopeApply(scope) {
    try {
        scope.$apply();
    }
    catch (e) {
    }
}
var DataService = (function () {
    function DataService() {
    }
    DataService.prototype.get = function () {
        return this.content;
    };
    return DataService;
})();
var UndoType;
(function (UndoType) {
    UndoType[UndoType["SWITCH"] = 0] = "SWITCH";
    UndoType[UndoType["INVERT"] = 1] = "INVERT";
    UndoType[UndoType["FACTOR"] = 2] = "FACTOR";
    UndoType[UndoType["SKIP"] = 3] = "SKIP";
})(UndoType || (UndoType = {}));
var Command = (function () {
    function Command() {
        this.history = [];
        this.index = 0;
        this.commandMap = new Map();
        this.undoMap = new Map();
        this.callerMap = new Map();
        $cmd = this;
    }
    Command.prototype.run = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.history.push({ name: name, args: args });
        var func = this.commandMap[name];
        if (func) {
            func.apply(this.callerMap[name], args);
        }
        else {
            console.warn("unregistered command: " + name);
        }
        this.index++;
        this.updateUndoRedoState();
    };
    Command.prototype.map = function (name, callback, caller, undoType) {
        this.commandMap[name] = callback;
        this.callerMap[name] = caller;
        if (undoType) {
            this.setUndoType(name, undoType);
        }
    };
    Command.prototype.setUndoType = function (name, type) {
        this.undoMap[name] = type;
    };
    Command.prototype.mapUndo = function (name, callback) {
        this.undoMap[name] = callback;
    };
    Command.prototype.undo = function () {
        this.index--;
        var action = this.history[this.index];
        var func = this.undoMap[action.name];
        this.updateUndoRedoState();
        if (func == null)
            return;
        switch (func) {
            case 0 /* SWITCH */:
                var fnDo = this.commandMap[action.name];
                fnDo.call(this.callerMap[action.name], action.args[1], action.args[0]);
                break;
            case 1 /* INVERT */:
                var fnDo = this.commandMap[action.name];
                fnDo.call(this.callerMap[action.name], -action.args[0], -action.args[1]);
                break;
            case 2 /* FACTOR */:
                var fnDo = this.commandMap[action.name];
                fnDo.call(this.callerMap[action.name], 1 / action.args[0], 1 / action.args[1]);
                break;
            case 3 /* SKIP */:
                this.undo();
                break;
            default:
                func.apply(this.callerMap[action.name], action.args);
                break;
        }
    };
    Command.prototype.redo = function () {
        if (this.history.length == this.index)
            return;
        var action = this.history[this.index];
        var funcUndo = this.undoMap[action.name];
        if (funcUndo == 3 /* SKIP */) {
            this.index++;
            this.redo();
            return;
        }
        var func = this.commandMap[action.name];
        if (func) {
            func.apply(this.callerMap[action.name], action.args);
        }
        else {
            console.warn("unregistered redo: " + name);
        }
        this.index++;
        this.updateUndoRedoState();
    };
    Command.prototype.updateUndoRedoState = function () {
        msg.send('update-undo-redo-state', this.index > 0, this.index < this.history.length);
    };
    return Command;
})();
var ObjectType;
(function (ObjectType) {
    ObjectType[ObjectType["SYMOBOL"] = 0] = "SYMOBOL";
    ObjectType[ObjectType["TEXT"] = 1] = "TEXT";
})(ObjectType || (ObjectType = {}));
var DisplayObject = (function () {
    function DisplayObject() {
        this.selected = false;
        this.type = "";
        this.name = "";
        this.raw = null;
    }
    return DisplayObject;
})();
var CanvasService = (function () {
    function CanvasService() {
        this.children = [];
    }
    CanvasService.prototype.add = function (type, object) {
        this.root.add(object);
    };
    return CanvasService;
})();
var ToolsController = (function () {
    function ToolsController($scope, $rootScope, $http, base64) {
        this.$scope = $scope;
        this.$rootScope = $rootScope;
        this.$http = $http;
        this.base64 = base64;
        this.isSaving = false;
        this.$scope.$ = this;
        document.getElementById('fileupload').addEventListener('change', this.onFileSelect, false);
        msg.on('confirmation-clicked', this.onSaveProjectConfirm, this);
        keys.bindCtrl(73, this.addSymobol, this);
        keys.bindCtrl(84, this.addText, this);
        keys.bindCtrl(85, this.uploadImage, this);
        keys.bindCtrl(68, this.downloadLogo, this);
        keys.bindCtrl(83, this.saveProject, this);
        keys.bindKey(112, this.onTutorialClick, this);
    }
    // this is not supposed to be here!
    ToolsController.prototype.onTutorialClick = function () {
        open("http://www.onlinelogomaker.com/tutorial", "_blank");
    };
    ToolsController.prototype.addSymobol = function () {
        msg.send('open-symbols');
    };
    ToolsController.prototype.addText = function () {
        msg.send('open-popup');
        msg.send('open-addtext');
        console.log('addtext.clciked');
    };
    ToolsController.prototype.uploadImage = function () {
        $('#fileupload').trigger('click');
    };
    ToolsController.prototype.downloadLogo = function () {
        msg.send('open-popup', 'downloadlogo');
    };
    ToolsController.prototype.saveProject = function () {
        msg.send('open-popup', 'confirmation');
        this.isSaving = true;
    };
    ToolsController.prototype.onSaveProjectConfirm = function (val) {
        if (!this.isSaving || !val)
            return;
        this.isSaving = false;
        var SAVE_URL = "http://www.onlinelogomaker.com/applet_scripts/SaveUserData.php?type=projects";
        var user_id = "315986";
        var project_name = "project_1429496378548.olm";
        var url = SAVE_URL + "&user_id=" + user_id + "&name=" + project_name;
        function lengthInUtf8Bytes(str) {
            // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
            var m = encodeURIComponent(str).match(/%[89ABab]/g);
            return str.length + (m ? m.length : 0);
        }
        var projectData = JSON.stringify(canvas.toJSON([]));
        $.ajax({
            type: 'POST',
            url: url,
            dataType: 'json',
            data: projectData,
            headers: {
                "Content-Type": "text/plain",
            },
            processData: false
        }).then(function (data) {
            console.log("Project Saved");
        });
        var img = canvas.toDataURL('png');
        img = img.replace("data:image/png;base64,", "");
        // img = Base64.decode(img);
        var imgRaw = Base64Binary.decode(img, null);
        //var imgRaw = atob(img);
        console.log(imgRaw);
        $.ajax({
            type: 'POST',
            url: url.replace(".olm", ".png"),
            dataType: 'json',
            data: imgRaw,
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            processData: false
        }).then(function (data) {
            console.log("Project Saved");
        });
        console.log(img);
    };
    ToolsController.prototype.onFileSelect = function (evt) {
        var files = evt.target.files; // FileList object
        for (var i = 0, f; f = files[i]; i++) {
            // Only process image files.
            if (!f.type.match('image.*')) {
                continue;
            }
            var reader = new FileReader();
            // Closure to capture the file information.
            reader.onload = (function (theFile) {
                return function (e) {
                    // Render thumbnail.
                    msg.send('add-image', e.target.result);
                    console.log('send add iamge');
                };
            })(f);
            // Read in the image file as a data URL.
            reader.readAsDataURL(f);
        }
    };
    return ToolsController;
})();
function htmlString(str) {
    return "<h1>" + str + "</h1>";
}
var SymbolsController = (function () {
    function SymbolsController($scope, $http) {
        this.$scope = $scope;
        this.$http = $http;
        this.selectedCategory = 0;
        this.selectedSymbol = 0;
        $scope.visible = false;
        this.categories = data.categories;
        msg.on('open-symbols', this.open, this);
        this.$scope.$ = this;
        this.htmlString = htmlString(svgImg);
        this.$http.get('assets/symbols/animals.json').then(function (res) {
            var symbolsData = [];
            for (var i = 0; i < res.data.length; i++) {
                var img = '<svg width="100%" height="100%"  viewBox="0 0 200 200">';
                for (var s in res.data[i].svgs) {
                    img += res.data[i].svgs[s];
                }
                img += '</svg>';
                symbolsData.push(img);
            }
            $scope.$.categories[0].content = symbolsData;
        });
    }
    SymbolsController.prototype.open = function () {
        this.$scope.visible = true;
    };
    SymbolsController.prototype.getCategoryStyle = function (index) {
        return index == this.selectedCategory ? 'category-item-selected' : '';
    };
    SymbolsController.prototype.getSymbolStyle = function (index) {
        return index == this.selectedSymbol ? 'symbol-item-selected' : '';
    };
    SymbolsController.prototype.getSelectedCategorySymbols = function () {
        return this.categories[this.selectedCategory].content;
    };
    SymbolsController.prototype.onCategoryClick = function (index) {
        this.categories[this.selectedCategory].cssClass = "";
        this.selectedCategory = index;
        this.selectedSymbol = 0;
        this.categories[this.selectedCategory].cssClass = "category-item-selected";
    };
    SymbolsController.prototype.onSymbolClick = function (index) {
        this.selectedSymbol = index;
    };
    SymbolsController.prototype.onCancelClick = function () {
        this.$scope.visible = false;
        msg.send('close-popups');
    };
    SymbolsController.prototype.onOkClick = function () {
        msg.send('add-symbol', this.selectedCategory, this.selectedSymbol, this.getSelectedCategorySymbols()[this.selectedSymbol]);
        this.$scope.visible = false;
        msg.send('close-popups');
    };
    return SymbolsController;
})();
var PopupsController = (function () {
    function PopupsController($scope) {
        this.$scope = $scope;
        msg.on('open-symbols', this.open, this);
        msg.on('close-popups', this.close, this);
        msg.on('open-popups', this.open, this);
        msg.on('open-addtext', this.open, this);
        msg.on('open-popup', this.openPopup, this);
    }
    PopupsController.prototype.open = function () {
        this.$scope.visible = true;
    };
    PopupsController.prototype.openPopup = function (name) {
        console.log('openPopup: ' + 'open-' + name);
        this.$scope.visible = true;
        msg.send('open-' + name);
    };
    PopupsController.prototype.close = function () {
        this.$scope.visible = false;
    };
    return PopupsController;
})();
var CanvasController = (function () {
    function CanvasController($scope, $cmd) {
        this.$scope = $scope;
        this.$cmd = $cmd;
        $scope.$ = this;
        CanvasController.instance = this;
        canvas = this.canvas = new fabric.Canvas('canvas');
        canvas.setWidth(800);
        canvas.setHeight(600);
        //var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <defs/>\n  <g>\n    <path stroke=\"none\" fill=\"#6633ff\" d=\"M31.4 0.35 Q34.45 1.25 36.6 4.35 37.9 6.3 38.5 8.65 39.1 10.85 38.95 13.25 38.85 14.9 38.35 16.4 L38.15 17.05 Q37.55 18.8 36.55 20.2 L38.1 21.4 39.4 22.9 Q40.45 24.4 40.45 25.8 40.5 27.15 39.65 28.15 38.95 29 37.75 29.35 L35.1 29.65 32.65 29.2 Q31.5 28.8 30.45 28.2 28.5 27 27.35 25.4 L26.85 24.55 26.55 23.75 Q25.1 23.2 23.85 22.2 22.65 21.25 21.75 19.9 20.65 18.3 20.05 16.4 L19.6 14.75 Q19.3 13.1 19.4 11.4 19.45 9.5 20 7.8 20.7 5.4 22.15 3.55 23.65 1.7 25.7 0.8 28.5 -0.5 31.4 0.35 M35.1 6.7 Q33.3 4.1 30.75 3.2 28.35 2.35 25.95 3.2 24.15 3.8 22.75 5.3 21.4 6.75 20.65 8.8 20.15 10.3 20 11.95 19.9 13.5 20.15 15.05 L20.5 16.4 Q21 18.25 22.1 19.85 L24.1 22 Q25.25 22.9 26.6 23.35 L26.95 24.15 27.4 24.9 Q28.45 26.45 30.2 27.45 L32.2 28.3 34.4 28.65 36.7 28.25 Q37.7 27.85 38.3 27.05 38.95 26.15 38.85 24.95 38.8 23.65 37.9 22.35 L36.75 21.05 Q36.15 20.5 35.4 20.05 36.25 18.8 36.7 17.3 L36.95 16.4 37.2 14.05 Q37.3 12.1 36.75 10.25 36.25 8.35 35.1 6.7 M8.95 18.6 L11.4 18.3 14.75 18.55 Q17.65 19.1 19.9 20.65 21.3 21.6 22.2 22.8 23.25 24.05 23.75 25.45 L24.55 25.8 25.4 26.3 Q27.05 27.45 28.2 29.35 L29.2 31.55 29.7 34 Q29.8 35.5 29.4 36.7 29 37.9 28.15 38.6 27.15 39.45 25.8 39.4 24.4 39.35 22.9 38.3 22.1 37.8 21.4 37.05 L20.25 35.45 Q18.8 36.45 17.05 37.1 15.25 37.75 13.25 37.85 L8.95 37.5 8.65 37.45 Q6.3 36.85 4.4 35.5 1.25 33.35 0.35 30.3 -0.5 27.45 0.8 24.6 1.7 22.6 3.6 21.1 5.4 19.65 7.8 18.9 L8.95 18.6 M5.3 21.65 Q3.8 23.05 3.2 24.85 2.35 27.3 3.2 29.7 4.1 32.25 6.75 34.05 7.75 34.75 8.95 35.25 L10.25 35.7 14.05 36.15 17.3 35.6 Q18.8 35.15 20.05 34.35 L21.1 35.7 22.35 36.8 Q23.65 37.7 24.95 37.8 26.15 37.85 27.05 37.2 27.85 36.65 28.25 35.6 28.7 34.6 28.65 33.3 28.65 32.25 28.3 31.15 L27.45 29.15 Q26.4 27.35 24.9 26.3 L24.15 25.85 23.4 25.55 Q22.9 24.2 22 23 21.1 21.9 19.85 21 17.7 19.55 15.05 19.1 L12 18.95 8.95 19.55 8.8 19.6 Q6.75 20.35 5.3 21.65\"/>\n  </g>\n</svg>";
        //console.log(svg.toString());
        /* fabric.loadSVGFromString(svg.toString(), function (objects, options) {
             var obj = fabric.util.groupSVGElements(objects, options);
             // console.log(JSON.stringify(obj));
             canvas.add(obj).renderAll();
             canvas.setActiveObject(obj);
             // console.log("loaded");
         });
    
         var circle = new fabric.Circle({
             radius: 100,
             fill: '#eef',
             scaleY: 0.5,
             originX: 'center',
             originY: 'center'
         });
         canvas.add(circle);
         */
        canvas.on('object:moving', this.onObjectMove);
        canvas.on('object:selected', this.onObjectSelect);
        msg.on('add-symbol', this.addSymbol, this);
        msg.on('add-image', this.addImage, this);
        msg.on('add-text', this.addText, this);
        msg.on('save-canvas', this.saveCanvas, this);
        msg.on('update-undo-redo-state', this.updateUndoRedoState, this);
        $cmd.map('move', this.move, this);
        $cmd.setUndoType('move', 1 /* INVERT */);
        $cmd.map('shadow-color', this.shadowColor, this, 0 /* SWITCH */);
        $cmd.map('add-symbol', this.addSymbol);
        $cmd.map('scale', this.scale, this, 2 /* FACTOR */);
        $cmd.map('rotate', this.rotate, this, 1 /* INVERT */);
        $cmd.map('duplicate', this.duplicate, this, 3 /* SKIP */);
        $cmd.map('add-object', function (obj) {
            canvas.add(obj).renderAll();
            canvas.setActiveObject(obj);
            msg.send('object-added', obj);
        }, this);
        $cmd.mapUndo('add-object', canvas.remove);
        $cmd.map('text-color', this.textColor, this, 0 /* SWITCH */);
        $cmd.map('text-font', this.textFont, this);
        $scope.undoActive = false;
        $scope.redoActive = false;
        keys.bindCtrl(90, this.onUndoClick, this);
        keys.bindCtrl(89, this.onRedoClick, this);
    }
    CanvasController.prototype.updateUndoRedoState = function (b1, b2) {
        this.$scope.undoActive = b1;
        this.$scope.redoActive = b2;
    };
    CanvasController.prototype.duplicate = function () {
        var object = fabric.util["object"].clone(canvas.getActiveObject());
        object.set("top", object.top + 5);
        object.set("left", object.left + 5);
        $cmd.run('add-object', object);
    };
    CanvasController.prototype.rotate = function (angle) {
        this.selected.rotate(this.selected.getAngle() + angle);
        canvas.renderAll();
    };
    CanvasController.prototype.move = function (x, y) {
        this.selected.setTop(this.selected.top + y);
        this.selected.setLeft(this.selected.left + x);
        canvas.renderAll();
    };
    CanvasController.prototype.scale = function (x, y) {
        this.selected.setScaleX(x);
        this.selected.setScaleY(y);
        msg.send('update-scale');
        canvas.renderAll();
    };
    CanvasController.prototype.shadowColor = function (lastVal, val) {
        var shadow = this.selected["object"];
        if (!shadow)
            return;
        shadow.color = '#' + val;
        this.selected["object"](shadow);
        canvas.renderAll();
    };
    CanvasController.prototype.textColor = function (lastVal, val) {
        var textObj = this.selected;
        console.log('textColor: ' + textObj);
        if (!textObj)
            return;
        console.log('textColor');
        textObj.setColor('#' + val);
        canvas.renderAll();
    };
    CanvasController.prototype.textFont = function (val) {
        var textObj = this.selected;
        if (!textObj)
            return;
        textObj.fontFamily = val;
        canvas.renderAll();
    };
    CanvasController.prototype.addSymbol = function (categoryIndex, symbolIndex, svg) {
        var _this = this;
        fabric.loadSVGFromString(svg, function (objects, options) {
            var obj = fabric.util.groupSVGElements(objects, options);
            $cmd.run('add-object', obj);
            console.log("svg loaded");
        });
    };
    CanvasController.prototype.addImage = function (url) {
        var _this = this;
        fabric.Image.fromURL(url, function (oImg) {
            $cmd.run('add-object', oImg);
        });
    };
    CanvasController.prototype.addText = function (value) {
        var text = new fabric.Text(value, { left: 100, top: 100 });
        $cmd.run('add-object', text);
    };
    CanvasController.prototype.addListeners = function (obj) {
        obj.on('selected', this.onObjectMove);
        obj.on('moving', this.onObjectMove);
    };
    CanvasController.prototype.onObjectSelect = function (e) {
        console.log("select: ", e, this);
        CanvasController.instance.selected = e.target;
        canvas["object"] = e.target;
    };
    CanvasController.prototype.onObjectMove = function (e) {
        console.log(e.target.get('left'), e.target.get('top'));
        msg.send('transformed', e);
    };
    CanvasController.prototype.onRedoClick = function () {
        this.$cmd.redo();
    };
    CanvasController.prototype.onUndoClick = function () {
        this.$cmd.undo();
    };
    CanvasController.prototype.saveCanvas = function () {
        var bound = this.getRectBounds();
        var copy = document.createElement('canvas').getContext('2d');
        var trimHeight = bound.bottom - bound.top, trimWidth = bound.right - bound.left, trimmed = canvas.getContext().getImageData(bound.left, bound.top, trimWidth, trimHeight);
        copy.canvas.width = trimWidth;
        copy.canvas.height = trimHeight;
        copy.putImageData(trimmed, 0, 0);
        var image = copy.canvas.toDataURL();
        var header = 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=logo.png';
        image = image.replace('data:image/png', header);
        document.getElementById("dl")["object"] = image;
        //        window.open(image);
    };
    CanvasController.prototype.getRectBounds = function () {
        var width = canvas.getWidth();
        var height = canvas.getHeight();
        var pixels = canvas.getContext().getImageData(0, 0, width, height);
        var l = pixels.data.length;
        var bound = {
            top: null,
            left: null,
            right: null,
            bottom: null
        };
        var x, y;
        for (var i = 0; i < l; i += 4) {
            if (pixels.data[i + 3] !== 0) {
                x = (i / 4) % width;
                y = ~~((i / 4) / width);
                if (bound.top === null) {
                    bound.top = y;
                }
                if (bound.left === null) {
                    bound.left = x;
                }
                else if (x < bound.left) {
                    bound.left = x;
                }
                if (bound.right === null) {
                    bound.right = x;
                }
                else if (bound.right < x) {
                    bound.right = x;
                }
                if (bound.bottom === null) {
                    bound.bottom = y;
                }
                else if (bound.bottom < y) {
                    bound.bottom = y;
                }
            }
        }
        return bound;
    };
    return CanvasController;
})();
var TransformController = (function () {
    function TransformController($scope, $cmd) {
        this.$scope = $scope;
        this.$cmd = $cmd;
        TransformController.instance = this;
        canvas.on('object:moving', this.onObjectMove);
        canvas.on('object:scaling', this.onObjectScale);
        canvas.on('object:selected', this.onObjectSelect);
        $scope.$watch('x', this.onChangePosition);
        $scope.$watch('y', this.onChangePosition);
        $scope.$watch('width', this.onChangeScale);
        $scope.$watch('height', this.onChangeScale);
        $scope.x = 0;
        $scope.y = 0;
        $scope.width = 0;
        $scope.height = 0;
        msg.on('update-scale', function () {
            this.$scope.width = this.selected.get('width') * this.selected.scaleX;
            this.$scope.height = this.selected.get('height') * this.selected.scaleY;
            ;
            //this.$scope.$apply();
        }, this);
    }
    TransformController.prototype.onChangeScale = function () {
        var _this = TransformController.instance;
        if (!_this.selected)
            return;
        _this.$cmd.run('scale', _this.$scope.width / _this.selected.width, _this.$scope.height / _this.selected.height);
    };
    TransformController.prototype.onObjectSelect = function (e) {
        msg.send('object-selected', e.target);
        var _this = TransformController.instance;
        _this.selected = e.target;
        _this.$scope.x = e.target.get('left');
        _this.$scope.y = e.target.get('top');
        _this.$scope.width = e.target.get('width') * e.target.scaleX;
        _this.$scope.height = e.target.get('height') * e.target.scaleY;
        //_this.$scope.$apply();
    };
    TransformController.prototype.onObjectMove = function (e) {
        var _this = TransformController.instance;
        _this.$scope.x = e.target.get('left');
        _this.$scope.y = e.target.get('top');
        _this.$scope.$apply();
    };
    TransformController.prototype.onObjectScale = function (e) {
        var _this = TransformController.instance;
        _this.$scope.width = e.target.get('width') * e.target.scaleX;
        _this.$scope.height = e.target.get('height') * e.target.scaleY;
        ;
        _this.$scope.$apply();
        console.log("scale", e.target.get('width'));
    };
    TransformController.prototype.onChangePosition = function () {
        var _this = TransformController.instance;
        console.log("change", _this.selected, _this.$scope.y);
        if (_this.selected == null)
            return;
        _this.selected.set('left', _this.$scope.x);
        _this.selected.set('top', _this.$scope.y);
        //_this.selected.set('scaleX', _this.$scope.width / _this.selected.width);
        //_this.selected.set('scaleY', _this.$scope.height / _this.selected.height);
        canvas.renderAll();
    };
    return TransformController;
})();
var ShadowController = (function () {
    function ShadowController($scope, $cmd) {
        var _this = this;
        this.$scope = $scope;
        this.$cmd = $cmd;
        this.enabled = false;
        this.selectedObject = null;
        this.shadowColor = '#FFFFFF';
        ShadowController.instance = this;
        $scope.$ = this;
        $scope.enabled = false;
        $scope.direction = 45;
        $scope.outset = 2;
        msg.on('object-selected', this.onObjectSelected, this);
        $scope.$watch("direction", function () { return _this.onChange(); });
        $scope.$watch("outset", function () { return _this.onChange(); });
        $scope.$watch("enabled", function () { return _this.onChange(); });
        $(".shadow-picker")["mlColorPicker"]({
            'onChange': function (val) {
                _this.onColorChange(val);
            }
        });
    }
    ShadowController.prototype.onColorChange = function (val) {
        $(".shadow-picker").css('background-color', "#" + val);
        this.$cmd.run('shadow-color', this.shadowColor, val);
        this.shadowColor = val;
    };
    ShadowController.prototype.onObjectSelected = function (obj) {
        this.selectedObject = obj;
        if (obj["shadow"] == null) {
            this.$scope.enabled = false;
            this.$scope.direction = 45;
            this.$scope.outset = 2;
        }
        else {
            this.$scope.enabled = true;
            this.$scope.direction = Math.atan2(obj["shadow"].offsetY, obj["shadow"].offsetX) / Math.PI * 180;
            this.$scope.outset = Math.round(obj["shadow"].offsetY / Math.cos(this.$scope.direction));
            this.onChange();
        }
        console.log("object selected: " + obj);
        // this.$scope.$apply();
    };
    ShadowController.prototype.onChange = function () {
        console.log("onChange: " + this.selectedObject + this.$scope.enabled);
        if (this.selectedObject == null)
            return;
        if (this.$scope.enabled) {
            var angle = this.$scope.direction / 180 * Math.PI;
            var shadow = {
                color: 'rgba(0,0,0,0.6)',
                blur: 5,
                offsetX: Math.cos(angle) * this.$scope.outset,
                offsetY: Math.sin(angle) * this.$scope.outset,
                opacity: 0.6,
                fillShadow: true,
                strokeShadow: true
            };
            this.selectedObject.setShadow(shadow);
        }
        else {
            this.selectedObject.setShadow(null);
        }
        canvas.renderAll();
    };
    ShadowController.prototype.onOnOffClick = function () {
        this.$scope.enabled = !this.$scope.enabled;
    };
    return ShadowController;
})();
var AddTextController = (function () {
    function AddTextController($scope) {
        this.$scope = $scope;
        $scope.text = "";
        $scope.visible = false;
        $scope.$ = this;
        msg.on('open-addtext', this.open, this);
    }
    AddTextController.prototype.open = function () {
        this.$scope.visible = true;
        this.$scope.text = "";
    };
    AddTextController.prototype.onCancelClick = function () {
        this.$scope.visible = false;
        msg.send('close-popups');
    };
    AddTextController.prototype.onOkClick = function () {
        if (this.$scope.text) {
            msg.send('add-text', this.$scope.text);
            this.$scope.visible = false;
            msg.send('close-popups');
        }
    };
    return AddTextController;
})();
var DownloadLogoController = (function () {
    function DownloadLogoController($scope) {
        this.$scope = $scope;
        this.width = 0;
        this.height = 0;
        this.constrainProportions = true;
        this.useWorkingAreaColor = false;
        $scope.text = "";
        $scope.visible = false;
        $scope.$ = this;
        msg.on('open-downloadlogo', this.open, this);
    }
    DownloadLogoController.prototype.open = function () {
        console.log('open-downloadlogo');
        this.$scope.visible = true;
        this.$scope.text = "";
    };
    DownloadLogoController.prototype.onCancelClick = function () {
        this.$scope.visible = false;
        msg.send('close-popups');
    };
    DownloadLogoController.prototype.onOkClick = function () {
        msg.send('save-canvas', this.width, this.height);
        this.$scope.visible = false;
        msg.send('close-popups');
    };
    return DownloadLogoController;
})();
var WelcomeController = (function () {
    function WelcomeController($scope) {
        var _this = this;
        this.$scope = $scope;
        this.visible = true;
        $scope.$ = this;
        msg.on('open-welcome', this.open, this);
        setTimeout(function () {
            if (!_this.visible)
                return;
            _this.visible = false;
            msg.send("close-popups");
            $scope.$apply();
        }, 5000);
        msg.send('open-popups');
    }
    WelcomeController.prototype.open = function () {
        this.$scope.visible = true;
        this.$scope.text = "";
    };
    WelcomeController.prototype.onOkClick = function () {
        console.log("onOkClick");
        this.visible = false;
        msg.send("close-popups");
    };
    return WelcomeController;
})();
var ModifyController = (function () {
    function ModifyController($scope, $cmd) {
        this.$scope = $scope;
        this.$cmd = $cmd;
        this.step = 2;
        this.factor = 1.1;
        this.angle = 10;
        $scope.$ = this;
    }
    ModifyController.prototype.moveUp = function () {
        this.$cmd.run('move', 0, -2);
    };
    ModifyController.prototype.moveDown = function () {
        this.$cmd.run('move', 0, 2);
    };
    ModifyController.prototype.moveLeft = function () {
        this.$cmd.run('move', -2, 0);
    };
    ModifyController.prototype.moveRight = function () {
        this.$cmd.run('move', 2, 0);
    };
    ModifyController.prototype.zoomIn = function () {
        this.$cmd.run('scale', this.factor * canvas["selected"].getScaleX(), this.factor * canvas["selected"].getScaleX());
    };
    ModifyController.prototype.zoomOut = function () {
        this.$cmd.run('scale', 1 / this.factor * canvas["selected"].getScaleX(), 1 / this.factor * canvas["selected"].getScaleX());
    };
    ModifyController.prototype.rotateCW = function () {
        $cmd.run('rotate', this.angle);
    };
    ModifyController.prototype.rotateCCW = function () {
        $cmd.run('rotate', -this.angle);
    };
    ModifyController.prototype.duplicate = function () {
        $cmd.run('duplicate');
    };
    return ModifyController;
})();
var LoginController = (function () {
    function LoginController($scope, $http) {
        this.$scope = $scope;
        this.$http = $http;
        this.GET_USER_URL = "http://www.onlinelogomaker.com/applet_scripts/GetUser.php";
        this.LOGIN_URL = "http://www.onlinelogomaker.com/applet_scripts/DoLogin.php";
        this.LOGOUT_URL = "http://www.onlinelogomaker.com/applet_scripts/DoLogout.php";
        this.$scope.$ = this;
        $scope.logged = false;
        $http.defaults.headers.common['Access-Control-Allow-Headers'] = '*';
        this.init();
    }
    LoginController.prototype.init = function () {
        var _this = this;
        $.post(this.GET_USER_URL, {
            username: this.$scope.username,
            password: this.$scope.password
        }, function (data, status) {
            var res = JSON.parse(xml2json(data, ''));
            try {
                if (res.root.user.id == -1) {
                    msg.send('open-popup', 'invalid-user-pass');
                    console.log("Not logged In");
                    _this.$scope.logged = false;
                    _this.$scope.$apply();
                }
                else {
                    _this.$scope.userfullname = res.root.user.name;
                    _this.$scope.user = res.root.user;
                    _this.$scope.logged = true;
                    _this.$scope.$apply();
                    console.log("Welcome, " + _this.$scope.userfullname);
                }
            }
            catch (e) {
                console.error(e);
            }
        }, "xml");
        function getQueryVariable(variable) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == variable) {
                    return pair[1];
                }
            }
            return (false);
        }
        var projectName = getQueryVariable("project");
        var projectDataUrl = "http://www.onlinelogomaker.com/applet_userdata/315986/projects/" + projectName;
        $.get(projectDataUrl, function (data) {
            canvas.loadFromJSON(JSON.parse(data), function () {
            });
        });
    };
    LoginController.prototype.onLoginClick = function () {
        var _this = this;
        $.post(this.LOGIN_URL, {
            username: this.$scope.username,
            password: this.$scope.password
        }, function (data, status) {
            function setCookie(cname, cvalue, exdays) {
                var d = new Date();
                d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
                var expires = "expires=" + d.toUTCString();
                document.cookie = cname + "=" + cvalue + "; " + expires;
            }
            //var cook = prompt("Coookie:", "");
            //setCookie('__cfduid', cook, 30);
            //console.log("cookie: " + getCookie("__cfduid"));
            var res = JSON.parse(xml2json(data, ''));
            if (res.error) {
                msg.send('open-popup', 'invalid-user-pass');
                console.log("Invalid username or password");
                _this.$scope.logged = false;
                _this.$scope.$apply();
            }
            else if (res.root) {
                _this.$scope.userfullname = res.root.user.name;
                console.log(_this);
                _this.$scope.logged = true;
                _this.$scope.$apply();
                console.log("Welcome, " + _this.$scope.userfullname);
            }
        }, "xml");
    };
    LoginController.prototype.onRegisterClick = function () {
        open("http://www.onlinelogomaker.com/register", "_blank");
    };
    LoginController.prototype.onLogoutClick = function () {
        var _this = this;
        $.post(this.LOGOUT_URL, function (data, status) {
            _this.$scope.logged = false;
            _this.$scope.user = null;
        });
    };
    LoginController.prototype.onAccountClick = function () {
        open("http://www.onlinelogomaker.com/account", "_blank");
    };
    LoginController.prototype.onFacebookClick = function () {
        open("https://www.facebook.com/sharer/sharer.php?s=100&p[url]=http://www.onlinelogomaker.com&p[images][0]=http://www.onlinelogomaker.com/images/favicon-cropped128.png&p[title]=Create+your+own+logo+for+free&p[summary]=Create%20your%20own%20logo%20now%20using%20Online%20Logo%20Maker!", "_blank");
    };
    LoginController.prototype.onTwitterClick = function () {
        open("https://twitter.com/intent/tweet?original_referer=&source=tweetbutton&text=RT+Create+cool+logos+for+free!&url=http://www.onlinelogomaker.com/&via=rlopes528", "_blank");
    };
    return LoginController;
})();
var ObjectsController = (function () {
    function ObjectsController($scope) {
        this.$scope = $scope;
        this.items = [];
        this.selectedIndex = -1;
        ObjectsController.instance = this;
        $scope.$ = this;
        msg.on('object-added', this.onObjectAdd, this);
        msg.on('object-selected', this.onObjectSelected, this);
        // canvas.on('object:selected', this.onObjectSelected);
        // canvas.on('selection:cleared', this.onSelectionCleared);
    }
    ObjectsController.prototype.onObjectSelected = function (obj) {
        //var _this = ObjectsController.instance;
        this.selectObject(obj, true);
        this.update();
        // scopeApply(_this.$scope);
    };
    ObjectsController.prototype.onSelectionCleared = function (e) {
        console.log(e);
        var _this = ObjectsController.instance;
        _this.selectObject(e.target, false);
        //_this.$scope.$apply();
        scopeApply(_this.$scope);
    };
    ObjectsController.prototype.onItemClick = function (index) {
        canvas.setActiveObject(this.items[index].raw);
        this.clearSelection();
        this.items[index].selected = true;
    };
    ObjectsController.prototype.onObjectAdd = function (obj) {
        //   var _this = ObjectsController.instance;
        var disObj = new DisplayObject();
        disObj.raw = obj;
        this.items.push(disObj);
        disObj.type = obj.type.toUpperCase();
        if (disObj.type == "PATH-GROUP")
            disObj.type = "SYMBOL";
        disObj.name = "OBJECT " + this.items.length;
        this.clearSelection();
        this.selectObject(obj, true);
    };
    ObjectsController.prototype.selectObject = function (obj, value) {
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].raw == obj)
                this.items[i].selected = value;
        }
    };
    ObjectsController.prototype.clearSelection = function () {
        for (var i = 0; i < this.items.length; i++) {
            this.items[i].selected = false;
        }
    };
    ObjectsController.prototype.update = function () {
        var activeObj = canvas.getActiveObject();
        for (var i = 0; i < this.items.length; i++) {
            this.items[i].selected = (this.items[i].raw == activeObj);
        }
        var activeGrp = canvas.getActiveGroup();
        if (activeGrp) {
            var objs = activeGrp.getObjects();
            for (var i = 0; i < objs.length; i++) {
                this.selectObject(objs[i], true);
            }
        }
    };
    return ObjectsController;
})();
var PopupController = (function () {
    function PopupController($scope) {
        this.$scope = $scope;
        this.id = "";
        $scope.$ = this;
        $scope.visible = false;
    }
    PopupController.prototype.init = function (id) {
        this.id = id;
        msg.on("open-" + id, this.open, this);
        msg.on("close-" + id, this.open, this);
    };
    PopupController.prototype.open = function () {
        this.$scope.visible = true;
        console.log("open-popup-" + this.id);
    };
    PopupController.prototype.close = function () {
        this.$scope.visible = false;
        msg.send('close-popups');
    };
    return PopupController;
})();
var ConfirmationController = (function (_super) {
    __extends(ConfirmationController, _super);
    function ConfirmationController($scope) {
        _super.call(this, $scope);
        this.init('confirmation');
    }
    ConfirmationController.prototype.onYesClick = function () {
        this.close();
        msg.send("confirmation-clicked", true);
    };
    ConfirmationController.prototype.onNoClick = function () {
        this.close();
        msg.send("confirmation-clicked", false);
    };
    return ConfirmationController;
})(PopupController);
var FontSelectionController = (function (_super) {
    __extends(FontSelectionController, _super);
    function FontSelectionController($scope) {
        _super.call(this, $scope);
        this.normalFonts = ['Amerika_Sans', 'Arial', 'Avondale_Inline'];
        this.eastFonts = ['Rix_Fantastic', 'Whoa'];
        this.items = [];
        this.init('fontselection');
        this.generateFontFaces();
        this.onNormalClick();
        for (var i = 0; i < this.normalFonts.length; i++) {
            var name = this.normalFonts[i];
            var filename = name.toLowerCase();
        }
        for (var i = 0; i < this.eastFonts.length; i++) {
        }
    }
    FontSelectionController.prototype.generateFontFaces = function () {
        var fontFaces = document.createElement('style');
        for (var i = 0; i < this.normalFonts.length; i++) {
            var name = this.normalFonts[i];
            this.items.push({ name: this.normalFonts[i] });
            fontFaces.appendChild(document.createTextNode("\
                @font-face {\
                    font-family: '" + name + "';\
                    src: url('assets/fonts/" + name.toLowerCase() + ".ttf') format(\"truetype\");\
                }\
            "));
        }
        for (var i = 0; i < this.eastFonts.length; i++) {
            var name = this.eastFonts[i];
            this.items.push({ name: this.eastFonts[i] });
            fontFaces.appendChild(document.createTextNode("\
                @font-face {\
                    font-family: '" + name + "';\
                    src: url('assets/fonts/" + name.toLowerCase() + ".ttf') format(\"truetype\");\
                }\
            "));
        }
        document.head.appendChild(fontFaces);
    };
    FontSelectionController.prototype.onNormalClick = function () {
        this.items = [];
        for (var i = 0; i < this.normalFonts.length; i++) {
            this.items.push({ name: this.normalFonts[i] });
        }
    };
    FontSelectionController.prototype.onEastClick = function () {
        this.items = [];
        for (var i = 0; i < this.eastFonts.length; i++) {
            this.items.push({ name: this.eastFonts[i] });
        }
    };
    FontSelectionController.prototype.onItemClick = function (index) {
        $cmd.run('text-font', this.items[index].name);
        setTimeout(function () {
            canvas.renderAll();
        }, 1000);
    };
    FontSelectionController.prototype.onOkClick = function () {
        this.close();
    };
    FontSelectionController.prototype.onCancelClick = function () {
        this.close();
    };
    return FontSelectionController;
})(PopupController);
var TextController = (function () {
    function TextController($scope) {
        var _this = this;
        this.$scope = $scope;
        this.textColor = 0;
        ObjectsController.instance = this;
        $scope.$ = this;
        $scope.visible = false;
        msg.on('object-selected', this.onObjectSelected, this);
        $(".text-picker")["mlColorPicker"]({
            'onChange': function (val) {
                _this.onColorChange(val);
            }
        });
    }
    TextController.prototype.onColorChange = function (val) {
        $(".text-picker").css('background-color', "#" + val);
        $cmd.run('text-color', this.textColor, val);
        this.textColor = val;
    };
    TextController.prototype.onObjectSelected = function (obj) {
        console.log('obj.type: ' + obj.type);
        this.$scope.visible = (obj.type == "text");
    };
    TextController.prototype.onFontClick = function () {
        msg.send('open-popup', 'fontselection');
    };
    TextController.prototype.onColorClick = function () {
    };
    return TextController;
})();
//# sourceMappingURL=controllers.js.map