let Conn = {
    init : function(){
        this.socket = io();
        this.IDS = [];
        this.P_NAMES = [];
        
        this.whenPeerEnter = (pastIds, ids, pNames, hps) => { console.log(`[Conn.whenPeerEnter] ${ids} ${pNames} ${hps}`); }
        this.whenMsgGetted = (data) => { console.log(`[Conn.whenMsgGetted] ${data}`);}  
        this.whenHpChanged = (data) => { console.log(`[Conn.whenHpChanged] ${data}`);}  

        this.socket.on('peer-msg', (data) =>{
          this.whenMsgGetted(msgpack.decode(new Uint8Array(data))); 
        });
                
        this.socket.on('peer-entered', (ids, pNames, hps)=>{
          let pastIds = this.IDS,  pastPNames = this.P_NAMES;
          this.whenPeerEnter(pastIds, pastPNames, ids, pNames, hps); 
          this.IDS = ids, this.P_NAMES = pNames, this.hps = hps;
        });

        this.socket.on('hp-changed', (data)=>{ this.whenHpChanged(data) });

        this.socket.on('connect', () => { 
          console.log(`[this.socket] 준비되었습니다.`);
        });
    },
    sendMsg : function(data){ 
        this.socket.emit('peer-msg', data); 
    },
    sendCommand : function(command, callback){
        callback = callback || ((data) => {console.log(data)});
        this.socket.emit('msg', command, callback);
    },
    sendOtherShooted: function(id){
        this.socket.emit('other-shooted', id);
    },
    joinRoom : function(name, pName, callback){
        this.socket.emit('join-room',name, pName, callback);
    },
    leaveRoom : function(callback){
        this.socket.emit('leave-room', callback);
    }
}
Conn.init();

let Game = new Light.Game('game', window.innerWidth, window.innerHeight, '#282828', (asset) => {
    //asset.loadImage('Main', 'scene/startScene/Main.png');
    //asset.loadImage('AD', 'startScene/AD.png');
    asset.loadImage('center', 'image/center.png');
    //asset.loadImage('inputNickname', 'startScene/inputNickname.png');
});
$(window).resize(function(){
   Game.resize(window.innerWidth, window.innerHeight); 
});

let renderEditMode = function(scene){
    let cen = scene.addSpr("center");
    cen.alpha = 0.1;
    let container = new UI.Movables(scene, cen);
    orDatas = Object.entries(scene.datas);
    orDatas.sort((first, second)=>{
       if (first[1].layerIdx == second[1].layerIdx)
          return 0;
       if (first[1].layerIdx < second[1].layerIdx)
          return -1;
       else
          return 1; 
    });
    
    for(let orData of orDatas){
        let key = orData[0];
        let obj = new UI.Movable(container, scene.sprs[key.replace(/(.*?)_(\d+)/g, '$1')]);
        obj.key = key;
        obj.x = scene.datas[key].x;
        obj.y = scene.datas[key].y;
        if(scene.datas[key].isFixed) obj.isFixed.set(true);
    }
};

let renderPlayMode = function(scene, callback){
    orDatas = Object.entries(scene.datas);
    orDatas.sort((first, second)=>{
       if (first[1].layerIdx == second[1].layerIdx)
          return 0;
       if (first[1].layerIdx < second[1].layerIdx)
          return -1;
       else
          return 1; 
    });
    
    for(let orData of orDatas){
        let key = orData[0];
        let spr = scene.sprs[key.replace(/(.*?)_(\d+)/g, '$1')];
        let data = orData[1];
        callback(key, spr, data);
    }
};

if (!Object.entries)
  Object.entries = function( obj ){
    var ownProps = Object.keys( obj ),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    
    return resArray;
  };
 

Array.prototype.remove = function (ele) {
    if (this.includes(ele))
        this.splice(this.indexOf(ele), 1);
    return this;
};
Array.prototype.moveToNext = function(fromEle, toEle){
  this.remove(fromEle);
  this.splice(this.indexOf(toEle),0, fromEle);
};
Number.prototype.isInRange = function (start, end) {
    if (typeof (start) === "string") start = start.charCodeAt(0);
    if (typeof (end) === "string") end = end.charCodeAt(0);

    if (start <= this && this <= end)
        return true;
    else
        return false;
};

Light.State.prototype.addSpr = function (imgName, x = 0, y = 0, size = 1) {
    let spr;
    if(imgName instanceof Light.Sprite) spr = imgName;
    else spr = new Light.Sprite(Game.asset.getImage(imgName));
    this.addChild(spr);
    spr.x = x;
    spr.y = y;
    spr.width = spr.width * size;
    spr.height = spr.height * size;

    return spr;
};
Light.State.prototype.addText = function (str, x = 0, y = 0, fillStyle = '#fff', font = '50px Dosis') {
    let label;
    label = new Light.Text();
    label.font = font;
    label.fillStyle = fillStyle;
    label.position.set(x, y);
    label.text = str;
    this.addChild(label);
    return label;
};

let Vec2 = function (x = 0, y = 0) {
    this.x = x;
    this.y = y;
};

Vec2.prototype.plus = function (vec) {
    return new Vec2(this.x + vec.x, this.y + vec.y);
};
Vec2.prototype.minus = function (vec) {
    return new Vec2(this.x - vec.x, this.y - vec.y);
};
Vec2.prototype.multiply = function (sca) {
    return new Vec2(this.x * sca, this.y * sca);
};
Vec2.prototype.divide = function (sca) {
    return new Vec2(this.x / sca, this.y / sca);
};

Vec2.prototype.toString = function () {
    return `dir.x : ${this.x}, dir.y : ${this.y}`;
};
Vec2.prototype.toPoint = function () {
    return new Light.Point(this.x, this.y);
};
Vec2.prototype.toLocal = function () {
    return Game.camera.screenToLocal(new Light.Point(this.x, this.y));
};
Vec2.prototype.toTileVec = function (width, height) {
    let x = Math.round(this.x);
    let y = Math.round(this.y);
    
    let resultX,resultY;
    if(x<0) resultX = (x-width)+(-x)%width;
    if(y<0) resultY = (y-height)+(-y)%height;
    if(x>=0) resultX = x-x%width;
    if(y>=0) resultY = y-y%height
    
    return new Vec2(resultX, resultY);
};
Vec2.prototype.toRad = function () {
    return Math.atan2(this.x, this.y);
};
Vec2.fromPoint = function (point) {
    return new Vec2(point.x, point.y);
};
Vec2.fromLocal = function (point) {
    return this.fromPoint(Game.camera.localToScreen(point));
};


let Callback = function (testCallback) {
    this.testCallback = testCallback;
    this.callbacks = [];
};

Callback.prototype.add = function (callback) {
    this.callbacks.push(callback);
};
Callback.prototype.setTest = function (callback) {
    this.testCallback = callback;
};
Callback.prototype.remove = function (callback) {
    this.callbacks.remove(callback);
};
Callback.prototype.reset = function (callback) {
    this.callbacks = [];
};
Callback.prototype.execute = function (...prams) {
    if (!this.callbacks.length) {
        this.testCallback(...prams);
        return;
    }
    for (callback of this.callbacks)
        callback(...prams);
};

let Val = function (val, onChange) {
    this.onChange = onChange;
    this.set(val);
}
Val.prototype.set = function (val) {
    this.val = val;
    this.onChange(val);
};
Val.prototype.get = function () {
    return this.val;
}
