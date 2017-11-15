let UI = {
    game: null
};

UI.init = function (game) {
    this.game = game;
};

UI.makeSpr = function (imgName, x = 0, y = 0, size = 1) {
    let spr = new Light.Sprite(this.game.asset.getImage(imgName));
    spr.x = x;
    spr.y = y;
    spr.width = spr.width * size;
    spr.height = spr.height * size;
    return spr;
};

UI.makeText = function (str, x = 0, y = 0, fillStyle = '#fff', font = 'Dosis', fontSize = 50) {
    let label;
    label = new Light.Text();
    label.font = font;
    label.fontSize = fontSize;
    label.fillStyle = fillStyle;
    label.position.set(x, y);
    label.text = str;
    return label;
};

UI.Container = class extends Light.EntityContainer {
    constructor(container) {
        super();
        this.target = null;
        this.smoothFollow = 3;
        this.smoothZoom = 3;
        this.offset = new Light.Point(0, 0);
        this.tScale = new Light.Point(1, 1);
        this.tPos = new Light.Point(1,1);
      
        this.alignX = "none";
        this.alignY = "none";
        
        this.onUpdate = function () {};
        this.onClick = function () {};
        Mouse.downs.add(() => {
            if (this.isMouseOn()){
                this.click();
            }
        });
        container.addChild(this);
    }
  
    isMouseOn(){
      let toLoc = (con, point)=>{
        var p = new Light.Point();
        p.x = (point.x - con.x - con.scaleCenter.x) / con.scale.x + con.scaleCenter.x;
        p.y = (point.y - con.y - con.scaleCenter.y) / con.scale.y + con.scaleCenter.y;
        return p;
      };
      
      return this.contains(toLoc(this.parent, Mouse.pos.toPoint()));
    }
    
    follow(entity, offset){
        this.target = entity;
        if (offset instanceof Light.Point)
            this.offset = offset;
        else
            this.offset = new Light.Point();
    }
    
    click() {
        this.onClick();
    }
    
    zoom(x, y){
        this.tScale.set(x,y);
    }
    
    setScalePoint(point){
        let pastVec = this.localToScreen(new Light.Point());
        this.scaleCenter = point;
        let nowVec = this.localToScreen(new Light.Point());
        this.offset.x -= pastVec.x - nowVec.x;
        this.offset.y -= pastVec.y - nowVec.y;
        this.x = this.target.x - this.offset.x;
        this.y = this.target.y - this.offset.y;
    }
    
    localToScreen(point){
        var p = new Light.Point();
        p.x = (point.x - this.scaleCenter.x) * this.scale.x + this.scaleCenter.x + this.x; 
        p.y = (point.y - this.scaleCenter.y) * this.scale.y + this.scaleCenter.y + this.y;
        return p; 
    }
    
    screenToLocal(point){
        var p = new Light.Point();
        p.x = (point.x - this.x - this.scaleCenter.x) / this.scale.x + this.scaleCenter.x;
        p.y = (point.y - this.y - this.scaleCenter.y) / this.scale.y + this.scaleCenter.y;
        return p;
    }
    
    update(elapsed) {
        super.update(elapsed);
        this.onUpdate(elapsed);

        let getTop    = (child)=>{ return child.y };
        let getBottom = (child)=>{ return child.y + child.height };
        let getLeft   = (child)=>{ return child.x };
        let getRight  = (child)=>{ return child.x + child.width };
      
        let top = 0, bottom = 0, left = 0, right = 0;
      
        this.children.forEach((child, idx)=>{
          if(idx===0){
              top = getTop(child);
              bottom = getBottom(child);
              left = getLeft(child);
              right = getRight(child);
              return;
          }
          if(top > getTop(child))       top = getTop(child);
          if(bottom < getBottom(child)) bottom = getBottom(child);
          if(left > getLeft(child))     left = getLeft(child);
          if(right < getRight(child))   right = getRight(child);
        });
      
        this.innerWidth  = right - left;
        this.innerHeight = bottom - top; 
      
        if(this.alignX === "left")   this.x = 0;
        if(this.alignX === "center") this.x = this.parent.width/2 - this.innerWidth/2;
        if(this.alignX === "right")  this.x = this.parent.width - this.innerWidth;
      
        if(this.alignY === "top")    this.y = 0;
        if(this.alignY === "center") this.y = this.parent.height/2 - this.innerHeight/2;
        if(this.alignY === "bottom") this.y = this.parent.height - this.innerHeight;
        
      
        if (this.target === null) return;
        this.tPos.x = this.target.x - this.offset.x;
        this.tPos.y = this.target.y - this.offset.y;
        
        this.x = (this.tPos.x - this.x) / this.smoothFollow + this.x; 
        this.y = (this.tPos.y - this.y) / this.smoothFollow + this.y;

        this.scale.x += (this.tScale.x - this.scale.x) / this.smoothZoom;
        this.scale.y += (this.tScale.y - this.scale.y) / this.smoothZoom;
        
        this.target.scale.x = this.scale.x;
        this.target.scale.y = this.scale.y;
    }

    contains(rawPoint) {
        let point = rawPoint.clone().subtract(this.position);
        for (let child of this.children)
            if (child.contains(point)) return true;
        return false;
    }
};

