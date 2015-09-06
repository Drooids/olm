
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
        if (lkey1 == 64) bytes--; //padding chars, so skip
        if (lkey2 == 64) bytes--; //padding chars, so skip
		
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
            if (enc3 != 64) uarray[i + 1] = chr2;
            if (enc4 != 64) uarray[i + 2] = chr3;
        }

        return uarray;
    }
}

var $cmd: Command;
var $msg: Messenger;
declare var Base64;

function scopeApply(scope) {
    try {
        scope.$apply();
    } catch (e) {
    }
}

class DataService {

    content;

    get() {
        return this.content;

    }


}




enum UndoType {
    SWITCH,
    INVERT,
    FACTOR,
    SKIP
}


class Command {


    private history = [];
    private index = 0;

    private commandMap = new Map<string, Function>();
    private undoMap = new Map<string, Function>();
    private callerMap = new Map<string, any>();

    constructor() {
        $cmd = this;
    }

    public run(name: string, ...args) {
        history.length = this.index;
        console.log('command: ', name);
        this.history.push({ name: name, args: args });
        var func:Function = this.commandMap[name];
        if (func) {
            func.apply(this.callerMap[name], args);
        } else {
            console.warn("unregistered command: " + name);
        }
        this.index++;
        this.updateUndoRedoState();
    }

    public map(name: string, callback: Function, caller?: any, undoType?: UndoType) {
        console.log('map', name, undoType);

        this.commandMap[name] = callback;
        this.callerMap[name] = caller;
        if (undoType!=null) {
            this.setUndoType(name, undoType);
        }
    }

    public setUndoType(name: string, type: UndoType) {
        this.undoMap[name] = type;
    } 

    public mapUndo(name: string, callback: Function) {
        this.undoMap[name] = callback;
    }



    public undo() {
        this.index--;
        var action = this.history[this.index];
        var func = this.undoMap[action.name];
        this.updateUndoRedoState();
        console.log('undo', action.name, func);
        if (func == null) return;
        switch (func) {
            case UndoType.SWITCH:
                var fnDo: Function = this.commandMap[action.name];
                fnDo.call(this.callerMap[action.name], action.args[0], action.args[2], action.args[1]);
                break;
            case UndoType.INVERT:
                var fnDo: Function = this.commandMap[action.name];
                fnDo.call(this.callerMap[action.name], -action.args[0], -action.args[1]);
                break;
            case UndoType.FACTOR:
                var fnDo: Function = this.commandMap[action.name];
                fnDo.call(this.callerMap[action.name], 1 / action.args[0], 1 / action.args[1]);
                break;
            case UndoType.SKIP:
                this.undo();
                break;
            default:
                func.apply(this.callerMap[action.name], action.args);
                break;
        }
        
    }

    public redo() {
        if (this.history.length == this.index) return;
        var action = this.history[this.index];
        var funcUndo = this.undoMap[action.name];
        if (funcUndo == UndoType.SKIP) {
            this.index++;
            this.redo();
            return;
        }
        var func: Function = this.commandMap[action.name];
        if (func) {
            func.apply(this.callerMap[action.name], action.args);
        } else {
            console.warn("unregistered redo: " + name);
        }
        this.index++;
        this.updateUndoRedoState();
    }

    updateUndoRedoState() {
        msg.send('update-undo-redo-state', this.index > 0, this.index < this.history.length);
    }
}









class ToolsController {

    isSaving = false;

    constructor(private $scope, private $rootScope, private $http, private base64){

        this.$scope.$ = this;   
        document.getElementById('fileupload').addEventListener('change', this.onFileSelect, false);
        msg.on('confirmation-clicked', this.onSaveProjectConfirm, this);
        keys.bindCtrl(73,this.addSymobol,this);
        keys.bindCtrl(84,this.addText,this);
        keys.bindCtrl(85,this.uploadImage,this);
        keys.bindCtrl(68,this.downloadLogo,this);
        keys.bindCtrl(83,this.saveProject,this);
        keys.bindKey(112,this.onTutorialClick,this);
    }

