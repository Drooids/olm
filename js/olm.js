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
    function DataService(){
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
        history.length = this.index;
        // console.log('command: ', name);
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
        // console.log('map', name, undoType);
        this.commandMap[name] = callback;
        this.callerMap[name] = caller;
        if (undoType != null) {
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
        // console.log('undo', action.name, func);
        if (func == null)
            return;
        switch (func) {
            case 0 /* SWITCH */:
                var fnDo = this.commandMap[action.name];
                fnDo.call(this.callerMap[action.name], action.args[0], action.args[2], action.args[1]);
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
        keys.bindKey(46, this.removeObject, this);
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
    ToolsController.prototype.removeObject = function () {
        msg.send('remove-object');
    }
    ToolsController.prototype.addSymobol = function () {
        msg.send('open-symbols');
    };
    ToolsController.prototype.addText = function () {
        msg.send('open-popup');
        msg.send('open-addtext');
        // console.log('addtext.clciked');
    };
    ToolsController.prototype.uploadImage = function () {
        $('#fileupload').trigger('click');
    };
    ToolsController.prototype.downloadLogo = function () {
        msg.send('open-popup', 'downloadlogo');
    };
    ToolsController.prototype.saveProject = function () {

        this.$scope.visible = false;
        msg.send("close-popups");
        $("#id-auth").hide();

        if(!window.logged) {
            window.alert("Sorry, please sign in first.");
            /*
            msg.send('open-popup');
            msg.send('open-invalid-user-pass');
            $(".auth-content").html('');
            $("#id-auth").show();
            $(".auth-content").append('Please signin or <strong><a style="color:red; text-decoration:none;" href="http://www.onlinelogomaker.com/register">register</a></strong> first to be able to save your project.');
            document.activeElement.blur();
            setTimeout(function() {
                $("#id-auth > .popup-footer").children()[0].focus();
            }, 200);
            */
            return;
        } else {
            this.$scope.visible = false;
            msg.send("close-popups");
            $("#id-auth").hide();
        }

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
            window.open('http://www.onlinelogomaker.com/account');
            // console.log("Project Saved");
        });
        var img = canvas.toDataURL('png');
        img = img.replace("data:image/png;base64,", "");
        // img = Base64.decode(img);
        var imgRaw = Base64Binary.decode(img, null);
        //var imgRaw = atob(img);
        // console.log(imgRaw);
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
            // console.log("Project Saved");
        });
        // console.log(img);
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
                    // console.log('send add iamge');
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
        this.symbolsRootUrl = "assets/symbols/celebration/Celebration ";
        $scope.visible = false;
        this.categories = data.categories;
        msg.on('open-symbols', this.open, this);
        this.$scope.$ = this;
        this.htmlString = htmlString(svgImg);

        // NOTE: It was commented:
        // starting from -->
        /*
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
        */
        // ending at <--

        $scope.$.categories[0].content = [1, 2, 3];
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
    SymbolsController.prototype.onSymbolClick = function (index, $event) {
        $('.selected').removeClass('selected');
        if($event.currentTarget.children.length > 0) {
            for(var key in $event.currentTarget.children) {
                $event.currentTarget.children[key].className += " selected";
            }
        }
        this.selectedSymbol = index;
    };
    SymbolsController.prototype.onCancelClick = function () {
        this.$scope.visible = false;
        msg.send('close-popups');
    };
    SymbolsController.prototype.onOkClick = function () {
        msg.send('add-symbol', this.symbolsRootUrl + this.getSelectedCategorySymbols()[this.selectedSymbol] + '.svg');
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
        msg.on('open-invalid-user-pass', this.open, this);
        msg.on('open-popup', this.openPopup, this);
    }
    PopupsController.prototype.open = function () {
        this.$scope.visible = true;
    };
    PopupsController.prototype.openPopup = function (name) {
        // console.log('openPopup: ' + 'open-' + name);
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
        $canvas = new CanvasService(canvas);
        canvas.setWidth(750);
        canvas.setHeight(600);

        // var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <defs/>\n  <g>\n    <path stroke=\"none\" fill=\"#6633ff\" d=\"M31.4 0.35 Q34.45 1.25 36.6 4.35 37.9 6.3 38.5 8.65 39.1 10.85 38.95 13.25 38.85 14.9 38.35 16.4 L38.15 17.05 Q37.55 18.8 36.55 20.2 L38.1 21.4 39.4 22.9 Q40.45 24.4 40.45 25.8 40.5 27.15 39.65 28.15 38.95 29 37.75 29.35 L35.1 29.65 32.65 29.2 Q31.5 28.8 30.45 28.2 28.5 27 27.35 25.4 L26.85 24.55 26.55 23.75 Q25.1 23.2 23.85 22.2 22.65 21.25 21.75 19.9 20.65 18.3 20.05 16.4 L19.6 14.75 Q19.3 13.1 19.4 11.4 19.45 9.5 20 7.8 20.7 5.4 22.15 3.55 23.65 1.7 25.7 0.8 28.5 -0.5 31.4 0.35 M35.1 6.7 Q33.3 4.1 30.75 3.2 28.35 2.35 25.95 3.2 24.15 3.8 22.75 5.3 21.4 6.75 20.65 8.8 20.15 10.3 20 11.95 19.9 13.5 20.15 15.05 L20.5 16.4 Q21 18.25 22.1 19.85 L24.1 22 Q25.25 22.9 26.6 23.35 L26.95 24.15 27.4 24.9 Q28.45 26.45 30.2 27.45 L32.2 28.3 34.4 28.65 36.7 28.25 Q37.7 27.85 38.3 27.05 38.95 26.15 38.85 24.95 38.8 23.65 37.9 22.35 L36.75 21.05 Q36.15 20.5 35.4 20.05 36.25 18.8 36.7 17.3 L36.95 16.4 37.2 14.05 Q37.3 12.1 36.75 10.25 36.25 8.35 35.1 6.7 M8.95 18.6 L11.4 18.3 14.75 18.55 Q17.65 19.1 19.9 20.65 21.3 21.6 22.2 22.8 23.25 24.05 23.75 25.45 L24.55 25.8 25.4 26.3 Q27.05 27.45 28.2 29.35 L29.2 31.55 29.7 34 Q29.8 35.5 29.4 36.7 29 37.9 28.15 38.6 27.15 39.45 25.8 39.4 24.4 39.35 22.9 38.3 22.1 37.8 21.4 37.05 L20.25 35.45 Q18.8 36.45 17.05 37.1 15.25 37.75 13.25 37.85 L8.95 37.5 8.65 37.45 Q6.3 36.85 4.4 35.5 1.25 33.35 0.35 30.3 -0.5 27.45 0.8 24.6 1.7 22.6 3.6 21.1 5.4 19.65 7.8 18.9 L8.95 18.6 M5.3 21.65 Q3.8 23.05 3.2 24.85 2.35 27.3 3.2 29.7 4.1 32.25 6.75 34.05 7.75 34.75 8.95 35.25 L10.25 35.7 14.05 36.15 17.3 35.6 Q18.8 35.15 20.05 34.35 L21.1 35.7 22.35 36.8 Q23.65 37.7 24.95 37.8 26.15 37.85 27.05 37.2 27.85 36.65 28.25 35.6 28.7 34.6 28.65 33.3 28.65 32.25 28.3 31.15 L27.45 29.15 Q26.4 27.35 24.9 26.3 L24.15 25.85 23.4 25.55 Q22.9 24.2 22 23 21.1 21.9 19.85 21 17.7 19.55 15.05 19.1 L12 18.95 8.95 19.55 8.8 19.6 Q6.75 20.35 5.3 21.65\"/>\n  </g>\n</svg>";
        // // console.log(svg.toString());
        // msg.send('add-symbol', svg);
        /*
            fabric.loadSVGFromString(svg.toString(), function (objects, options) {
                 var obj = fabric.util.groupSVGElements(objects, options);
                 // // console.log(JSON.stringify(obj));
                 canvas.add(obj).renderAll();
                 canvas.setActiveObject(obj);
                 // // console.log("loaded");
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
        canvas.on('selection:cleared', this.onObjectSelectCleared);
        canvas.on('selection:created', this.onObjectSelectCreated);
        msg.on('add-symbol', this.addSymbol, this);
        msg.on('add-image', this.addImage, this);
        msg.on('add-text', this.addText, this);
        msg.on('remove-object', this.removeObject, this);
        msg.on('remove-objects', this.removeObjects, this);
        msg.on('save-canvas', this.saveCanvas, this);
        msg.on('update-undo-redo-state', this.updateUndoRedoState, this);
        $cmd.map('move', this.move, this);
        $cmd.setUndoType('move', 1 /* INVERT */);
        $cmd.map('add-symbol', this.addSymbol);
        $cmd.map('scale', this.scale, this, 2 /* FACTOR */);
        $cmd.map('rotate', this.rotate, this, 1 /* INVERT */);
        $cmd.map('duplicate', this.duplicate, this, 3 /* SKIP */);

        $cmd.map('add-object', function (obj) {
            canvas.add(obj).renderAll();
            canvas.setActiveObject(obj);

            msg.send('object-added', obj);
          }, this);
        // $cmd.mapUndo('add-object', canvas.remove);

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
        var _obj = canvas.getActiveObject(),
            _obj_type = _obj.type.toUpperCase(),
            object = fabric.util["object"].clone(_obj),
            is_clone = true;

        object.set("top", object.top + 10);
        object.set("left", object.left + 10);

        if(_obj.type == 'group') {
            _obj_type = DOType.SYMBOL;
        }
        $cmd.run('add', $canvas.create(_obj_type, object, is_clone));
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
        this.selected.set({
            scaleY: y,
            scaleX: x,
            originX: "center",
            originY: "center"
        });
        msg.send('update-scale');
        canvas.renderAll();
    };
    CanvasController.prototype.textColor = function (lastVal, val) {
        var textObj = this.selected;
        // console.log('textColor: ' + textObj);
        if (!textObj)
            return;
        // console.log('textColor');
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
    CanvasController.prototype.addSymbol = function (url) {
        var _this = this;
        fabric.loadSVGFromURL(url, function (objects, options) {
            var obj = fabric.util.groupSVGElements(objects, options);
            // console.log(obj);
            $cmd.run('add', $canvas.create(DOType.SYMBOL, obj));
            // console.log("svg loaded");
        });
    };
    CanvasController.prototype.addImage = function (url) {
        var _this = this;
        fabric.Image.fromURL(url, function (oImg) {
            $cmd.run('add', $canvas.create(DOType.IMAGE, oImg));
        });
    };
    CanvasController.prototype.addText = function (value) {
        var text = new fabric.Text(value, { left: 100, top: 100 });
        $cmd.run('add', $canvas.create(DOType.TEXT, text));
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
    CanvasController.prototype.onObjectSelectCreated = function (e) {
        console.log("select: ", e, this);
    };
    CanvasController.prototype.onObjectSelectCleared = function (e) {
        msg.send('deselect-all');
        console.log("select: ", e, this);
    };
    CanvasController.prototype.onObjectMove = function (e) {
        // console.log(e.target.get('left'), e.target.get('top'));
        msg.send('transformed', e);
    };
    CanvasController.prototype.onRedoClick = function () {
        this.$cmd.redo();
    };
    CanvasController.prototype.onUndoClick = function () {
        this.$cmd.undo();
    };
    CanvasController.prototype.addGrid = function() {
        var grid = 5;
        for (var i = 0; i < (600 / grid); i++) {
          canvas.sendToBack(new fabric.Line([ i * grid, 0, i * grid, 600], { stroke: '#808080', selectable: false }));
          canvas.sendToBack(new fabric.Line([ 0, i * grid, 600, i * grid], { stroke: '#808080', selectable: false }))
        }
    };
    CanvasController.prototype.removeGrid = function() {
        canvas.getObjects('line').forEach(function(obj) {
            if(typeof obj != 'undefined') {
                // console.log(obj);
                obj.remove();
            }
        });
    };
    CanvasController.prototype.removeObject = function() {
        $canvas.children.forEach(function(o) { if(o.selected) $cmd.run('remove', o); });
    };
    CanvasController.prototype.removeObjects = function() {
        $cmd.run('remove-all');
    };
    CanvasController.prototype.saveCanvas = function () {
        // First of all - deselect all active objects
        canvas.deactivateAll().renderAll();

        var bound = this.getRectBounds();
        var copy = document.createElement('canvas').getContext('2d');
        var trimHeight = bound.bottom - bound.top,
            trimWidth = bound.right - bound.left,
            trimmed = canvas.getContext().getImageData(bound.left, bound.top, trimWidth, trimHeight);
        copy.canvas.width = trimWidth;
        copy.canvas.height = trimHeight;
        copy.putImageData(trimmed, 0, 0);
        var image = copy.canvas.toDataURL();
        var header = 'data:application/octet-stream;filename=filename.txt;headers=Content-Disposition%3A%20attachment%3B%20filename=logo.png';
        image = image.replace('data:image/png', header);
        document.getElementById("dl")["object"] = image;

        // A interesting way of downloading stream.
        var download = document.createElement('a');
        download.href = image;

        var date = new Date().toString();
        var split_date = date.split(' ');

        // Get rid of the week day.
        split_date.splice(0, 1);
        var month = split_date[0],
            day = split_date[1],
            year = split_date[2].slice(2, 4); // Get the last two digits.

        var time = split_date[3].split(':');
        var h = time[0], m = time[1], s = time[2];

        month = "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(month) / 3 + 1;

        if(month < 10) month = '0' + month;

        // Default format:
        // onlinelogomaker-MDY-HM;
        // E.x.: onlinelogomaker-082115-0228.png
        var save_file_name = 'onlinelogomaker-' + month + day + year + '-' + h + m + '.png';

        download.download = save_file_name;
        download.click();

        // Firefox.
        function fireEvent(obj,evt){
          var fireOnThis = obj;
          if(document.createEvent ) {
            var evObj = document.createEvent('MouseEvents');
            evObj.initEvent( evt, true, false );
            fireOnThis.dispatchEvent( evObj );
          } else if( document.createEventObject ) {
            var evObj = document.createEventObject();
            fireOnThis.fireEvent( 'on' + evt, evObj );
          }
        }
        fireEvent(download, 'click')
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
        canvas.on('selection:cleared', this.selectionCleared);
        $scope.$watch('x', this.onChangePosition);
        $scope.$watch('y', this.onChangePosition);
        $scope.$watch('width', this.onChangeScale);
        $scope.$watch('height', this.onChangeScale);
        $scope.x = 0;
        $scope.y = 0;
        $scope.width = 0;
        $scope.height = 0;
        msg.on('update-scale', function () {
            this.$scope.width = parseFloat(this.selected.get('width') * this.selected.scaleX).toFixed(2);
            this.$scope.height = parseFloat(this.selected.get('height') * this.selected.scaleY).toFixed(2);
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
        // msg.send('object-selected', e.target);
        var _this = TransformController.instance;
        _this.selected = e.target;
        _this.$scope.x = e.target.get('left');
        _this.$scope.y = e.target.get('top');
        _this.$scope.width = e.target.get('width') * e.target.scaleX;
        _this.$scope.height = e.target.get('height') * e.target.scaleY;
        _this.$scope.$apply();
    };
    TransformController.prototype.selectionCleared = function (e) {
        var _this = TransformController.instance;
        _this.$scope.$apply();
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
        _this.$scope.$apply();
        // console.log("scale", e.target.get('width'));
    };
    TransformController.prototype.onChangePosition = function () {
        var _this = TransformController.instance;
        // console.log("change", _this.selected, _this.$scope.y);
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
        $(".shadow-picker")["mlColorPicker"]({
            'onChange': function (val) {
                _this.onColorChange(val);
            }
        });
        // $cmd.map('shadow-color', this.changeShadowColor, this, UndoType.SWITCH);
    }
    ShadowController.prototype.onColorChange = function (val) {
        $(".shadow-picker").css('background-color', "#" + val);
        var dobj = $canvas.selection[0];
        var newShadow = $.extend(true, {}, dobj.shadow);
        newShadow.color = '#' + val;
        $cmd.run('shadow', dobj, dobj.shadow, newShadow);
        // this.$cmd.run('shadow-color', $canvas.selection[0], $canvas.selection[0].shadow.color , '#'+val);
        this.shadowColor = val;
    };
    /*
        changeShadowColor(dobj,lastVal, val) {
            $canvas.setShadowColor(dobj,val);
        }
        */
    ShadowController.prototype.onObjectSelected = function (dobj) {
        // console.log("erzer", dobj);
        this.$scope.enabled = dobj.shadow.enabled;
        var obj = dobj.raw;
        this.selectedObject = obj;
        this.$scope.direction = Math.atan2(dobj.shadow.offsetY, dobj.shadow.offsetX) / Math.PI * 180;
        this.$scope.outset = Math.round(dobj.shadow.offsetY / Math.cos(this.$scope.direction));
        this.onChange();
        // this.$scope.$apply();
    };
    ShadowController.prototype.onChange = function () {
        var dobj = $canvas.selection[0];
        if (!dobj)
            return;
        if (this.$scope.enabled) {
            var newShadow = $.extend(true, {}, dobj.shadow);
            var angle = this.$scope.direction / 180 * Math.PI;
            newShadow.offsetX = Math.cos(angle) * this.$scope.outset, newShadow.offsetY = Math.sin(angle) * this.$scope.outset, $cmd.run('shadow', dobj, dobj.shadow, newShadow);
        }
    };
    ShadowController.prototype.onOnOffClick = function () {
        this.$scope.enabled = !this.$scope.enabled;
        var dobj = $canvas.selection[0];
        var newShadow = $.extend(true, {}, dobj.shadow);
        newShadow.enabled = this.$scope.enabled;
        $cmd.run('shadow', dobj, dobj.shadow, newShadow);
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
        // console.log(this.$scope.text);
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
        // console.log('open-downloadlogo');
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
        // console.log("onOkClick");
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
        // Single selected object
        if(canvas.getActiveObject() != null) {
            this.$cmd.run('scale', this.factor * canvas.getActiveObject().getScaleX(), this.factor * canvas.getActiveObject().getScaleX());
        }
        // Multiple selected objects.
        // TODO: Implement later on...
        /*
            if(canvas.getActiveGroup() != null) {
                for(var key in canvas.getActiveGroup().getObjects()) {
                    objs[key].setScaleX(1.4)
                }
            }
        */
    };
    ModifyController.prototype.zoomOut = function () {
        // Single selected object
        if(canvas.getActiveObject() != null) {
            this.$cmd.run('scale', 1 / this.factor * canvas.getActiveObject().getScaleX(), 1 / this.factor * canvas.getActiveObject().getScaleX());
        }
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
        window.logged = false;
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
                    // msg.send('open-popup');
                    // console.log("Not logged In");
                    _this.$scope.logged = false;
                    window.logged = false;
                    _this.$scope.$apply();
                }
                else {
                    _this.$scope.userfullname = res.root.user.name;
                    _this.$scope.user = res.root.user;
                    _this.$scope.logged = true;
                    window.logged = true;
                    _this.$scope.$apply();
                    // console.log("Welcome, " + _this.$scope.userfullname);
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
        if(projectName) {
            var projectDataUrl = "http://www.onlinelogomaker.com/applet_userdata/315986/projects/" + projectName;
            $.get(projectDataUrl, function (data) {
                canvas.loadFromJSON(JSON.parse(data), function () {});
            });
        }
    };
    LoginController.prototype.onLoginClick = function () {

        var _this = this;

        var _auth_flag = false,
            _auth_msg = "";

        $(".auth-content").html('');

        if(typeof this.$scope.password != 'undefined') {
            if(this.$scope.password.length == 0) {
                _auth_flag = true;
                _auth_msg = "Please enter your password";
            }
        } else {
            _auth_flag = true;
            _auth_msg = "Please enter your password";
        }
        if(typeof this.$scope.username != 'undefined') {
            if(this.$scope.username.length == 0) {
                _auth_flag = true;
                _auth_msg = "Please enter your username";
            }
        } else {
            _auth_flag = true;
            _auth_msg = "Please enter your username";
        }

        if(_auth_flag) {
            $("#id-auth").show();
            $(".auth-content").append(_auth_msg);
            msg.send('open-popup');
            msg.send('open-invalid-user-pass');
            document.activeElement.blur();
            setTimeout(function() {
                $("#id-auth > .popup-footer").children()[0].focus();
            }, 200);
            return;
        }

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
            //// console.log("cookie: " + getCookie("__cfduid"));
            var res = JSON.parse(xml2json(data, ''));
            if (res.error) {
                msg.send('open-popup');
                msg.send('open-invalid-user-pass');
                $("#id-auth").show();
                $(".auth-content").append('Invalid username or password');
                document.activeElement.blur();
                setTimeout(function() {
                    $("#id-auth > .popup-footer").children()[0].focus();
                }, 200);

                // I have no idea why wouldn't this work...
                // _this.$scope.visible = true;
                // msg.send('open-popup', 'invalid-user-pass');
                // msg.send('open-popups');

                // clearTimeout(time_out_popup);
                // var time_out_popup = setTimeout(function() {
                //    msg.send('close-popups');
                //    _this.$scope.visible = false;
                // }, 5000);
                // console.log("Invalid username or password");

                // alert("Invalid username or password");
                _this.$scope.logged = false;
                window.logged = false;
                _this.$scope.$apply();
            }
            else if (res.root) {
                _this.$scope.userfullname = res.root.user.name;
                // console.log(_this);
                _this.$scope.logged = true;
                window.logged = true;
                _this.$scope.$apply();
                // console.log("Welcome, " + _this.$scope.userfullname);
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
            window.logged = false;
            _this.$scope.user = null;
            _this.$scope.$apply();
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
    LoginController.prototype.onOkClick = function () {
        this.$scope.visible = false;
        $("#id-auth").hide();
        msg.send("close-popups");
    };
    LoginController.prototype.onCancelClick = function () {
        this.$scope.visible = false;
        $("#id-auth").hide();
        msg.send("close-popups");
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
        msg.on('object-move-up', this.onObjectMoveUp, this);
        msg.on('object-move-down', this.onObjectMoveDown, this);
        msg.on('object-single-delete', this.onDeleteClick, this);
        msg.on('object-multiple-delete', this.onDeleteAllClick, this);
        msg.on('deselect-all', this.clearSelection, this);

        // canvas.on('object:selected', this.onObjectSelected);
        // canvas.on('selection:cleared', this.onSelectionCleared);
        $scope.items = $canvas.children;
    }
    ObjectsController.prototype.onObjectMoveUp = function() {
        for(var i = 0; i < $canvas.children.length; i++) {
          if($canvas.children[i].selected) {
            if(i > 0) {
              $canvas.children.move(i, i - 1);
              canvas.getActiveObject().moveTo(i + 1); // Update z-index.
              break;
            }
          }
        }
    };
    ObjectsController.prototype.onObjectMoveDown = function() {
        for(var i = 0; i < $canvas.children.length; i++) {
          if($canvas.children[i].selected) {
             if(i < $canvas.children.length - 1) {
              $canvas.children.move(i, i + 1);
              canvas.getActiveObject().moveTo(i - 1); // Update z-index.
              break;
            }
          }
        }
    };
    ObjectsController.prototype.selectItem = function (index) {
        $canvas.select($canvas.children[index]);
    };
    ObjectsController.prototype.onItemClick = function (index) {
        this.selectItem(index);
    };
    ObjectsController.prototype.onItemDoubleClick = function (index) {
        msg.send('open-popup', 'rename');
    };
    ObjectsController.prototype.onObjectAdd = function (obj) {
        //  var _this = ObjectsController.instance;
        var disObj = new DisplayObject();
        disObj.raw = obj;
        this.items.unshift(disObj);
        disObj.name = "OBJECT " + this.items.length;
        this.clearSelection();
        this.selectObject(obj, true);
    };
    ObjectsController.prototype.onMoveUpClick = function() {
        this.onObjectMoveUp(this);
    };
    ObjectsController.prototype.onMoveDownClick = function() {
        this.onObjectMoveDown(this);
    };
    ObjectsController.prototype.onObjectSelected = function (obj) {
        //var _this = ObjectsController.instance;
        this.selectObject(obj, true);
        this.update();
        // scopeApply(_this.$scope);
    };
    ObjectsController.prototype.onSelectionCleared = function (e) {
        // console.log(e);
        var _this = ObjectsController.instance;
        _this.selectObject(e.target, false);
        //_this.$scope.$apply();
        scopeApply(_this.$scope);
    };
    ObjectsController.prototype.selectObject = function (obj, value) {
        this.clearSelection();
        var _index = -1;
        for (var i = 0; i < $canvas.children.length; i++) {
            if ($canvas.children[i].raw == obj.raw) {
                $canvas.children[i].selected = value;
                _index = i;
            }
        }
    };
    ObjectsController.prototype.clearSelection = function () {
        for (var i = 0; i < this.items.length; i++) {
            this.items[i].selected = false;
        }
        for (var i = 0; i < $canvas.children.length; i++) {
            $canvas.children[i].selected = false;
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
    ObjectsController.prototype.onRenameClick = function () {
        msg.send('open-popup', 'rename');
    };
    ObjectsController.prototype.removeObj = function () {
        msg.send('remove-object');
    };
    ObjectsController.prototype.onDeleteClick = function () {
        this.removeObj();
    };
    ObjectsController.prototype.removeAllObj = function () {
        msg.send('remove-objects');
    }
    ObjectsController.prototype.onDeleteAllClick = function () {
        this.removeAllObj();
    };
    return ObjectsController;
})();
var PopupController = (function () {
    function PopupController($scope) {
        this.id = "";
        this.$scope = $scope;
        $scope.$ = this;
        $scope.visible = false;
        $("#id-auth").hide();
    }
    PopupController.prototype.init = function (id) {
        this.id = id;
        msg.on("open-" + id, this.open, this);
        msg.on("close-" + id, this.open, this);
    };
    PopupController.prototype.open = function () {
        this.$scope.visible = true;
        // console.log("open-popup-" + this.id);
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

        this._fonts = {};
        this.items = [];
        this.normalFonts = [];
        this.eastFonts = [];

        var fonts = [];

        $.get("assets/fonts/fonts.json", function() {})
        .done(function(a) {})
        .fail(function(a) {})
        .always(function(a) {
            if(a.hasOwnProperty('normalFonts')) {
               fonts.push({ normalFonts: a.normalFonts });
            }
            if(a.hasOwnProperty('eastFonts')) {
               fonts.push({ eastFonts: a.eastFonts });
            }
        });

        // NOTE: not a good solution, just testing for now...
        setTimeout(function(self) {
            this.normalFonts = fonts[0].normalFonts;
            this.eastFonts = fonts[1].eastFonts;
            this.init('fontselection');
            this.generateFontFaces();
            this.onNormalClick();
        }.bind(this), 2000);

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
        this.clearFontElemts();
        document.getElementById('id-fontselection-normal').style.color = "#0e0efc";
        for (var i = 0; i < this.normalFonts.length; i++) {
            this.items.push({ name: this.normalFonts[i] });
        }
    };
    FontSelectionController.prototype.onEastClick = function () {
        this.items = [];
        this.clearFontElemts();
        document.getElementById('id-fontselection-east').style.color = "#0e0efc";
        for (var i = 0; i < this.eastFonts.length; i++) {
            this.items.push({ name: this.eastFonts[i] });
        }
    };
    FontSelectionController.prototype.clearFontElemts = function () {
        document.getElementById('id-fontselection-normal').style.color = "#000";
        document.getElementById('id-fontselection-east').style.color = "#000";
    };
    FontSelectionController.prototype.onItemClick = function (index, $event) {
        var fonts = $(".fonts").children();
        for(var i = 0; i < fonts.length; i++) {
            fonts[i].style.backgroundColor = "";
        }
        $event.currentTarget.style.backgroundColor = "#3c79bc";
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
        msg.on('object-deselected', this.onObjectDeSelected, this);
        msg.on('deselect-all', this.onObjectDeSelected, this);
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
        // console.log('obj.type: ' + obj.type);
        this.$scope.visible = (obj.type == "text" || obj.type == "text".toUpperCase());
    };
    TextController.prototype.onObjectDeSelected = function (obj) {
        this.$scope.visible = false;
    };
    TextController.prototype.onFontClick = function () {
        msg.send('open-popup', 'fontselection');
    };
    TextController.prototype.onColorClick = function () {
    };
    return TextController;
})();
var RenameController = (function (_super) {
    __extends(RenameController, _super);
    function RenameController(scope) {
        _super.call(this, scope);
        this.init('rename');
        $cmd.map('rename', this.rename, this);
        $cmd.mapUndo('rename', this.undoRename);
    }
    RenameController.prototype.rename = function (dobj, oldname, newname) {
        $canvas.rename(dobj, newname);
    };
    RenameController.prototype.undoRename = function (dobj, oldname, newname) {
        $canvas.rename(dobj, oldname);
    };
    RenameController.prototype.onOkClick = function () {
        // console.log('okclick-rename', this.$scope.newname);
        $cmd.run('rename', $canvas.selection[0], $canvas.selection[0].name, this.$scope.newname);
        this.close();
    };
    RenameController.prototype.onCancelClick = function () {
        this.close();
    };
    return RenameController;
})(PopupController);
var SymbolColorController = (function () {
    function SymbolColorController($scope) {
        var _this = this;
        this.$scope = $scope;
        this.textColor = 0;
        this.onColorChange = function (val) {
            if (!_this.enabled())
                return;
            $(".color-picker").css('background-color', "#" + val);
            $cmd.run('symbol-color', $canvas.selection[0], '#' + $canvas.activePathsColor.toHex().toLowerCase(), '#' + val);
            _this.textColor = val;
        };
        ObjectsController.instance = this;
        $scope.$ = this;
        $scope.visible = false;
        $scope.pathsVisible = true;

        msg.on('object-selected', this.onObjectSelected, this);
        msg.on('paths-selected', this.onObjectSelected, this);
        msg.on('deselect-all', this.onObjectDeSelected, this);
        $(".color-picker")["mlColorPicker"]({
            'onChange': this.onColorChange
        });
    }
    SymbolColorController.prototype.enabled = function () {
        return $canvas.selection.length > 0 && $canvas.activePaths.length > 0;
    };
    SymbolColorController.prototype.onObjectSelected = function (obj) {
        // console.log('symbolcolor-enabled; ', this.enabled());
        this.$scope.visible = this.enabled();
        //// console.log('obj.type: ' + obj.type);
        //this.$scope.visible = (obj.type == "text");
    };
    SymbolColorController.prototype.onObjectDeSelected = function() {
        this.$scope.visible = false;
    };
    SymbolColorController.prototype.onFontClick = function () {
        msg.send('open-popup', 'fontselection');
    };
    SymbolColorController.prototype.onInvisibleClick = function () {
    };
    return SymbolColorController;
})();
var Messenger = (function () {
    function Messenger() {
        this.listeners = {};
        this.callers = {};
        if (Messenger.instance == null) {
            Messenger.instance = this;
            $msg = this;
        }
        else {
            console.error("Messenger is a singleton !!!");
        }
    }
    Messenger.prototype.on = function (event, callback, caller) {
        this.send("");
        if (!caller)
            caller = callback.caller;
        if (Messenger.instance.listeners[event] == null) {
            Messenger.instance.listeners[event] = [];
            Messenger.instance.callers[event] = [];
        }
        Messenger.instance.listeners[event].push(callback);
        Messenger.instance.callers[event].push(caller);
    };
    Messenger.prototype.send = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var cbs = Messenger.instance.listeners[event];
        if (cbs == null)
            return;
        for (var i = 0; i < cbs.length; i++) {
            cbs[i].apply(Messenger.instance.callers[event][i], args);
        }
    };
    return Messenger;
})();
var KeysBinder = (function () {
    function KeysBinder() {
        this.ctrlBinds = {};
        this.ctrlBindsCallers = {};
        this.keyBinds = {};
        this.keyBindsCallers = {};
        this.ctrlPressed = false;
        document.onkeydown = this.onKeyDown.bind(this);
        document.onkeyup = this.onKeyUp.bind(this);
    }
    KeysBinder.prototype.bindKey = function (keycode, callback, caller) {
        this.keyBinds[keycode] = callback;
        this.keyBindsCallers[keycode] = caller;
    };
    KeysBinder.prototype.bindCtrl = function (keycode, callback, caller) {
        this.ctrlBinds[keycode] = callback;
        this.ctrlBindsCallers[keycode] = caller;
    };
    KeysBinder.prototype.onKeyDown = function (e) {
        var evtobj = window.event ? event : e;
        if (evtobj.keyCode == 17) {
            this.ctrlPressed = true;
        }
        var cb = this.ctrlBinds[evtobj.keyCode];
        var cbkey = this.keyBinds[evtobj.keyCode];
        if (this.ctrlPressed && cb) {
            cb.call(this.ctrlBindsCallers[evtobj.keyCode]);
            this.ctrlBindsCallers[evtobj.keyCode].$scope.$apply();
            evtobj.preventDefault();
        }
        else if (!this.ctrlPressed && cbkey) {
            cbkey.call(this.keyBindsCallers[evtobj.keyCode]);
            if(typeof this.ctrlBindsCallers[evtobj.keyCode] != 'undefined') {
                this.ctrlBindsCallers[evtobj.keyCode].$scope.$apply();
            }
        }
    };
    KeysBinder.prototype.onKeyUp = function (e) {
        var evtobj = window.event ? event : e;
        evtobj.preventDefault();
        if (evtobj.keyCode == 17) {
            this.ctrlPressed = false;
            // console.log("ctrlPressed=false");
        }
    };
    return KeysBinder;
})();
var DOType = (function () {
    function DOType() {
    }
    DOType.SYMBOL = "SYMBOL";
    DOType.TEXT = "TEXT";
    DOType.IMAGE = "IMAGE";
    return DOType;
})();
var DisplayObject = (function () {
    function DisplayObject() {
        this.id = 0;
        this.selected = false;
        this.name = "";
        this.raw = null;
        this.shadow = {
            enabled: false,
            color: 'rgba(0,0,0,0.6)',
            blur: 5,
            offsetX: 0,
            offsetY: 0,
            opacity: 0.6,
            fillShadow: true,
            strokeShadow: true
        };
    }
    return DisplayObject;
})();
var CanvasService = (function () {
    function CanvasService(canvas) {
        var _this = this;
        this.idIndex = 0;
        this.children = [];
        this.selection = [];
        this.activePaths = [];
        this.activePathsColor = new fabric['Color']('rgba(0,0,0,1)');
        this.alpha = 0;
        this.alphaModifier = 0.04;
        this.renderLoop = function (time) {
            if (_this.alpha > 0.97) {
                _this.alphaModifier = -0.03;
            }
            else if (_this.alpha < 0.06) {
                _this.alphaModifier = 0.03;
            }
            _this.alpha += _this.alphaModifier;
            for (var i = 0; i < _this.activePaths.length; i++) {
                _this.activePaths[i].setOpacity(_this.alpha);
            }
            _this.root.renderAll();
            window.requestAnimationFrame(_this.renderLoop);
        };
        this.onMouseDown = function (e) {
            for (var i = 0; i < _this.activePaths.length; i++) {
                _this.activePaths[i].setOpacity(1);
            }
            _this.root.renderAll();
            var mousePos = _this.root.getPointer(e.e);
            var width = _this.root.getWidth();
            var height = _this.root.getHeight();
            var pixels = _this.root.getContext().getImageData(0, 0, width, height);
            var pixel = (mousePos.x + mousePos.y * pixels.width) * 4;
            _this.activePathsColor = new fabric['Color']('rgb(' + pixels.data[pixel] + ',' + pixels.data[pixel + 1] + ',' + pixels.data[pixel + 2] + ')');
            var colorHex = '#' + _this.activePathsColor.toHex().toLowerCase();
            var dobj = _this.selection[0];
            if (dobj != null && dobj.type == DOType.SYMBOL) {
                _this.activePaths = [];
                for (var i = 0; i < dobj.raw.getObjects().length; i++) {
                    var path = dobj.raw.getObjects()[i];
                    if (path.getFill().toLowerCase() == colorHex) {
                        _this.activePaths.push(path);
                    }
                }
            }
            $msg.send('paths-selected');
        };
        this.root = canvas;
        canvas.on('mouse:down', function (e) {
            // console.log('down', e);
        });
        $cmd.map('add-object', this.add, this);
        $cmd.mapUndo('add-object', function (rawobj) {
            var dobj = this.getByRaw(rawobj);
            if (dobj != null) {
                this.remove(dobj);
            }
        });
        $msg.on('object-selected', function (rawobj) {
            var dobj = _this.getByRaw(rawobj);
            if (dobj != null) {
                _this.selection = [dobj];
            }
        });
        $cmd.map('add', this.add, this);
        $cmd.mapUndo('add', this.remove);
        $cmd.map('remove', this.remove, this);
        $cmd.mapUndo('remove', this.add, this);
        $cmd.map('remove-all', this.removeAll, this);
        // $cmd.mapUndo('remove-all', this.removeAll, this);
        $cmd.map('shadow', this.shadow, this, 0 /* SWITCH */);
        $cmd.map('symbol-color', this.symbolColor, this, 0 /* SWITCH */);
        this.root.on('object:selected', function (e) {
            var dobj = _this.getByRaw(e.target);
            if (dobj != null) {
                msg.send('object-selected', dobj);
            }
        });
        var width = this.root.getWidth();
        var height = this.root.getHeight();
        var pixels = this.root.getContext().getImageData(0, 0, width, height);
        //var mouseDownHandler
        this.root.on('mouse:down', this.onMouseDown);
        window.requestAnimationFrame(this.renderLoop);
    }
    CanvasService.prototype.create = function (type, object, clone) {
        var dobj = new DisplayObject();
        dobj.id = this.idIndex++;
        dobj.type = type;
        dobj.name = "OBJECT" + this.idIndex;
        if ((type == DOType.SYMBOL) && (!clone)) {
            dobj.raw = new fabric.Group(object.getObjects());
            // console.log("this is a symbol");
        }
        else if((type == DOType.SYMBOL) && clone) {
            var objs = canvas.getObjects('group');
            for(var key in objs) {
                if(objs[key].active) {
                    dobj.raw = (objs[key]);
                }
            }
            dobj.raw = object;
        }
        else {
            dobj.raw = object;
        }
        return dobj;
    };
    CanvasService.prototype.add = function (dobj) {
        dobj.selected = true;
        this.root.add(dobj.raw).renderAll();
        this.children.unshift(dobj);
        this.select(dobj);
        if (dobj.type == DOType.SYMBOL) {
            for (var i = 0; i < dobj.raw.getObjects().length; i++) {
                var path = dobj.raw.getObjects()[i];
                // console.log('path found', path.getFill());
            }
        }
        // msg.send('object-added', obj);
    };
    CanvasService.prototype.select = function (dobj) {
        this.unselectAll();
        dobj.selected = true;
        this.selection = [dobj];
        this.root.setActiveObject(dobj.raw);
        $msg.send('object-selected', dobj);
    };
    CanvasService.prototype.remove = function (dobj) {
        this.children.splice(this.children.indexOf(dobj), 1);
        if (dobj.selected) {
            canvas.discardActiveObject();
            this.unselectAll();
        }
        this.root.remove(dobj.raw);
        this.root.renderAll();
    };
    CanvasService.prototype.removeAll = function () {
        for(var i = this.children.length - 1; i >= 0; i--) {
            if(typeof this.children[i] != 'undefined') {
                this.root.remove(this.children[i].raw);
                this.children.splice(i, 1);
            } else {
                console.log("undefined: " + i);
            }
        }
    };
    CanvasService.prototype.rename = function (dobj, newname) {
        dobj.name = newname;
    };
    CanvasService.prototype.shadow = function (dobj, oldshadow, shadow) {
        // console.log(oldshadow, shadow);
        dobj.shadow = shadow;
        if (shadow.enabled) {
            dobj.raw.setShadow(shadow);
        }
        else {
            dobj.raw.setShadow(null);
        }
        this.root.renderAll();
    };
    CanvasService.prototype.getPathsByColor = function (dobj, colorHex) {
        var activePaths = [];
        for (var i = 0; i < dobj.raw.getObjects().length; i++) {
            var path = dobj.raw.getObjects()[i];
            if (path.getFill().toLowerCase() == colorHex) {
                activePaths.push(path);
            }
        }
        return activePaths;
    };
    CanvasService.prototype.symbolColor = function (dobj, oldcolor, newcolor) {
        var paths = this.getPathsByColor(dobj, oldcolor);
        // console.log('setFill', paths.length, newcolor);
        for (var i = 0; i < paths.length; i++) {
            paths[i].setFill(newcolor);
        }
        this.root.renderAll();
    };
    CanvasService.prototype.setShadowColor = function (dobj, color) {
        if (!dobj.shadow.enabled)
            return;
        dobj.shadow.color = '#' + color;
        dobj.raw.setShadow(dobj.shadow);
        this.root.renderAll();
    };
    CanvasService.prototype.unselectAll = function () {
        for (var i = 0; i < this.selection.length; i++) {
            this.selection[i].selected = false;
        }
        this.selection = [];
        this.root.discardActiveObject();
        this.root.discardActiveGroup();
    };
    CanvasService.prototype.getByRaw = function (rawobj) {
        for (var i = 0; i < this.children.length; i++) {
            if (rawobj == this.children[i].raw)
                return this.children[i];
        }
        return null;
    };
    CanvasService.prototype.getById = function (id) {
        for (var i = 0; i < this.children.length; i++) {
            if (id == this.children[i].id)
                return this.children[i];
        }
        return null;
    };
    return CanvasService;
})();
var $canvas;
var keys = new KeysBinder();
var data = {};
var svgImg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <defs>\n    <radialGradient gradientUnits=\"userSpaceOnUse\" r=\"819.2\" cx=\"0\" cy=\"0\" spreadMethod=\"pad\" gradientTransform=\"matrix(0.193359375 0 0 0.2111663818359375 158.4 173)\" id=\"gradient0\">\n      <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\"0.28627450980392155\"/>\n      <stop offset=\"1\" stop-color=\"#f5f5f5\"/>\n    </radialGradient>\n    <radialGradient gradientUnits=\"userSpaceOnUse\" r=\"819.2\" cx=\"0\" cy=\"0\" spreadMethod=\"pad\" gradientTransform=\"matrix(0.13519287109375 -0.1382598876953125 0.150970458984375 0.147613525390625 178 79.55)\" id=\"gradient1\">\n      <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\"0.28627450980392155\"/>\n      <stop offset=\"1\" stop-color=\"#f5f5f5\"/>\n    </radialGradient>\n  </defs>\n  <g>\n    <path stroke=\"none\" fill=\"url(#gradient0)\" d=\"M272 47.1 Q274.65 35.4 267.6 28.75 257.55 19.25 227.75 19.15 201.95 19.05 151.1 31.2 L118.7 39 Q104.35 42.2 101.35 41.35 97.05 40.15 110.25 34.25 122 28.95 144.5 21.3 150.2 19.35 161.4 14.7 172.45 10.1 178.9 7.95 201.05 0.45 227.7 0 260.3 -0.55 282.95 12.6 306.25 26.15 305.95 47.15 305.75 64.8 294.35 87.25 288.6 98.55 282.55 107.85 286.2 114.2 290.2 124.05 293.8 132.9 295.7 139.45 297.25 144.85 297.75 155.2 L298.3 167.85 Q299.05 174 302.95 178.95 305.25 181.95 310.35 186.05 314.95 189.8 316.05 191.55 317.8 194.45 315.45 197.8 311.4 203.6 303.3 194.35 L297.25 187.15 Q294.1 183.65 292.4 183.85 290.65 184.05 291 189.95 L292.4 202.8 Q294.4 221.3 288.5 221.3 284.95 221.3 283.8 216.65 282.95 213.5 283.1 206.25 283.2 197.6 282.95 195.3 282.45 190 280.05 189.1 277.65 188.2 275.2 192.25 274 194.15 270.9 201.5 268.15 207.95 266.2 210.4 263.3 214.1 260.15 212.65 257 211.2 258 207.3 258.65 204.6 262.05 199.3 L267.3 190.75 Q269.65 186.15 268.6 183.85 267.55 181.5 264.75 182.85 263.3 183.55 259.05 186.95 255.1 190.15 253.05 190.95 249.95 192.15 248.3 189.55 245.55 185.15 252.7 181.2 L258.25 178.15 Q261.05 176.4 261.3 174.7 261.55 172.95 260.5 172 260.05 171.55 258.2 170.65 255.05 169.1 256.3 165.35 257.6 161.4 260.95 162.7 265.85 164.6 268 163.8 271.65 162.5 273.2 158.7 274.1 156.45 274.55 151.6 274.85 148.85 274.95 142.55 275 134.75 274.55 128.4 264.4 149.5 248.9 172.6 232.5 197.05 220.95 207.2 206.45 219.9 162.5 238.2 152.65 242.3 133.7 249.65 121.2 254.55 120.75 255.15 118.85 257.85 123.45 272.25 128.3 287.5 126.7 292.4 125.75 295.4 107.45 307.1 88.4 319.25 86.5 322.1 85.2 324.05 85.05 327.9 84.95 330.1 85 334.45 84.85 338 83.6 339.4 82.05 341.2 78.25 340.4 72.45 339.2 74.85 330.8 L76.6 324.7 Q77.2 321.65 75.75 320.75 73.3 319.2 70.4 323.25 68.65 325.7 65.15 333 61.65 340.3 59.85 342.8 56.8 347 54.25 345.65 46.65 341.65 56.6 327.85 L64.25 317.9 Q67.95 312.9 67.55 311.35 67.1 309.75 63.9 309.55 L57.35 309.55 Q48.2 309.45 48.35 302.9 48.4 299.9 52.05 299.5 L60.25 300.2 68.8 301.15 Q72.95 301.05 73.7 298.55 74.25 296.75 73.1 294.5 L70.8 290.7 Q68 286.25 72.35 283.65 76.7 281.05 78.85 287.35 L80.3 292.15 Q81.15 294.45 82.15 294.45 85.85 294.45 95.5 290.45 106.6 285.85 107.95 281.65 109 278.45 106.25 269.1 103.55 260.15 101.8 258.9 100.25 257.8 96.9 258.5 93.9 259.15 93.05 260.2 87 267.45 82.4 269.85 79.85 271.15 76.05 272.5 75.1 273.1 68.2 279.75 60 287.3 52.3 292.05 27.25 307.45 6.25 295.75 -2.3 291 0.8 273.2 1.75 267.65 3.8 261.45 L5.6 256.35 4.95 253.85 Q4.3 250.45 4.3 246 4.3 242.05 9.05 238.85 16.3 233.95 19.15 230.5 L23.8 223.9 Q26.15 220.25 27.8 218.45 33.05 212.75 48.25 205.95 53.75 203.45 64.05 199.65 L84.2 192.45 Q86.6 181.75 90.2 174.5 95.3 164.2 102.25 162.35 110.45 160.2 117.45 165.7 122.2 169.45 125.85 176.25 143.35 168.3 151.1 161.8 163 151.75 175.15 135.9 181.65 127.4 189.7 115.45 197.25 105.1 209.2 95.65 215.8 89.7 216.75 85.85 217.6 82.25 213.4 82.3 211.75 82.35 209.65 85.15 L205.85 90.8 Q200.75 98.1 196 94.4 191.4 90.85 197 86.55 L200.95 83.55 Q202.6 82 201.5 80.95 200.45 79.95 196.65 82 L188.75 86.7 Q177.5 93.35 174.5 88.7 172.15 85 181.7 80.7 L188.5 77.6 Q191.6 75.9 191.2 74.6 190.8 73.35 187.45 74.15 L180.35 76.25 Q170.15 79 169.25 72.75 168.75 69.35 172.3 68 174.7 67.05 180.4 66.85 L188.75 66.35 Q192.6 65.7 192.55 63.5 192.55 62.45 191.1 62.15 L188.2 61.75 Q184.25 61.1 185.6 55.95 186.6 52.15 189.2 52.1 191 52.05 194.65 54.1 199.35 56.8 200.5 57.2 203.7 58.4 205.4 56.7 L209 52.4 Q213.95 48.1 220.5 47.9 226.65 47.75 233.65 58.3 L238.5 66 Q241 69.8 242.5 70.4 258.7 63.15 263.55 59.6 270.3 54.75 272 47.1 M49.2 267.65 Q45.8 271.1 45.35 275.4 44.85 279.75 47.55 282.35 50.2 285 54.5 284.4 58.85 283.8 62.2 280.35 65.6 276.9 66.05 272.6 66.55 268.3 63.85 265.65 61.15 263.05 56.85 263.6 52.6 264.2 49.2 267.65\"/>\n    <path stroke=\"none\" fill=\"url(#gradient1)\" d=\"M49.2 267.65 Q52.6 264.2 56.85 263.6 61.15 263.05 63.85 265.65 66.55 268.3 66.05 272.6 65.6 276.9 62.2 280.35 58.85 283.8 54.5 284.4 50.2 285 47.55 282.35 44.85 279.75 45.35 275.4 45.8 271.1 49.2 267.65\"/>\n  </g>\n</svg>" + "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <defs>\n    <linearGradient gradientUnits=\"userSpaceOnUse\" x1=\"-819.2\" x2=\"819.2\" spreadMethod=\"pad\" gradientTransform=\"matrix(0.1937713623046875 0 0 0.1937713623046875 158.4 172.95)\" id=\"gradient0\">\n      <stop offset=\"0\" stop-color=\"#c4202a\"/>\n      <stop offset=\"1\" stop-color=\"#d02531\"/>\n    </linearGradient>\n  </defs>\n  <g>\n    <path stroke=\"none\" fill=\"url(#gradient0)\" d=\"M272 47.1 Q274.65 35.4 267.6 28.75 257.55 19.25 227.75 19.15 201.95 19.05 151.1 31.2 L118.7 39 Q104.35 42.2 101.35 41.35 97.05 40.1 110.25 34.2 122 28.95 144.5 21.25 150.2 19.3 161.4 14.65 172.4 10.1 178.9 7.9 201.05 0.45 227.7 0 260.3 -0.55 282.95 12.6 306.25 26.15 305.95 47.15 305.75 64.8 294.35 87.25 288.6 98.5 282.55 107.8 286.2 114.25 290.2 124 293.85 132.95 295.65 139.4 297.2 144.8 297.75 155.15 L298.3 167.8 Q299.05 173.95 302.95 178.9 305.25 181.95 310.35 186.05 314.95 189.8 316.05 191.5 317.8 194.45 315.45 197.75 311.4 203.55 303.3 194.3 L297.25 187.15 Q294.1 183.6 292.4 183.8 290.65 184 291 189.95 L292.4 202.8 Q294.4 221.3 288.5 221.3 284.95 221.3 283.8 216.65 282.95 213.45 283.1 206.2 283.2 197.55 282.95 195.25 282.45 189.95 280.05 189.05 277.65 188.15 275.2 192.2 274 194.15 270.9 201.45 268.15 207.9 266.2 210.4 263.3 214.05 260.15 212.6 257 211.15 258 207.25 258.65 204.55 262.05 199.25 L267.3 190.7 Q269.65 186.1 268.6 183.8 267.55 181.45 264.75 182.8 263.3 183.55 259.05 186.95 255.1 190.15 253.05 190.95 249.95 192.15 248.3 189.55 245.5 185.15 252.7 181.2 L258.25 178.15 Q261.05 176.4 261.3 174.7 261.55 172.95 260.5 171.95 260.05 171.55 258.2 170.6 255.05 169.05 256.25 165.3 257.55 161.35 260.95 162.65 265.85 164.55 268 163.8 271.65 162.5 273.2 158.65 274.05 156.45 274.55 151.6 274.85 148.8 274.95 142.5 275 134.7 274.55 128.4 264.4 149.5 248.9 172.55 232.5 197 220.9 207.15 206.4 219.9 162.5 238.15 L133.7 249.65 Q121.2 254.5 120.75 255.1 118.9 257.8 123.45 272.2 128.3 287.45 126.7 292.4 125.75 295.4 107.45 307.05 88.4 319.2 86.5 322.1 85.2 324.05 85.05 327.9 84.95 330.05 85 334.4 84.85 337.95 83.6 339.35 82.05 341.15 78.25 340.35 72.45 339.15 74.85 330.75 L76.6 324.65 Q77.2 321.6 75.75 320.7 73.3 319.2 70.4 323.25 68.65 325.65 65.15 332.95 61.65 340.25 59.85 342.8 56.8 346.95 54.25 345.6 46.65 341.65 56.6 327.85 L64.2 317.85 Q67.95 312.9 67.5 311.35 67.05 309.75 63.9 309.5 L57.3 309.5 Q48.2 309.4 48.3 302.9 48.35 299.9 52.05 299.5 L60.25 300.2 68.8 301.15 Q72.95 301.05 73.7 298.55 74.25 296.7 73.1 294.45 L70.8 290.7 Q68 286.2 72.35 283.6 76.7 281 78.85 287.3 L80.3 292.1 Q81.15 294.4 82.15 294.4 85.85 294.4 95.5 290.4 106.6 285.8 107.95 281.6 109 278.4 106.2 269.1 103.55 260.15 101.75 258.85 100.2 257.75 96.9 258.45 93.9 259.1 93.05 260.15 87 267.4 82.4 269.8 79.85 271.15 76.05 272.5 75.1 273.1 68.2 279.75 60 287.25 52.3 292 27.25 307.45 6.25 295.75 -2.3 290.95 0.8 273.15 1.75 267.6 3.8 261.4 L5.6 256.3 4.95 253.8 Q4.3 250.45 4.3 246 4.3 242.05 9.05 238.85 16.35 233.9 19.15 230.45 L23.8 223.85 Q26.15 220.25 27.8 218.45 33.05 212.75 48.25 205.9 53.75 203.45 64.05 199.65 L84.2 192.4 Q86.6 181.7 90.2 174.45 95.3 164.2 102.25 162.35 110.45 160.2 117.45 165.7 122.2 169.45 125.85 176.25 143.25 168.35 151.1 161.75 163 151.7 175.1 135.85 181.6 127.35 189.7 115.4 197.3 104.95 209.2 95.65 215.8 89.7 216.75 85.8 217.6 82.2 213.4 82.3 211.75 82.3 209.65 85.1 L205.85 90.75 Q200.75 98.05 196 94.35 191.4 90.8 197 86.55 L200.95 83.55 Q202.6 82 201.5 80.95 200.45 79.95 196.65 82 L188.75 86.7 Q177.5 93.3 174.5 88.65 172.15 84.95 181.7 80.65 L188.5 77.55 Q191.55 75.9 191.15 74.6 190.75 73.3 187.45 74.1 L180.35 76.2 Q170.15 79 169.25 72.75 168.75 69.35 172.3 67.95 174.7 67.05 180.4 66.8 L188.75 66.3 Q192.6 65.65 192.55 63.45 192.5 62.4 191.1 62.1 L188.15 61.7 Q184.25 61.05 185.6 55.9 186.6 52.1 189.2 52.05 191 52 194.6 54.05 199.3 56.75 200.45 57.2 203.65 58.35 205.35 56.65 L209 52.4 Q213.95 48.05 220.5 47.85 226.65 47.7 233.65 58.3 L238.5 66 Q241 69.8 242.5 70.4 258.75 63.1 263.55 59.6 270.3 54.7 272 47.1\"/>\n  </g>\n</svg>" + "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <defs>\n    <linearGradient gradientUnits=\"userSpaceOnUse\" x1=\"-819.2\" x2=\"819.2\" spreadMethod=\"pad\" gradientTransform=\"matrix(0.00994873046875 -0.0101776123046875 0.0101776123046875 0.00994873046875 10.45 10.5)\" id=\"gradient0\">\n      <stop offset=\"0\"/>\n      <stop offset=\"1\" stop-opacity=\"0\"/>\n    </linearGradient>\n  </defs>\n  <g>\n    <path stroke=\"none\" fill=\"url(#gradient0)\" d=\"M3.95 4.15 Q7.35 0.7 11.6 0.1 15.9 -0.45 18.6 2.15 21.3 4.75 20.8 9.05 20.35 13.35 16.95 16.8 13.6 20.25 9.25 20.85 4.95 21.45 2.3 18.8 -0.4 16.2 0.1 11.9 0.55 7.6 3.95 4.15\"/>\n  </g>\n</svg>" + "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <defs/>\n  <g>\n    <path stroke=\"none\" fill=\"#ffffff\" d=\"M3.45 1.75 Q3.45 2.45 2.95 2.95 2.45 3.45 1.75 3.45 1 3.45 0.5 2.95 0 2.45 0 1.75 0 1 0.5 0.5 1 0 1.75 0 2.45 0 2.95 0.5 3.45 1 3.45 1.75\"/>\n  </g>\n</svg>";
data.categories = [
    {
        name: "Animals / Pet",
        icon: "imgs/symbols/pet.png",
        content: [svgImg, "dfsdf", "fsdf", "fdf", "dfsssdf", "fsdfvcdf", "fdcxdef"]
    },
    { name: "Cars / Vehicules", content: ["ffff", "fdf"] },
    { name: "Colors / Trees" }
];
var canvas;
var msg = new Messenger();
var app = angular.module("OLM", ['ngAnimate', 'ngSanitize', 'ab-base64']);
app.config(['$httpProvider', function ($httpProvider) {
    delete $httpProvider.defaults.headers.common['X-Requested-With']; //Fixes cross domain requests
}]);
app.service("Command", Command);
app.controller("ToolsController", ["$scope", "$rootScope", "$http", 'base64', ToolsController]);
app.controller("PopupsController", ["$scope", PopupsController]);
app.controller("SymbolsController", ["$scope", "$http", SymbolsController]);
app.controller("CanvasController", ["$scope", 'Command', CanvasController]);
app.controller("TransformController", ["$scope", 'Command', TransformController]);
app.controller("ShadowController", ["$scope", 'Command', ShadowController]);
app.controller("AddTextController", ["$scope", AddTextController]);
app.controller("DownloadLogoController", ["$scope", DownloadLogoController]);
app.controller("WelcomeController", ["$scope", WelcomeController]);
app.controller("LoginController", ["$scope", "$http", LoginController]);
app.controller("ObjectsController", ["$scope", ObjectsController]);
app.controller("ConfirmationController", ["$scope", ConfirmationController]);
app.controller("ModifyController", ['$scope', 'Command', ModifyController]);
app.controller("FontSelectionController", ['$scope', FontSelectionController]);
app.controller("TextController", ['$scope', TextController]);
app.controller("RenameController", ['$scope', RenameController]);
app.controller("SymbolColorController", ['$scope', SymbolColorController]);
//app.factory("debounce", ["$timeout", debounceFactory]);
window.onload = function () {
};
var NgApp = (function () {
    function NgApp(name) {
        var ext = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            ext[_i - 1] = arguments[_i];
        }
        this.app = angular.module(name, ext);
    }
    NgApp.prototype.addController = function (controllerClass) {
        controllerClass.ext.push('$scope', '$cmd', '$msg');
        controllerClass.ext.push(controllerClass);
        this.app.controller(controllerClass.name, controllerClass.ext);
    };
    return NgApp;
})();
//// console.log('NgApp.name: ' + NgApp.name);
var NgController = (function () {
    function NgController($scope, $cmd, $msg) {
        this.$scope = $scope;
        this.$cmd = $cmd;
        this.$msg = $msg;
    }
    NgController.ext = [];
    return NgController;
})();
/*  This work is licensed under Creative Commons GNU LGPL License.

    License: http://creativecommons.org/licenses/LGPL/2.1/
   Version: 0.9
    Author:  Stefan Goessner/2006
    Web:     http://goessner.net/
*/
function xml2json(xml, tab) {
    var X = {
        toObj: function (xml) {
            var o = {};
            if (xml.nodeType == 1) {
                if (xml.attributes.length)
                    for (var i = 0; i < xml.attributes.length; i++)
                        o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();
                if (xml.firstChild) {
                    var textChild = 0, cdataChild = 0, hasElementChild = false;
                    for (var n = xml.firstChild; n; n = n.nextSibling) {
                        if (n.nodeType == 1)
                            hasElementChild = true;
                        else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/))
                            textChild++; // non-whitespace text
                        else if (n.nodeType == 4)
                            cdataChild++; // cdata section node
                    }
                    if (hasElementChild) {
                        if (textChild < 2 && cdataChild < 2) {
                            X.removeWhite(xml);
                            for (var n = xml.firstChild; n; n = n.nextSibling) {
                                if (n.nodeType == 3)
                                    o["#text"] = X.escape(n.nodeValue);
                                else if (n.nodeType == 4)
                                    o["#cdata"] = X.escape(n.nodeValue);
                                else if (o[n.nodeName]) {
                                    if (o[n.nodeName] instanceof Array)
                                        o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
                                    else
                                        o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                                }
                                else
                                    o[n.nodeName] = X.toObj(n);
                            }
                        }
                        else {
                            if (!xml.attributes.length)
                                o = X.escape(X.innerXml(xml));
                            else
                                o["#text"] = X.escape(X.innerXml(xml));
                        }
                    }
                    else if (textChild) {
                        if (!xml.attributes.length)
                            o = X.escape(X.innerXml(xml));
                        else
                            o["#text"] = X.escape(X.innerXml(xml));
                    }
                    else if (cdataChild) {
                        if (cdataChild > 1)
                            o = X.escape(X.innerXml(xml));
                        else
                            for (var n = xml.firstChild; n; n = n.nextSibling)
                                o["#cdata"] = X.escape(n.nodeValue);
                    }
                }
                if (!xml.attributes.length && !xml.firstChild)
                    o = null;
            }
            else if (xml.nodeType == 9) {
                o = X.toObj(xml.documentElement);
            }
            else
                alert("unhandled node type: " + xml.nodeType);
            return o;
        },
        toJson: function (o, name, ind) {
            var json = name ? ("\"" + name + "\"") : "";
            if (o instanceof Array) {
                for (var i = 0, n = o.length; i < n; i++)
                    o[i] = X.toJson(o[i], "", ind + "\t");
                json += (name ? ":[" : "[") + (o.length > 1 ? ("\n" + ind + "\t" + o.join(",\n" + ind + "\t") + "\n" + ind) : o.join("")) + "]";
            }
            else if (o == null)
                json += (name && ":") + "null";
            else if (typeof (o) == "object") {
                var arr = [];
                for (var m in o)
                    arr[arr.length] = X.toJson(o[m], m, ind + "\t");
                json += (name ? ":{" : "{") + (arr.length > 1 ? ("\n" + ind + "\t" + arr.join(",\n" + ind + "\t") + "\n" + ind) : arr.join("")) + "}";
            }
            else if (typeof (o) == "string")
                json += (name && ":") + "\"" + o.toString() + "\"";
            else
                json += (name && ":") + o.toString();
            return json;
        },
        innerXml: function (node) {
            var s = "";
            if ("innerHTML" in node)
                s = node.innerHTML;
            else {
                var asXml = function (n) {
                    var s = "";
                    if (n.nodeType == 1) {
                        s += "<" + n.nodeName;
                        for (var i = 0; i < n.attributes.length; i++)
                            s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                        if (n.firstChild) {
                            s += ">";
                            for (var c = n.firstChild; c; c = c.nextSibling)
                                s += asXml(c);
                            s += "</" + n.nodeName + ">";
                        }
                        else
                            s += "/>";
                    }
                    else if (n.nodeType == 3)
                        s += n.nodeValue;
                    else if (n.nodeType == 4)
                        s += "<![CDATA[" + n.nodeValue + "]]>";
                    return s;
                };
                for (var c = node.firstChild; c; c = c.nextSibling)
                    s += asXml(c);
            }
            return s;
        },
        escape: function (txt) {
            return txt.replace(/[\\]/g, "\\\\").replace(/[\"]/g, '\\"').replace(/[\n]/g, '\\n').replace(/[\r]/g, '\\r');
        },
        removeWhite: function (e) {
            e.normalize();
            for (var n = e.firstChild; n;) {
                if (n.nodeType == 3) {
                    if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
                        var nxt = n.nextSibling;
                        e.removeChild(n);
                        n = nxt;
                    }
                    else
                        n = n.nextSibling;
                }
                else if (n.nodeType == 1) {
                    X.removeWhite(n);
                    n = n.nextSibling;
                }
                else
                    n = n.nextSibling;
            }
            return e;
        }
    };
    if (xml.nodeType == 9)
        xml = xml.documentElement;
    var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
    return "{\n" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "\n}";
}
//# sourceMappingURL=olm.js.map