UI.Button = class extends UI.Container {
    constructor(container, sprite, x = 0, y = 0) {
        super(container);
        this.sprite = this.addChild(sprite);
        this.x = x;
        this.y = y;
        this.isFocused = new Val(false, (isFocused) => {
            if (isFocused) this.sprite.alpha = 0.7;
            else this.sprite.alpha = 1;
        });
        this.onDown = (key) => {
            if(key === "Left" && this.isMouseOn())
                this.isFocused.set(true);
        };
        this.onUp = (key) => {
            if(key === "Left") 
                this.isFocused.set(false);
        }
        Mouse.downs.add((key)=>{this.onDown(key)});
        Mouse.ups.add((key)=>{this.onUp(key)});
    }
    static asGroup(...btns){
        let GroupCtrl = {
            focused : new Val(null, (btn)=>{
                if(!btn) return;
                let otherBtns = [...btns].remove(btn);
                btn.isFocused.set(true);
                for(let btn of otherBtns)
                   btn.isFocused.set(false); 
            })
        };
        
        for(let btn of btns){
            btn.onUp = (key) =>{ };
            btn.onDown = (key) =>{
                if(key === "Left" && btn.contains(Mouse.pos.toPoint())){
                    GroupCtrl.focused.set(btn);
                }
            };
        }
        return GroupCtrl;
    }
};

UI.TextBar = class extends UI.Container {
    constructor(container, sprite, str, x = 0, y = 0) {
        super(container);
        this.sprite = this.addChild(sprite);
        this.text = this.addChild(UI.makeText(str));
        this.text.font = 'Dosis';
        this.x = x;
        this.y = y;
    }
    update(elapsed) {
        super.update(elapsed);
        this.text.fontSize = this.sprite.height * 0.8;
    }
};

UI.InputBar = class extends UI.Container {
    constructor(container, sprite, str, x = 0, y = 0) {
        super(container);
        this.sprite = this.addChild(sprite);
        this.text = this.addChild(UI.makeText(str));
        this.text.x = 3;
        this.text.y = 3;
        this.text.font = 'Consolas';
        this.x = x;
        this.y = y;

        this.isFocused = new Val(false, (isFocused) => {
            if (isFocused) this.sprite.alpha = 0.5;
            else this.sprite.alpha = 0.8;
        });
        Mouse.downs.add(() => {
            if (this.isMouseOn())
                this.isFocused.set(true);
            else
                this.isFocused.set(false);
        });
        RawKeyboard.presses.add((key, keyCode) => {
            if (this.isFocused.get() && this.text.text.length < 16)
                if (keyCode.isInRange(' ', '~')) this.text.text += key;
        });
        RawKeyboard.downs.add((key, keyCode) => {
            if (key === 'Backspace')
                this.text.text = this.text.text.slice(0, -1);
        });

    }
    update(elapsed) {
        super.update(elapsed);
        this.text.fontSize = this.sprite.height * 0.6;
    }
};

UI.Movable = class extends UI.Container {
    constructor(movables, sprite, x = 0, y = 0) {
        super(movables);
        this.movables = movables;
        this.sprite = this.addChild(_.clone(sprite));
        this.x = x;
        this.y = y;
        console.log(sprite);
        this.isFixed = new Val(false, (isFixed) => {
            if(isFixed){ 
                this.sprite.alpha = 0.5;
                let inx = this.movables.children.indexOf(this);
                this.movables.children[inx] = this.movables.children[0];
                this.movables.children[0] = this;
            }
            else{
                console.log(this);
                this.sprite.alpha = 1;
            }
        });
        
        this.isFocused = new Val(false, (isFocused) => {
            if(this.isFixed.get()) return;
            if (isFocused) this.sprite.alpha = 0.6;
            else this.sprite.alpha = 1;
        });
        
        
        RawKeyboard.downs.add((key, keyCode) => {
            if(!this.isFocused.get()) return;
            if (key === 'ArrowLeft')
                this.position.x -= 1;
            if (key === 'ArrowRight')
                this.position.x += 1;
            if (key === 'ArrowUp')
                this.position.y -= 1;
            if (key === 'ArrowDown')
                this.position.y += 1;
        });
        
        let downPosDiff = new Vec2();
        Mouse.downs.add((key)=>{
            if(this.isFixed.get()) return;
            if(this.isFocused.get() && key === "Left"){
                if(Keyboard.key === "Shift")
                    this.position = Vec2.fromPoint(this.movables.screenToLocal(Mouse.pos)).toTileVec(this.sprite.width,this.sprite.height);
                downPosDiff = Mouse.pos.minus(this.movables.localToScreen(this.position));
            }
        });
        Mouse.moves.add((key)=>{
            if(this.isFixed.get()) return;
            if(this.isFocused.get() && key === "Left"){
                if(Keyboard.key === "Shift")
                    this.position = Vec2.fromPoint(this.movables.screenToLocal(Mouse.pos)).toTileVec(this.sprite.width,this.sprite.height);
                else
                    this.position = this.movables.screenToLocal(Mouse.pos.minus(downPosDiff));
                console.log(downPosDiff);
            }
        });
        
    }
};