    // this is not supposed to be here!
    onTutorialClick(){
        open("http://www.onlinelogomaker.com/tutorial","_blank");
    }

    addSymobol() {
        msg.send('open-symbols');
    }

    addText() {
        msg.send('open-popup');
        msg.send('open-addtext');
        console.log('addtext.clciked');
    }

    uploadImage() {
        $('#fileupload').trigger('click'); 
    }

    downloadLogo() {
        msg.send('open-popup', 'downloadlogo');

    }

    saveProject() {
        msg.send('open-popup', 'confirmation');
        this.isSaving = true;
    }

    onSaveProjectConfirm(val: boolean) {
        if (!this.isSaving || !val) return;
        this.isSaving = false;
        var SAVE_URL = "http://www.onlinelogomaker.com/applet_scripts/SaveUserData.php?type=projects"
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
            url: url.replace(".olm",".png"),
            dataType: 'json',
            data:imgRaw,
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            processData: false
        }).then(function (data) {
            console.log("Project Saved");
        });
        console.log(img);
    }

    onFileSelect(evt) {
        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
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

    }
    
}
function htmlString(str) {
    return "<h1>" + str + "</h1>";
}
class SymbolsController {

    selectedCategory = 0;
    categories;

    selectedSymbol = 0;
    symbolsRootUrl = "assets/symbols/celebration/Celebration ";

    constructor(private $scope, private $http) {
        $scope.visible = false;
        this.categories = data.categories;
        msg.on('open-symbols', this.open, this);
        this.$scope.$ = this;
        this.htmlString = htmlString(svgImg);

        /*
        this.$http.get('assets/symbols/animals.json')
            .then(function (res) {
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
        $scope.$.categories[0].content = [1,2,3];


    }

    open() {
        this.$scope.visible = true;
    }

    getCategoryStyle(index) {
        return index == this.selectedCategory ? 'category-item-selected' : '';
    }

    getSymbolStyle(index) {
        return index == this.selectedSymbol ? 'symbol-item-selected' : '';
    }

    getSelectedCategorySymbols() {
        return this.categories[this.selectedCategory].content;
    }

    htmlString;
    
    onCategoryClick(index: number) {
        this.categories[this.selectedCategory].cssClass = "";
        this.selectedCategory = index;
        this.selectedSymbol = 0;
        this.categories[this.selectedCategory].cssClass = "category-item-selected";
    }

    onSymbolClick(index: number) {
        this.selectedSymbol = index;
    }

    onCancelClick() {
        this.$scope.visible = false;
        msg.send('close-popups');
    }

    onOkClick() {
        msg.send('add-symbol', this.symbolsRootUrl+  this.getSelectedCategorySymbols()[this.selectedSymbol]+'.svg');
        this.$scope.visible = false;
        msg.send('close-popups');
    }

}

class PopupsController {

    constructor(private $scope) {
        msg.on('open-symbols', this.open, this);
        msg.on('close-popups', this.close, this);
        msg.on('open-popups', this.open, this);
        msg.on('open-addtext', this.open, this);
        msg.on('open-popup', this.openPopup, this);
    }

    open() {
        this.$scope.visible = true;
    }

    openPopup(name) {
        console.log('openPopup: ' + 'open-'+name);
        this.$scope.visible = true;

        msg.send('open-' + name);
    }

    close() {
        this.$scope.visible = false;
    }
}

class CanvasController {

    static instance: CanvasController;

    canvas;
    selected: fabric.IObject;

    constructor(private $scope, private $cmd: Command) {
        $scope.$ = this;
        CanvasController.instance = this;

        canvas = this.canvas = new fabric.Canvas('canvas');
        $canvas = new CanvasService(canvas);
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

        $cmd.map('move', this.move,this);
        $cmd.setUndoType('move', UndoType.INVERT);
        $cmd.map('add-symbol', this.addSymbol);
        $cmd.map('scale', this.scale, this, UndoType.FACTOR);

        $cmd.map('rotate', this.rotate, this, UndoType.INVERT);

        $cmd.map('duplicate', this.duplicate, this, UndoType.SKIP);

      /*  $cmd.map('add-object', function (obj) {
            //canvas.add(obj).renderAll();
            //canvas.setActiveObject(obj);

            //msg.send('object-added', obj);
        }, this);
        $cmd.mapUndo('add-object', canvas.remove);
        */
        $cmd.map('text-color', this.textColor, this, UndoType.SWITCH);

        $cmd.map('text-font',this.textFont,this);

        $scope.undoActive = false;
        $scope.redoActive = false;

        keys.bindCtrl(90,this.onUndoClick,this);
        keys.bindCtrl(89,this.onRedoClick,this);
    }

