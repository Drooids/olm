class Messenger {

    public static instance: Messenger;

    private listeners: any = {};
    private callers: any = {};

    constructor() {
        if (Messenger.instance == null) {

            Messenger.instance = this;
            $msg = this;
            //dfqds sdf 
            

        }
        else {
            console.error("Messenger is a singleton !!!");
        }
    }


    on(event: string, callback: Function, caller?: any) {
        this.send("");
        if (!caller) caller = callback.caller;
        if (Messenger.instance.listeners[event] == null) {
            Messenger.instance.listeners[event] = [];
            Messenger.instance.callers[event] = [];
        }
        Messenger.instance.listeners[event].push(callback);
        Messenger.instance.callers[event].push(caller);
    }



    send(event: string, ...args: any[]) {
        var cbs = Messenger.instance.listeners[event];
        if (cbs == null) return;
        for (var i = 0; i < cbs.length; i++) {
            cbs[i].apply(Messenger.instance.callers[event][i], args);
        }

    }


}

class KeysBinder {

    ctrlBinds: { [s: number]: Function; } = {};
    ctrlBindsCallers: { [s: number]: any; } = {};

    keyBinds: { [s: number]: Function; } = {};
    keyBindsCallers: { [s: number]: any; } = {};

    ctrlPressed = false;

    constructor() {
        document.onkeydown = this.onKeyDown.bind(this);
        document.onkeyup = this.onKeyUp.bind(this);
    }

    bindKey(keycode: number, callback: Function, caller: any) {
        this.keyBinds[keycode] = callback;
        this.keyBindsCallers[keycode] = caller;
    }

    bindCtrl(keycode: number, callback: Function, caller: any) {
        this.ctrlBinds[keycode] = callback;
        this.ctrlBindsCallers[keycode] = caller;
    }

    onKeyDown(e) {
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
        } else if (!this.ctrlPressed && cbkey) {
            cbkey.call(this.keyBindsCallers[evtobj.keyCode]);
            this.ctrlBindsCallers[evtobj.keyCode].$scope.$apply();
        }

    }

    onKeyUp(e) {
        var evtobj = window.event ? event : e;
        evtobj.preventDefault();
        if (evtobj.keyCode == 17) {
            this.ctrlPressed = false;
            console.log("ctrlPressed=false");
        }
    }
}


class DOType {
    static SYMBOL = "SYMBOL";
    static TEXT = "TEXT";
    static IMAGE = "IMAGE";
}

class DisplayObject {
    id: number = 0;
    selected: boolean = false;
    type: DOType;
    name = "";
    raw: fabric.IObject|any = null;
    shadow: any = {
        enabled:false,
        color: 'rgba(0,0,0,0.6)',
        blur: 5,
        offsetX: 0,
        offsetY: 0,
        opacity: 0.6,
        fillShadow: true,
        strokeShadow: true
    };
}

class CanvasService {

    idIndex = 0;
    root: fabric.ICanvas;
    children = [];

    public selection = [];

    activePaths: fabric.IPath[] = [];
    activePathsColor:fabric.IColor =  new fabric['Color']('rgba(0,0,0,1)');