UI.Movables = class extends UI.Container {
    constructor(container,target){
        super(container);
        this.target = target;
        this.smoothFollow = 1;
        this.focused;
        Mouse.downs.add((key) => {
            if(key === "Left"){
                let focused;
                for(let child of this.children){
                    child.isFocused.set(false);
                    if (child.contains(this.screenToLocal(Mouse.pos)))
                       focused = child;
                }
                if(focused) focused.isFocused.set(true);
                this.focused = focused;
            }
            if(key==="Right"){
                this.setScalePoint(this.screenToLocal(Mouse.pos));
            }
            if(key==="Middle"){
                this.downPos = Mouse.pos.multiply(1);
                this.initCenter = this.target.position.clone();
            }
        });
        
        Mouse.moves.add((key)=>{
            if(key === "Middle")
                this.target.position.set(this.initCenter.clone().subtract(this.downPos.minus(Mouse.pos)));
        });
        
        Keyboard.downs.add((key) => {
            if(key === "["){
                let pos = this.children.indexOf(this.focused);
                if(pos !== -1 && pos >= 1){
                    let tmp;
                    tmp = this.children[pos-1];
                    this.children[pos-1] = this.children[pos];
                    this.children[pos] = tmp;
                }
            }
            if(key === "]"){
                let pos = this.children.indexOf(this.focused);
                if(pos !== -1 && pos < this.children.length-1){
                    let tmp;
                    tmp = this.children[pos];
                    this.children[pos] = this.children[pos+1];
                    this.children[pos+1] = tmp;
                }
            }
            if(key === "f"){
                if(this.focused.isFixed.get())
                    this.focused.isFixed.set(false);  
                else
                    this.focused.isFixed.set(true);
            }
            if(key === "v"){
                if(this.focused){
                    let copied = new UI.Movable(this, this.focused.sprite);
                    copied.x = this.focused.x;
                    copied.y = this.focused.y;
                    this.children.moveToNext(copied, this.focused);
                    let numPatt = /(.*?)_(\d+)/g;
                    let oriKey = this.focused.key.replace(numPatt, '$1');
                    
                    if(!this.parent.datas[oriKey].num) this.parent.datas[oriKey].num = 1;
                    copied.key = oriKey + "_" + (this.parent.datas[oriKey].num++);
                    
                }
            }
             if(key === "r"){
                if(this.focused){
                    let numPatt = /(.*?)_(\d+)/g;
                    if(numPatt.test(this.focused.key)){
                        delete this.parent.datas[this.focused.key];
                        this.children.remove(this.focused);
                    }
                }
            }
            if(key === "s"){
                for(let child of this.children){
                    let scene = this.parent;
                    if(!scene.datas[child.key]) scene.datas[child.key] = {};
                    scene.datas[child.key].x = child.x;
                    scene.datas[child.key].y = child.y;
                    scene.datas[child.key].layerIdx = this.children.indexOf(child);
                }

                sendCommand(`writeFile /scene/${this.parent.stateId}/data.json "${JSON.stringify(this.parent.datas)}"`,(isSaved)=>{
                    if(isSaved){
                        alert("저장되었습니다.");
                    }else{
                        alert("저장에 실패하였습니다.");
                    }
                });
            }
        });
        
        Mouse.wheels.add((speed)=>{
            let scale = 0.1, min = 0.2, max = 5;
           if(speed<0){
                if(this.tScale.x * (1-scale) > min)
                    this.tScale.multiply(1-scale);
                else
                    this.tScale.set(min, min);
            }
            
            if(speed>0){
                if(this.tScale.x / (1-scale) < max)
                    this.tScale.divide(1-scale);
                else
                    this.tScale.set(max, max);
            }
        });
    }
};