    updateUndoRedoState(b1, b2) {
        this.$scope.undoActive = b1;
        this.$scope.redoActive = b2;
    }


    duplicate() {
        var object = fabric.util["object"].clone(canvas.getActiveObject());
        object.set("top", object.top + 5);
        object.set("left", object.left + 5);
        $cmd.run('add-object', object);
    }

    

    rotate(angle) {
        this.selected.rotate(this.selected.getAngle()+ angle);
        canvas.renderAll();
    }

    move(x, y) {
        this.selected.setTop(this.selected.top + y);
        this.selected.setLeft(this.selected.left + x);
        canvas.renderAll();
    }


    scale(x:number,y:number) {
        this.selected.setScaleX(x);
        this.selected.setScaleY(y);
        msg.send('update-scale');
        canvas.renderAll();
    }



   

    textColor(lastVal, val) {
        var textObj: fabric.IText = <fabric.IText> this.selected;
        console.log('textColor: ' + textObj);
        if (!textObj) return;
        console.log('textColor');
        textObj.setColor('#' + val);
        canvas.renderAll();
    }

    textFont(val) {
        var textObj: fabric.IText = <fabric.IText> this.selected;
        if (!textObj) return;
        textObj.fontFamily = val;
        canvas.renderAll();
    }



    addSymbol(url) {
        var _this = this;
        fabric.loadSVGFromURL(url, function (objects, options) {
            var obj: fabric.IObject = fabric.util.groupSVGElements(objects, options);
            console.log(obj);

            $cmd.run('add', $canvas.create(DOType.SYMBOL,  obj));
            console.log("svg loaded");
        });
    }

    addImage(url:string) {
        var _this = this;
        fabric.Image.fromURL(url, function (oImg) {
            $cmd.run('add', $canvas.create( DOType.IMAGE, oImg));
        });
    }

    addText(value: string) {
        var text = new fabric.Text(value, { left: 100, top: 100 });
        $cmd.run('add', $canvas.create(DOType.TEXT, text));
    }


    addListeners(obj: fabric.IObject) {
        obj.on('selected', this.onObjectMove);
        obj.on('moving', this.onObjectMove);
    }

    onObjectSelect(e) {
        console.log("select: ", e,this);
        CanvasController.instance.selected = e.target;
        canvas["object"] = e.target;
    }

    onObjectMove(e) {
        console.log(e.target.get('left'),e.target.get('top'));
        msg.send('transformed', e);

    }

    onRedoClick() {
        this.$cmd.redo();
    }

    onUndoClick() {
        this.$cmd.undo();
    }

    saveCanvas() {
        var bound = this.getRectBounds();
        var copy = document.createElement('canvas').getContext('2d');
        var trimHeight = bound.bottom - bound.top,
            trimWidth = bound.right - bound.left,
            trimmed = canvas.getContext().getImageData(bound.left, bound.top, trimWidth, trimHeight);
        copy.canvas.width = trimWidth;
        copy.canvas.height = trimHeight;
        copy.putImageData(trimmed, 0, 0);
        var image = copy.canvas.toDataURL(); 
        var header = 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=logo.png';
        image = image.replace('data:image/png', header);
        
        document.getElementById("dl")["object"] = image;
//        window.open(image);
        
    }