    constructor(canvas:fabric.ICanvas) {
        this.root = canvas;
        canvas.on('mouse:down', function (e) {
                console.log('down', e);
        });
        
        $cmd.map('add-object', this.add, this);
        $cmd.mapUndo('add-object', function (rawobj) {
            var dobj = this.getByRaw(rawobj);
            if (dobj != null) {
                this.remove(dobj);
            }
        });
        $msg.on('object-selected', (rawobj) => {
            var dobj = this.getByRaw(rawobj);
            if (dobj != null) {
                this.selection = [dobj];
            }
        });

        $cmd.map('add', this.add, this);
        $cmd.mapUndo('add', this.remove);

        $cmd.map('shadow', this.shadow, this, UndoType.SWITCH);
        $cmd.map('symbol-color', this.symbolColor, this, UndoType.SWITCH);

        this.root.on('object:selected',  (e)=> {
            var dobj = this.getByRaw(e.target);
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

    alpha = 0;
    alphaModifier = 0.04;

    renderLoop = (time) => {
        if (this.alpha > 0.97) {
            this.alphaModifier = -0.03;
        } else if (this.alpha < 0.06) {
            this.alphaModifier = 0.03;
        }
        this.alpha += this.alphaModifier;
        for (var i = 0; i < this.activePaths.length; i++) {
            this.activePaths[i].setOpacity(this.alpha);

        }
        
        this.root.renderAll();
        window.requestAnimationFrame(this.renderLoop);
    }

    onMouseDown = (e: any) => {
        for (var i = 0; i < this.activePaths.length; i++) {
            this.activePaths[i].setOpacity(1);
        }
        this.root.renderAll();
        var mousePos = this.root.getPointer(e.e);
        var width = this.root.getWidth();
        var height = this.root.getHeight();
        var pixels = this.root.getContext().getImageData(0, 0, width, height);
        var pixel = (mousePos.x + mousePos.y * pixels.width) * 4;
        this.activePathsColor = new fabric['Color']('rgb(' + pixels.data[pixel] + ',' + pixels.data[pixel + 1] + ',' + pixels.data[pixel + 2] + ')');
        var colorHex = '#' + this.activePathsColor.toHex().toLowerCase();
        var dobj = this.selection[0];

        if (dobj != null && dobj.type == DOType.SYMBOL) {
            this.activePaths = [];
            for (var i = 0; i < dobj.raw.getObjects().length; i++) {
                var path = dobj.raw.getObjects()[i];
                if (path.getFill().toLowerCase() == colorHex) {
                    this.activePaths.push(path);
                }
            }
            
        }
        $msg.send('paths-selected');
    }

    create(type: DOType, object:any) {
        
        
        var dobj = new DisplayObject();
        dobj.id = this.idIndex++;
        dobj.type = type;
        dobj.name = "OBJECT" + this.idIndex;
        if (type = DOType.SYMBOL) {
            dobj.raw = new fabric.Group(object.getObjects());
            console.log("this is a symbol");
        } else {
            dobj.raw = object;
        }
        return dobj;
    }

    add(dobj:DisplayObject) {
        dobj.selected = true;
        this.root.add(dobj.raw).renderAll();
        this.children.push(dobj);
        this.select(dobj);
        
        if (dobj.type == DOType.SYMBOL) {
           // dobj.raw.perPixelTargetFind = true;
            //dobj.raw.targetFindTolerance = 4;
           // dobj.raw.hasControls = dobj.raw.hasBorders = false;
            for (var i = 0; i < dobj.raw.getObjects().length; i++) {
                var path = dobj.raw.getObjects()[i];
                console.log('path found',path.getFill());
                
            }
        }
        //msg.send('object-added', obj);
    }

    public select(dobj: DisplayObject) {
        this.unselectAll();
        dobj.selected = true;
        this.selection = [dobj];
        this.root.setActiveObject(dobj.raw);
        $msg.send('object-selected', dobj);
    }

    remove(dobj: DisplayObject) {
        this.children.splice(this.children.indexOf(dobj), 1);
        if (dobj.selected) {
            canvas.discardActiveObject();
            this.unselectAll();
        }
        this.root.remove(dobj.raw);
        console.log('remove', dobj,dobj.raw);
        this.root.renderAll();
    }

    rename(dobj: DisplayObject, newname) {
        dobj.name = newname;
    }

    shadow(dobj: DisplayObject, oldshadow, shadow) {
        console.log(oldshadow, shadow);

        dobj.shadow = shadow;
        if (shadow.enabled) {
            dobj.raw.setShadow(shadow);
        } else {
            dobj.raw.setShadow(null);
        }
        this.root.renderAll();
    }

    getPathsByColor(dobj: DisplayObject, colorHex) {
            var activePaths = [];
            for (var i = 0; i < dobj.raw.getObjects().length; i++) {
                var path = dobj.raw.getObjects()[i];
                if (path.getFill().toLowerCase() == colorHex) {
                    activePaths.push(path);
                }
            }
            return activePaths;
    }

    symbolColor(dobj: DisplayObject, oldcolor, newcolor) {
        var paths = this.getPathsByColor(dobj, oldcolor);
        console.log('setFill', paths.length, newcolor);
        for (var i = 0; i < paths.length; i++) {
            paths[i].setFill(newcolor);
        }
        this.root.renderAll();
    }

    setShadowColor(dobj: DisplayObject, color) {
        if (!dobj.shadow.enabled) return;
        dobj.shadow.color = '#' + color;
        dobj.raw.setShadow(dobj.shadow);
        this.root.renderAll();
    }

    unselectAll() {
        for (var i = 0; i < this.selection.length; i++) {
            this.selection[i].selected = false;
        }
        this.selection = [];
        this.root.discardActiveObject();
        this.root.discardActiveGroup();
    }

    getByRaw(rawobj) {
        for (var i = 0; i < this.children.length; i++) {
            if (rawobj == this.children[i].raw) return this.children[i];
        }
        return null;
    }

    getById(id) {
        for (var i = 0; i < this.children.length; i++) {
            if (id == this.children[i].id) return this.children[i];
        }
        return null;
    }
}

var $canvas: CanvasService;