    getRectBounds() {
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
                } else if (x < bound.left) {
                    bound.left = x;
                }

                if (bound.right === null) {
                    bound.right = x;
                } else if (bound.right < x) {
                    bound.right = x;
                }

                if (bound.bottom === null) {
                    bound.bottom = y;
                } else if (bound.bottom < y) {
                    bound.bottom = y;
                }
            }
        }
        return bound;
    }


}

class TransformController {

    static instance;

    selected:fabric.IObject;

    constructor(private $scope,private $cmd) {
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
            this.$scope.height = this.selected.get('height') * this.selected.scaleY;;
            //this.$scope.$apply();

        },this);
    }


    onChangeScale() {
        var _this = TransformController.instance;
        if (!_this.selected) return;
        _this.$cmd.run('scale', _this.$scope.width / _this.selected.width, _this.$scope.height / _this.selected.height);
    }



    onObjectSelect(e) {
       // msg.send('object-selected', e.target);

        var _this = TransformController.instance;

        _this.selected = e.target;
        _this.$scope.x = e.target.get('left');
        _this.$scope.y = e.target.get('top');
        _this.$scope.width = e.target.get('width') * e.target.scaleX ;
        _this.$scope.height = e.target.get('height') * e.target.scaleY ;
        //_this.$scope.$apply();
    }

    onObjectMove(e) {
        var _this = TransformController.instance;
        _this.$scope.x = e.target.get('left');
        _this.$scope.y = e.target.get('top');
        _this.$scope.$apply();
    }

    onObjectScale(e) {
        var _this = TransformController.instance;
        _this.$scope.width = e.target.get('width') * e.target.scaleX;
        _this.$scope.height = e.target.get('height') * e.target.scaleY;;
        _this.$scope.$apply();
        console.log("scale", e.target.get('width'));
    }

    onChangePosition() {
        var _this = TransformController.instance;
        console.log("change", _this.selected, _this.$scope.y);

        if (_this.selected == null) return;
        _this.selected.set('left',_this.$scope.x);
        _this.selected.set('top', _this.$scope.y);
        //_this.selected.set('scaleX', _this.$scope.width / _this.selected.width);
        //_this.selected.set('scaleY', _this.$scope.height / _this.selected.height);
        canvas.renderAll();
    }


}

class ShadowController {

    static instance;

    enabled = false;
    selectedObject: any = null;

    shadowColor = '#FFFFFF';

    picker;

    constructor(private $scope,private $cmd) {
        ShadowController.instance = this;
        $scope.$ = this;
        $scope.enabled = false;
        $scope.direction = 45;
        $scope.outset = 2;
        msg.on('object-selected', this.onObjectSelected, this);
        $scope.$watch("direction", ()=>this.onChange());
        $scope.$watch("outset", () => this.onChange());

        $(".shadow-picker")["mlColorPicker"]({
            'onChange': (val) => { this.onColorChange(val) }
        });

       // $cmd.map('shadow-color', this.changeShadowColor, this, UndoType.SWITCH);

    }

    onColorChange(val) {
        $(".shadow-picker").css('background-color', "#" + val);
        var dobj = $canvas.selection[0];
        var newShadow = $.extend(true, {}, dobj.shadow);
        newShadow.color = '#' + val;
        $cmd.run('shadow', dobj, dobj.shadow, newShadow);
       // this.$cmd.run('shadow-color', $canvas.selection[0], $canvas.selection[0].shadow.color , '#'+val);
        this.shadowColor = val;
    }
/*
    changeShadowColor(dobj,lastVal, val) {
        $canvas.setShadowColor(dobj,val);
    }
    */
    onObjectSelected(dobj: DisplayObject) {
        console.log("erzer",dobj);
        this.$scope.enabled = dobj.shadow.enabled;
        var obj = dobj.raw;
        this.selectedObject = obj;

            this.$scope.direction = Math.atan2(dobj.shadow.offsetY, dobj.shadow.offsetX) / Math.PI * 180;
            this.$scope.outset = Math.round(dobj.shadow.offsetY / Math.cos(this.$scope.direction));
            this.onChange();
        
       // this.$scope.$apply();
    
    }

    onChange() {
        var dobj = $canvas.selection[0];
        if (!dobj) return;
        if (this.$scope.enabled) {
            var newShadow = $.extend(true, {}, dobj.shadow);
            var angle = this.$scope.direction / 180 * Math.PI;
            newShadow.offsetX = Math.cos(angle) * this.$scope.outset,
            newShadow.offsetY = Math.sin(angle) * this.$scope.outset,
            $cmd.run('shadow', dobj, dobj.shadow, newShadow);
            
        }
    }



    onOnOffClick() {
        this.$scope.enabled = !this.$scope.enabled;

        var dobj = $canvas.selection[0];
        var newShadow = $.extend(true, {}, dobj.shadow);
        newShadow.enabled = this.$scope.enabled;
        $cmd.run('shadow', dobj, dobj.shadow, newShadow);
        
    }


}


class AddTextController {


    constructor(private $scope) {
        $scope.text = "";
        $scope.visible = false;
        $scope.$ = this;
        msg.on('open-addtext', this.open,this);
    }

    open() {
        this.$scope.visible = true;
        this.$scope.text = "";
    }

    onCancelClick() {
        this.$scope.visible = false;
        msg.send('close-popups');
    }

    onOkClick() {
        if (this.$scope.text) {
            msg.send('add-text', this.$scope.text);
            this.$scope.visible = false;
            msg.send('close-popups');
        }
    }
}


class DownloadLogoController {

    width = 0;
    height = 0;
    constrainProportions = true;
    useWorkingAreaColor = false;

    constructor(private $scope) {
        $scope.text = "";
        $scope.visible = false;
        $scope.$ = this;
        msg.on('open-downloadlogo', this.open, this);
    }

    open() {
        console.log('open-downloadlogo');
        this.$scope.visible = true;
        this.$scope.text = "";
    }

    onCancelClick() {
        this.$scope.visible = false;
        msg.send('close-popups');
    }

    onOkClick() {
         msg.send('save-canvas', this.width , this.height);
         this.$scope.visible = false;
         msg.send('close-popups');
    }

}


class WelcomeController {

    visible = true;

    constructor(private $scope) {
        $scope.$ = this;
        msg.on('open-welcome', this.open, this);
        setTimeout(() => {
            if (!this.visible) return;
            this.visible = false;
            msg.send("close-popups");
            $scope.$apply();
        }, 5000);
        msg.send('open-popups');
    }

    open() {
        this.$scope.visible = true;
        this.$scope.text = "";
    }

    onOkClick() {
        console.log("onOkClick");
        this.visible = false;
        msg.send("close-popups");
    }

}


class ModifyController {

    step = 2;
    factor = 1.1;
    angle = 10;

    constructor(private $scope, private $cmd: Command) {
        $scope.$ = this;
    }

    moveUp() {    
        this.$cmd.run('move', 0, -2);
    }

    moveDown() {
        this.$cmd.run('move', 0, 2);
    }

    moveLeft() {
        this.$cmd.run('move', -2, 0);
    }

    moveRight() {
        this.$cmd.run('move', 2, 0);
    }

    zoomIn() {
        this.$cmd.run('scale', this.factor * canvas["selected"].getScaleX(), this.factor * canvas["selected"].getScaleX());

    }

    zoomOut() {
        this.$cmd.run('scale', 1 / this.factor * canvas["selected"].getScaleX(), 1 / this.factor * canvas["selected"].getScaleX());
    }

    rotateCW() {
        $cmd.run('rotate', this.angle);
    }

    rotateCCW() {
        $cmd.run('rotate', -this.angle);
    }

    duplicate() {
        $cmd.run('duplicate');
    }

}




class LoginController {

    GET_USER_URL = "http://www.onlinelogomaker.com/applet_scripts/GetUser.php";
    LOGIN_URL = "http://www.onlinelogomaker.com/applet_scripts/DoLogin.php";
    LOGOUT_URL = "http://www.onlinelogomaker.com/applet_scripts/DoLogout.php";

    constructor(private $scope, private $http: ng.IHttpService) {
        this.$scope.$ = this;
        $scope.logged = false;
        $http.defaults.headers.common['Access-Control-Allow-Headers'] = '*';
        this.init();
    }

    init() {
        $.post(this.GET_USER_URL,
            {
                username: this.$scope.username,
                password: this.$scope.password
            },(data: XMLDocument, status) => {
                var res: any = JSON.parse(xml2json(data, ''));
                try {
                    if (res.root.user.id == -1) {
                        msg.send('open-popup', 'invalid-user-pass');
                        console.log("Not logged In");
                        this.$scope.logged = false;
                        this.$scope.$apply();

                    } else {
                        this.$scope.userfullname = res.root.user.name;
                        this.$scope.user = res.root.user;
                        this.$scope.logged = true;
                        this.$scope.$apply();
                        console.log("Welcome, " + this.$scope.userfullname);
                    }
                } catch (e) {
                    console.error(e);
                }
            }, "xml");

        function getQueryVariable(variable): any {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == variable) { return pair[1]; }
            }
            return (false);
        }
        
        var projectName =  getQueryVariable("project"); 
        var projectDataUrl = "http://www.onlinelogomaker.com/applet_userdata/315986/projects/" + projectName;
        $.get(projectDataUrl, function (data) {
            canvas.loadFromJSON(JSON.parse(data), function () {

            });
        });
    }

    onLoginClick() {
        $.post(this.LOGIN_URL,
            {
                username: this.$scope.username,
                password: this.$scope.password
            },(data: XMLDocument, status) => {

                function setCookie(cname, cvalue, exdays) {
                    var d = new Date();
                    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
                    var expires = "expires=" + d.toUTCString();
                    document.cookie = cname + "=" + cvalue + "; " + expires;
                }

                //var cook = prompt("Coookie:", "");
                //setCookie('__cfduid', cook, 30);

                //console.log("cookie: " + getCookie("__cfduid"));

                var res: any = JSON.parse(xml2json(data, ''));
                if (res.error) {
                    msg.send('open-popup', 'invalid-user-pass');
                    console.log("Invalid username or password");
                    this.$scope.logged = false;
                    this.$scope.$apply();

                } else if (res.root) {
                    this.$scope.userfullname = res.root.user.name;
                    console.log(this);
                    this.$scope.logged = true;
                    this.$scope.$apply();
                    console.log("Welcome, "+this.$scope.userfullname);
                }
            }, "xml");
    }

    onRegisterClick() {
        open("http://www.onlinelogomaker.com/register", "_blank");
    }

    onLogoutClick() {
        $.post(this.LOGOUT_URL,(data: XMLDocument, status) => {
            this.$scope.logged = false;
            this.$scope.user = null;
        });
    }

    onAccountClick() {
        open("http://www.onlinelogomaker.com/account", "_blank");
    }

    onFacebookClick() {
        open("https://www.facebook.com/sharer/sharer.php?s=100&p[url]=http://www.onlinelogomaker.com&p[images][0]=http://www.onlinelogomaker.com/images/favicon-cropped128.png&p[title]=Create+your+own+logo+for+free&p[summary]=Create%20your%20own%20logo%20now%20using%20Online%20Logo%20Maker!", "_blank");
    }

    onTwitterClick() {
        open("https://twitter.com/intent/tweet?original_referer=&source=tweetbutton&text=RT+Create+cool+logos+for+free!&url=http://www.onlinelogomaker.com/&via=rlopes528", "_blank");
    }

}



class ObjectsController {


    static instance;
    items = [];
    selectedIndex = -1;

    constructor(private $scope) {
        ObjectsController.instance = this;
        $scope.$ = this;
        msg.on('object-added', this.onObjectAdd, this);
        msg.on('object-selected', this.onObjectSelected, this);
       // canvas.on('object:selected', this.onObjectSelected);
       // canvas.on('selection:cleared', this.onSelectionCleared);
        $scope.items = $canvas.children;
    }

    onObjectSelected(obj) {
        //var _this = ObjectsController.instance;
        this.selectObject(obj, true);
        this.update();
       // scopeApply(_this.$scope);
    }



    onSelectionCleared(e) {
        console.log(e);
        var _this = ObjectsController.instance;
        _this.selectObject(e.target, false);
        //_this.$scope.$apply();
        scopeApply(_this.$scope);
    }


    onItemClick(index) {
        $canvas.select($canvas.children[index]);
    }

    onItemDoubleClick(index) {
        msg.send('open-popup', 'rename');
    }

    onObjectAdd(obj: fabric.IObject) {
        
     //   var _this = ObjectsController.instance;
        var disObj = new DisplayObject();
        
        disObj.raw = obj;
        this.items.push(disObj);
       // disObj.type = obj.type.toUpperCase();
       // if (disObj.type == "PATH-GROUP") disObj.type = "SYMBOL";
        disObj.name = "OBJECT " + this.items.length ;
        this.clearSelection();
        this.selectObject(obj, true);
    }




    selectObject(obj, value: boolean) {
       // var _this = ObjectsController.instance;
        for (var i = 0; i < this.items.length;i++) {
            if (this.items[i].raw == obj)
                this.items[i].selected = value;
        }
    }

    clearSelection() {
        //var this = ObjectsController.instance;
        for (var i = 0; i < this.items.length;i++) {
            this.items[i].selected = false;
        }
    }

    update() {
        var activeObj = canvas.getActiveObject();
       // var _this = ObjectsController.instance;
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
    }

    onRenameClick() {
        msg.send('open-popup', 'rename');
    }

    onDeleteClick() {
        
    }

    onDeleteAllClick() {

    }

}

class PopupController {

    id: string = "";
    $scope:any;

    constructor($scope) {
        this.$scope = $scope;
        $scope.$ = this;
        $scope.visible = false;
    }

    init(id: string) {
        this.id = id;
        msg.on("open-" + id, this.open, this);
        msg.on("close-" + id, this.open, this);
    }

    open() {
        this.$scope.visible = true;
        console.log("open-popup-" + this.id);
        
    }

    close() {
        this.$scope.visible = false;
        msg.send('close-popups');
    }

}

class ConfirmationController extends PopupController {

    constructor($scope) {
        super($scope);
        this.init('confirmation');
    }

    onYesClick() {
        this.close();
        msg.send("confirmation-clicked", true);
    }

    onNoClick() {
        this.close();
        msg.send("confirmation-clicked", false);
    }


}

class FontSelectionController extends PopupController {


    private normalFonts = ['Amerika_Sans','Arial','Avondale_Inline'];
    private eastFonts = ['Rix_Fantastic', 'Whoa'];

    items = [];

    

    constructor($scope) {
        super($scope);
        this.init('fontselection');
        this.generateFontFaces()
        this.onNormalClick();
        for(var i=0; i<this.normalFonts.length;i++){
            var name = this.normalFonts[i];
            var filename = name.toLowerCase();
           //var font = new canvas['Font'](name, 'assets/fonts/'+filename+'.ttf');
            //canvas['contextContainer'].addFont(font);
        }
        for(var i=0; i<this.eastFonts.length;i++){
           // registerFont(this.eastFonts[i]);
        }
    }

    generateFontFaces(){
        var fontFaces = document.createElement('style');
        for(var i=0; i<this.normalFonts.length;i++){
            var name = this.normalFonts[i];
            this.items.push({name:this.normalFonts[i]});
            fontFaces.appendChild(document.createTextNode("\
                @font-face {\
                    font-family: '" + name + "';\
                    src: url('assets/fonts/" + name.toLowerCase() + ".ttf') format(\"truetype\");\
                }\
            "));
        }
        for(var i=0; i<this.eastFonts.length;i++){
            var name = this.eastFonts[i];
            this.items.push({name:this.eastFonts[i]});
            fontFaces.appendChild(document.createTextNode("\
                @font-face {\
                    font-family: '" + name + "';\
                    src: url('assets/fonts/" + name.toLowerCase() + ".ttf') format(\"truetype\");\
                }\
            "));
        }
        document.head.appendChild(fontFaces);
    }

    

    onNormalClick() {
        this.items = [];
        for(var i=0; i<this.normalFonts.length;i++){
         this.items.push({name:this.normalFonts[i]});
        }
    }

    onEastClick() {
        this.items = [];
        for(var i=0; i<this.eastFonts.length;i++){
         this.items.push({name:this.eastFonts[i]});
        }
    }

    onItemClick(index) {
        $cmd.run('text-font',this.items[index].name);
        setTimeout(()=>{
            canvas.renderAll();
            },1000);
    }

    onOkClick() {
        this.close();

    }

    onCancelClick() {
        this.close();

    }

}

class TextController {

    static instance;
    textColor = 0;

    constructor(private $scope) {
        ObjectsController.instance = this;
        $scope.$ = this;
        $scope.visible = false;
        msg.on('object-selected', this.onObjectSelected, this);


        $(".text-picker")["mlColorPicker"]({
            'onChange': (val) => { this.onColorChange(val) }
        });

    }

    onColorChange(val) {
        $(".text-picker").css('background-color', "#" + val);
        $cmd.run('text-color', this.textColor, val);
        this.textColor = val;
    }

    onObjectSelected(obj: fabric.IObject) {
        console.log('obj.type: '+obj.type);
        this.$scope.visible = (obj.type == "text");    
    }

    onFontClick() {
        msg.send('open-popup', 'fontselection');
    }

    onColorClick() {

    }


}



class RenameController extends PopupController {


    constructor(scope) {
        super(scope);
        this.init('rename');
        $cmd.map('rename', this.rename, this);
        $cmd.mapUndo('rename', this.undoRename);
    }

    rename(dobj, oldname, newname) {
        $canvas.rename(dobj,newname);
    }

    undoRename(dobj, oldname, newname) {
        $canvas.rename(dobj, oldname);
    }

    onOkClick() {
        console.log('okclick-rename', this.$scope.newname);
        $cmd.run('rename', $canvas.selection[0], $canvas.selection[0].name, this.$scope.newname);
        this.close();
    }

    onCancelClick() {
        this.close();
    }
    


}

class SymbolColorController {


    static instance;
    textColor = 0;

    constructor(private $scope) {
        ObjectsController.instance = this;
        $scope.$ = this;
        $scope.visible = false;
        $scope.pathsVisible = true;
        msg.on('object-selected', this.onObjectSelected, this);
        msg.on('paths-selected', this.onObjectSelected, this);

        $(".color-picker")["mlColorPicker"]({
            'onChange': this.onColorChange
        });

    }

    enabled() {
        return $canvas.selection.length > 0 && $canvas.activePaths.length > 0;
    }

    onColorChange = (val) => {
        if (!this.enabled()) return;
        $(".color-picker").css('background-color', "#" + val);
        $cmd.run('symbol-color', $canvas.selection[0], '#'+$canvas.activePathsColor.toHex().toLowerCase(), '#'+val);
        this.textColor = val;
    }

    onObjectSelected(obj: fabric.IObject) {
        console.log('symbolcolor-enabled; ',this.enabled());
        this.$scope.visible = this.enabled();
        //console.log('obj.type: ' + obj.type);
        //this.$scope.visible = (obj.type == "text");
    }

    onFontClick() {
        msg.send('open-popup', 'fontselection');
    }

    onInvisibleClick() {

    }


}

interface ITransform {
    x: number;
    y: number;
    width: number;
    height: number;
}