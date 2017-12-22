var Light = Light || {
    VERSION: '0.1.3',
    games: [],

    degToRad: function (deg) {
        return deg * Math.PI / 180;
    },
    radToDeg: function (rad) {
        return rad * 180 / Math.PI;
    },
    randomIn: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
};

Light.Asset = function (game) {
    this.game = game;
    this.loading = 0;
    this.loaded = 0;
    this.skip = false;
    this.toLoad = [];
    this.image = [];
    this.audio = [];
};
Light.Asset.prototype.startLoad = function (e) {
    this.loading = this.toLoad.length;
    for (var i = 0; i < this.loading; i++) {
        var a = this.toLoad[i];
        switch (a.type) {
            case 'image':
                var img = new Image();
                img.src = a.url;
                img.index = i;
                img.addEventListener('load', this.onLoad.bind(this));
                break;
            case 'audio':
                var aud = new Audio(a.url);
                aud.index = i;
                aud.addEventListener('load', this.onLoad.bind(this));
                aud.dispatchEvent(new Event('load'));
                break;
        }
    }
    if (this.toLoad.length === 0) {
        this.dispatchPreloaded();
    }
};
Light.Asset.prototype.onLoad = function (e) {
    var index = e.target.index;
    e.target.removeEventListener('load', this.onLoad);
    this[this.toLoad[index].type][this.toLoad[index].id] = e.target;

    this.loaded++;
    if (this.loaded === this.loading) {
        this.dispatchPreloaded();
    }
};
Light.Asset.prototype.onReady = function(){
  console.log(`[Light.Asset.prototype.onReady] 에셋이 로딩 되었습니다.`);  
};
Light.Asset.prototype.dispatchPreloaded = function () {
    var evt;
    try {
        evt = new CusomEvent('preloaded');
    } catch (err) {
        //for IE
        evt = document.createEvent('CustomEvent');
        evt.initEvent('preloaded', false, false);
    } finally {
        document.dispatchEvent(evt);
        this.toLoad = [];
        this.onReady();
    }
};
Light.Asset.prototype.loadImage = function (id, url) {
    this.toLoad.push({
        type: 'image',
        id: id,
        url: url
    });
};
Light.Asset.prototype.loadAudio = function (id, url) {
    this.toLoad.push({
        type: 'audio',
        id: id,
        url: url
    });
};
Light.Asset.prototype.getImage = function (id) {
    return this.image[id];
};
Light.Asset.prototype.getAudio = function (id) {
    return this.audio[id];
};

Light.Game = function (parentId, width, height, backgroundColor, onPreload) {
    this.inited = false;
    this.parentId = parentId;
    this.width = width || 800;
    this.height = height || 600;
    this.backgroundColor = backgroundColor || '#fff';

    this.asset = new Light.Asset(this);
    this.states = new Light.StateManager(this);

    Light.games.push(this);

    onPreload(this.asset);

    document.addEventListener('DOMContentLoaded', this.asset.startLoad.bind(this.asset), true);
    document.addEventListener('preloaded', this.init.bind(this));
};
Light.Game.constructor = Light.Game;
Light.Game.prototype.init = function () {
    document.removeEventListener('DOMContentLoaded', this.asset.start, true);
    document.removeEventListener('preloaded', this.init);

    if (typeof this.parentId === 'string') {
        this.parent = document.getElementById(this.parentId);
    } else {
        this.parent = document.body;
    }
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.parent.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');

    // var vendors = ['ms', 'moz', 'webkit', 'o'];
    // for (var i = 0; i < vendors.length && !window.requestAnimationFrame; i++) {
    //     window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
    //     window.cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'];
    // }
    this.rafId = window.requestAnimationFrame(this.run.bind(this));

    this.camera = new Light.Camera(this);
    this.physics = new Light.Physics(this);
    this.timers = [];
    this.time = Date.now();
    this.fpsStartTime = Date.now();
    this.fps = 60;

    this.inited = true;
    this.states.current.onInit(this.states.current);
};
Light.Game.prototype.run = function () {
    this.elapsed = (Date.now() - this.time) / 1000;
    if (Date.now() - this.fpsStartTime > 500) {
        this.fpsStartTime = Date.now();
        this.fps = Math.round(1 / this.elapsed);
        if (this.fps > 60) this.fps = 60;
    }
    this.update(this.elapsed);
    this.render();
    this.time = Date.now();

    this.rafId = window.requestAnimationFrame(this.run.bind(this));
};
Light.Game.prototype.resume = function () {
    this.rafId = window.requestAnimationFrame(this.run.bind(this));
    var i = this.timers.length;
    while (i--) this.timers[i].resume();
};
Light.Game.prototype.pause = function () {
    window.cancelAnimationFrame(rafId);
    var i = this.timers.length;
    while (i--) this.timers[i].pause();
};
Light.Game.prototype.update = function (elapsed) {
    this.camera.update(elapsed);
    this.physics.update(elapsed);
    this.timers.forEach(function (timer) {
        timer.update(elapsed);
    });
    if (this.states.current !== null)
        this.states.current.update(elapsed);
};
Light.Game.prototype.render = function () {
    var currentState = this.states.current;
    var _this = this;
    var child;

    this.context.save();
    this.context.fillStyle = this.backgroundColor;
    this.context.fillRect(0, 0, this.width, this.height);

    var targetX, targetY;
    targetX = this.camera.width / 2;
    targetY = this.camera.height / 2;
    this.context.translate(targetX, targetY);
    this.context.scale(this.camera.scale.x, this.camera.scale.y);
    this.context.translate(-targetX, -targetY);

    this.context.translate(-this.camera.x, -this.camera.y);

    currentState.children.forEach(function (child) {
        child.render(_this.context);
    });

    this.context.restore();
    this.camera.children.forEach(function (child) {
        child.render(_this.context);
    });
};
Light.Game.prototype.resize = function(width, height){
    this.width = width;
    this.height = height;
  
    if(!this.canvas) return;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    
    if(!this.camera) return;
    this.camera.width = this.width;
    this.camera.height = this.height;
    this.context.fillRect(0, 0, this.width, this.height);
}

Light.StateManager = function (game) {
    this.game = game;
    this.states = {};
    this.currentState = null;
};
Light.StateManager.constructor = Light.StateManager;
Light.StateManager.prototype.add = function (stateId, state) {
    if (state instanceof Light.State) {
        this.states[stateId] = state;
        return true;
    }
    return false;
};
Light.StateManager.prototype.create = function(stateId, callback){
    return this.states[stateId] = new Light.State(this.game, (scene)=>{
        scene.stateId = stateId;
        scene.sprs = {};
        scene.datas = {};
        let defalut = {x : 0, y : 0, layerIdx : 0};
        Conn.sendCommand(`read /scene/${stateId}`,(files)=>{
            let sprPaths = {};
            let sprCnt = 0;
          
            if(files){
                for(let file of files){
                    let patt = /\.png/g;
                    if(patt.test(file)){
                        let path = `scene/${stateId}/${file}`;
                        let name = file.replace(".png","");
                        let typePatt = /\[(.*?)\](.*)/g;
                        let type = null;
                        if(typePatt.test(name)) type = name.replace(/\[(.*?)\](.*)/g, "$1");  
                        name = name.replace(/\[(.*?)\](.*)/g, "$2");
                        //scene.sprs[name] = new Light.Sprite(path);
                        sprPaths[name] = path;
                        scene.datas[name] = _.clone(defalut);
                        if(type) scene.datas[name].type = type;
                    }
                }
            }
            Conn.sendCommand(`read /scene/${stateId}/data.json`, async (json)=>{
                if(json) scene.datas = $.parseJSON(json);
                if(_.isEmpty(sprPaths)) return callback(scene);

                let names = Object.keys(sprPaths);
                await Promise.all(names.map(async (name) => {
                    let path = sprPaths[name];
                    let spr = await Light.Sprite.buildSprByPath(path);
                    scene.sprs[name] = spr;
                }));
                console.log(scene.sprs);
                callback(scene);
            });
        });
    });
};


Light.StateManager.prototype.remove = function (stateId) {
    if (stateId in this.states) {
        delete states[stateId];
        return true;
    }
    return false;
};
Light.StateManager.prototype.change = function (stateId) {
    this.currentState = this.states[stateId];
    if (this.game.inited) {
        this.game.camera.reset();
        this.game.physics.reset();
        this.currentState.removeChildren();
        this.currentState.onInit(this.currentState);
    }
};
Object.defineProperty(Light.StateManager.prototype, 'current', {
    get: function () {
        return this.currentState;
    }
});

Light.Timer = function (game, delay, repeatCount, callback) {
    this.game = game;
    this.change(delay, repeatCount);
    this.currentCount = 0;
    this.callback = callback;
    this.time = 0;
    this.running = false;
};
Light.Timer.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.game.timers.push(this);
};
Light.Timer.prototype.stop = function () {
    if (!this.running) return;
    this.running = false;
    this.game.timers.splice(this.game.timers.indexOf(this), 1);
};
Light.Timer.prototype.reset = function () {
    this.running = false;
    this.currentCount = 0;
    this.time = 0;
};
Light.Timer.prototype.pause = function () {
    if (!this.running) return;
    this.running = false;
};
Light.Timer.prototype.resume = function () {
    if (this.running) return;
    this.running = true;
};
Light.Timer.prototype.change = function (delay, repeatCount) {
    this.delay = delay;
    this.repeatCount = (repeatCount !== 0) ? repeatCount : 1;
};
Light.Timer.prototype.update = function (elapsed) {
    if (this.running) {
        this.time += elapsed;
        if (this.time >= this.delay) {
            this.time = 0;
            this.callback();
            if (++this.currentCount == this.repeatCount) this.stop();
        }
    }
};

Light.Point = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
};
Light.Point.constructor = Light.Point;
Light.Point.prototype.set = function (x, y) {
    if(x instanceof Light.Point){
        let point = x;
        this.x = point.x;
        this.y = point.y;
        return this;
    }
    
    this.x = x;
    this.y = y;
    return this;
};
Light.Point.prototype.add = function (point) {
    this.x += point.x;
    this.y += point.y;
    return this;
};
Light.Point.prototype.subtract = function (point) {
    this.x -= point.x;
    this.y -= point.y;
    return this;
};
Light.Point.prototype.multiply = function (point) {
    if(point instanceof Light.Point){
        this.x *= point.x;
        this.y *= point.y;   
    }else{
        this.x = this.x * point;
        this.y = this.y * point;
    }
    return this;
};
Light.Point.prototype.divide = function (point) {
    if(point instanceof Light.Point){
        this.x /= point.x;
        this.y /= point.y;
    }else{
        this.x = this.x / point;
        this.y = this.y / point;
    }
    return this;
};
Light.Point.prototype.offset = function (x, y) {
    this.x += x;
    this.y += y;
    return this;
};
Light.Point.prototype.getRotation = function (point) {
    return Math.atan2(point.y - this.y, point.x - this.x);
};
Light.Point.prototype.getDistance = function (point) {
    return Math.sqrt(point.x * point.x + point.y * point.y);
};
Light.Point.prototype.clone = function () {
    return new Light.Point(this.x, this.y);
};

Light.Rectangle = function (x, y, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
};
Light.Rectangle.constructor = Light.Rectangle;
Light.Rectangle.prototype.getCenter = function () {
    return new Light.Point(this.x + this.width / 2, this.y + this.height / 2);
};
Light.Rectangle.prototype.intersects = function (rect) {
    return !(this.x + this.width < rect.x || this.y + this.height < rect.y || rect.x + rect.width < this.x || rect.y + rect.height < this.y);
};
Light.Rectangle.prototype.contains = function (point) {
    return !(this.x > point.x || this.x + this.width < point.x || this.y > point.y || this.y + this.height < point.y);
};
Light.Rectangle.prototype.getIntersect = function (rect) {
    if (this.intersects(rect)) {
        var x = Math.max(this.x, rect.x);
        var y = Math.max(this.y, rect.y);
        var width = Math.min(this.x + this.width, rect.x + rect.width) - x;
        var height = Math.min(this.y + this.height, rect.y + rect.height) - y;
        return new Light.Rectangle(x, y, width, height);
    }
    return null;
};
Light.Rectangle.prototype.clone = function () {
    return new Light.Rectangle(this.x, this.y, this.width, this.height);
};

Light.Entity = function () {
    this.position = new Light.Point();
    this.rotation = 0;
    this.rotationCenter = new Light.Point();
    this.scale = new Light.Point(1, 1);
    this.scaleCenter = new Light.Point();
    this.alpha = 1;
    this.visible = true;
    this.parent = null;
    this._width = 1;
    this._height = 1;
};
Light.Entity.constructor = Light.Entity;
Light.Entity.prototype.render = function (context) {
    context.save();
    context.translate(this.x, this.y);

    context.translate(this.rotationCenter.x, this.rotationCenter.y);
    context.rotate(this.rotation);
    context.translate(-this.rotationCenter.x, -this.rotationCenter.y);

    context.translate(this.scaleCenter.x, this.scaleCenter.y);
    context.scale(this.scale.x, this.scale.y);
    context.translate(-this.scaleCenter.x, -this.scaleCenter.y);

    context.globalAlpha = this.alpha;

    this.onRender(context);
    context.restore();
};
Light.Entity.prototype.update = function (elapsed) {};
Light.Entity.prototype.getBounds = function () {
    return new Light.Rectangle(this.x, this.y, this.width, this.height);
};
Light.Entity.prototype.intersects = function (obj) {
    return this.getBounds().intersects(obj.getBounds());
};
Light.Entity.prototype.getIntersect = function (obj) {
    return this.getBounds().getIntersect(obj.getBounds());
};
Light.Entity.prototype.contains = function (point) {
    return this.getBounds().contains(point);
};
Object.defineProperties(Light.Entity.prototype, {
    'x': {
        get: function () {
            return this.position.x;
        },
        set: function (value) {
            this.position.x = value;
        }
    },
    'y': {
        get: function () {
            return this.position.y;
        },
        set: function (value) {
            this.position.y = value;
        }
    },
    'width': {
        get: function () {
            return this._width;
        },
        set: function (value) {
            this._width = value;
        }
    },
    'height': {
        get: function () {
            return this._height;
        },
        set: function (value) {
            this._height = value;
        }
    }
});

Light.EntityContainer = function () {
    Light.Entity.call(this);
    this.children = [];
};
Light.EntityContainer.prototype = Object.create(Light.Entity.prototype);
Light.EntityContainer.constructor = Light.EntityContainer;
Light.EntityContainer.prototype.onRender = function (context) {
    this.children.forEach(function (child) {
        child.render(context);
    });
};
Light.EntityContainer.prototype.update = function (elapsed) {
    this.children.forEach(function (child) {
        child.update(elapsed);
    });
};
Light.EntityContainer.prototype.addChild = function (child) {
    child.parent = this;
    this.children.push(child);
    return child;
};
Light.EntityContainer.prototype.addInxChild = function (inx, child) {
    child.parent = this;
    this.children.splice(inx, 0, child);
    return child;
};
Light.EntityContainer.prototype.removeChild = function (child) {
    this.children.splice(this.children.indexOf(child), 1);
};
Light.EntityContainer.prototype.removeChildren = function (from, to) {
    from = from || 0;
    to = to || this.children.length - 1;
    this.children.splice(from, to - from);
};
Light.EntityContainer.prototype.replaceChild = function(fromEle, toEle){
  toEle.parent = this;
  this.children.splice(this.children.indexOf(fromEle),0, toEle);
  this.removeChild(fromEle);
};

Light.Sprite = function (image) {
    Light.EntityContainer.call(this);
    if (typeof image === 'string') {
        this.texture = new Image();
        this.texture.src = image;
        let onLoad = (e) =>{ 
          e.target.removeEventListener('load', onLoad);
        };
        this.texture.addEventListener('load', onLoad);
        
    } else if (image instanceof Image || image.hasOwnProperty('src')) {
        this.texture = image;
    }
};

Light.Sprite.buildSprByPath = function(path){
    let texture = new Image();
    texture.src = path;
    let spr = new Light.Sprite(texture);
    return new Promise((success)=>{
        let onLoad = (e) =>{ 
            success(spr);
            e.target.removeEventListener('load', onLoad);
        };
        texture.addEventListener('load', onLoad);
    });
}

Light.Sprite.prototype = Object.create(Light.EntityContainer.prototype);
Light.Sprite.prototype.constructor = Light.Sprite;
Light.Sprite.prototype.changeLoaded = function (game, img) {
    this.texture = game.asset.getImage(img);
};
Light.Sprite.prototype.tint = function(color){
    this.color = color;
}
Light.Sprite.prototype.removeTint = function(color){
    this.tintCache = null;
}
Light.Sprite.prototype.onRender = function (context) {
    context.mozImageSmoothingEnabled = true;
    context.webkitImageSmoothingEnabled = true;
    //context.imageSmoothingQuality = "high";
    context.msImageSmoothingEnabled = true;
    context.imageSmoothingEnabled = true;

    if((this.color && !this.tintCache) || (this.tintCache && this.tintCache.texture.src !== this.texture.src)){
        let color = this.color || this.tintCache.color;
        buffer = document.createElement('canvas');
        buffer.width = this.texture.width;
        buffer.height = this.texture.height;
        bx = buffer.getContext('2d');
    
        bx.fillStyle = color;
        bx.fillRect(0,0,buffer.width,buffer.height);
    
        bx.globalCompositeOperation = "destination-atop";
        bx.drawImage(this.texture, 0,0);
    
        context.drawImage(this.texture, 0,0);
    
        context.globalAlpha = this.alpha;
        this.tintCache = {buffer: buffer, texture: this.texture, color: color};
        this.color = null;
    }

    if(this.tintCache) context.drawImage(this.tintCache.buffer, 0, 0);
    else context.drawImage(this.texture, 0, 0);

    Light.EntityContainer.prototype.onRender.apply(this, arguments);
};
Object.defineProperties(Light.Sprite.prototype, {
    'width': {
        get: function () {
            return this.texture.width * Math.abs(this.scale.x);
        },
        set: function (value) {
            this.scale.x = Math.abs(value) / this.texture.width;
        }
    },
    'height': {
        get: function () {
            return this.texture.height * Math.abs(this.scale.y);
        },
        set: function (value) {
            this.scale.y = Math.abs(value) / this.texture.height;
        }
    }
});

Light.MovieClip = function (image, frameRect, frames) {
    Light.EntityContainer.call(this);

    this.texture = image;
    this.frameRect = frameRect;
    this.totalFrames = frames;
    this.framesPerRow = Math.floor(image.width / frameRect.width);
    this.frameSpeed = 60;
    this.isLoop = true;
    this.isPlaying = false;

    this.width = this.frameRect.width;
    this.height = this.frameRect.height;
    this.frameCount = 0;
};
Light.MovieClip.prototype.constructor = Light.MovieClip;
Light.MovieClip.prototype = Object.create(Light.EntityContainer.prototype);
Light.MovieClip.prototype.play = function (isLoop, frameSpeed) {
    this.isLoop = (typeof isLoop === 'boolean') ? isLoop : true;
    this.frameSpeed = (typeof frameSpeed === 'number') ? frameSpeed : 60;
    this.isPlaying = true;
};
Light.MovieClip.prototype.stop = function (resetFrame) {
    if (resetFrame === true) this.frameCount = 0;
    this.isPlaying = false;
};
Light.MovieClip.prototype.update = function (elapsed) {
    Light.EntityContainer.prototype.update.apply(this, arguments);

    if (!this.isPlaying) return;

    this.frameCount += this.frameSpeed * elapsed;
    if (this.frameCount >= this.totalFrames) {
        if (this.isLoop) {
            this.frameCount = 0;
        } else {
            this.frameCount = this.totalFrames - 1;
        }
    }
};
Light.MovieClip.prototype.onRender = function (context) {
    context.drawImage(this.texture, this.width * Math.floor(this.currentFrame % this.framesPerRow), this.height * Math.floor(this.currentFrame / this.framesPerRow), this.width, this.height, 0, 0, this.width, this.height);
};
Object.defineProperty(Light.MovieClip.prototype, 'currentFrame', {
    get: function () {
        return Math.floor(this.frameCount);
    }
});

Light.Text = function () {
    Light.Entity.call(this);
    this.text = '';
    this.fontSize = 20;
    this.font = 'Arial';
    this.baseline = 'top';
    this.textAlign = "start";
    this.fillStyle = '#000000';
    this.textWidth = 0;
};
Light.Text.prototype = Object.create(Light.Entity.prototype);
Light.Text.constructor = Light.Text;
Light.Text.prototype.onRender = function (context) {
    context.font = this.fontSize + "px " +this.font;
    context.fillStyle = this.fillStyle;
    context.textBaseline = this.baseline;
    context.textAlign = this.textAlign;
    context.fillText(this.text, 0, 0);
    this.textWidth = context.measureText(this.text).width;
};

Light.State = function (game, onInit) {
    Light.EntityContainer.call(this);
    this.game = game;
    this.onInit = onInit;
    this.onUpdate = function(){ /*10.25추가*/ };
};
Light.State.prototype = Object.create(Light.EntityContainer.prototype);
Light.State.constructor = Light.State;
Light.State.prototype.update = function (elapsed) {
    Light.EntityContainer.prototype.update.apply(this, arguments);
    this.width = this.game.width;
    this.height = this.game.height;
    this.onUpdate(elapsed);
};
Light.State.prototype.loadFolder = function(folder){
    return new Promise((success)=>{
        if(this[folder]) success(this[folder]);

        Conn.sendCommand(`read /scene/${this.stateId}/${folder}`, async (files)=>{
            let sprs = {};
            await Promise.all(files.map(async (file) => {
                let patt = /\.png/g;
                if(!patt.test(file)) return;
                let path = `scene/${this.stateId}/${folder}/${file}`;
                let name = file.replace(".png","");
                let spr = await Light.Sprite.buildSprByPath(path);
                sprs[name] = spr;
            }));
            this[folder] = sprs;
            success(this[folder]);
        });
    });
};

Light.Camera = function (game) {
    Light.EntityContainer.call(this);
    this.game = game;
    this.target = null;
    this.moveBounds = null;
    this.offset = new Light.Point();
    this.targetScale = new Light.Point(1, 1);
    this.width = this.game.width;
    this.height = this.game.height;
    this.smoothFollow = 1;
    this.smoothZoom = 1;
    this.shakeMax = new Light.Point();
    this.shakeTimer = new Light.Timer(this.game, 0, 1, function () {
        this.x += Light.randomIn(-this.shakeMax.x, this.shakeMax.x);
        this.y += Light.randomIn(-this.shakeMax.y, this.shakeMax.y);
    }.bind(this));
};
Light.Camera.prototype = Object.create(Light.EntityContainer.prototype);
Light.Camera.constructor = Light.Camera;
Light.Camera.prototype.reset = function () {
    this.position.set(0, 0);
    this.unfollow();
    this.smoothFollow = 1;
    this.smoothZoom = 1;
    this.shakeMax.set(0, 0);
    this.targetScale.set(1, 1);
};
Light.Camera.prototype.follow = function (entity, offset) {
    this.target = entity;
    if (offset instanceof Light.Point)
        this.offset = offset;
    else
        this.offset = new Light.Point();
};
Light.Camera.prototype.unfollow = function () {
    this.target = null;
    this.offset.x = 0;
    this.offset.y = 0;
};
Light.Camera.prototype.shake = function (delay, repeatCount, maxX, maxY) {
    this.shakeMax.x = maxX;
    this.shakeMax.y = maxY;
    this.shakeTimer.change(delay, repeatCount);
    this.shakeTimer.reset();
    this.shakeTimer.start();
};
Light.Camera.prototype.zoom = function (scaleX, scaleY) {
    this.targetScale.x = scaleX;
    this.targetScale.y = scaleY;
};
Light.Camera.prototype.localToScreen = function (point) {
    var p = new Light.Point();
    p.x = (point.x - this.width/2 - this.x) * this.scale.x + this.width/2;
    p.y = (point.y - this.height/2 - this.y) * this.scale.y + this.height/2;
    return p;
};
Light.Camera.prototype.screenToLocal = function (point) {
    var p = new Light.Point();
    p.x = (point.x - this.width/2) / this.scale.x + this.x + this.width/2;
    p.y = (point.y - this.height/2) / this.scale.y + this.y + this.height/2;
    return p;
};
Light.Camera.prototype.update = function (elapsed) {
    if (this.target === null) return;

    this.x += (this.target.x + this.target.width / 2 - this.width / 2 - this.offset.x - this.x) / this.smoothFollow;
    this.y += (this.target.y + this.target.height / 2 - this.height / 2 - this.offset.y - this.y) / this.smoothFollow;

    this.scale.x += (this.targetScale.x - this.scale.x) / this.smoothZoom;
    this.scale.y += (this.targetScale.y - this.scale.y) / this.smoothZoom;

    if (this.moveBounds) {
        var value;
        value = this.moveBounds.x;
        if (this.x <= value) {
            this.x = value;
        }
        value = this.moveBounds.width - this.width;
        if (this.x >= value) {
            this.x = value;
        }
        value = this.moveBounds.y;
        if (this.y <= value) {
            this.y = value;
        }
        value = this.moveBounds.height - this.height;
        if (this.y >= value) {
            this.y = value;
        }
    }
};

Light.Physics = function (game) {
    this.game = game;
    this.entities = [];
    this.gravity = new Light.Point();
};
Light.Physics.prototype.contructor = Light.Physics;
Light.Physics.prototype.reset = function () {
    this.entities = [];
    this.gravity.set(0, 0);
};
Light.Physics.prototype.add = function (entity) {
    entity.body = new Light.Body(entity);
    this.entities.push(entity);
};
Light.Physics.prototype.remove = function (entity) {
    var index;
    if ((index = this.entities.indexOf(entity)) != -1) {
        delete entity.body;
        this.entities.splice(index, 1);
    }
};
Light.Physics.prototype.collide = function (entity1, entity2) {
    var rect;
    if ((rect = entity1.getIntersect(entity2)) !== null) {
        if (rect.width < rect.height) {
            if (entity1.getBounds().getCenter().x < entity2.getBounds().getCenter().x) {
                entity1.body.touching.right = true;
                entity2.body.touching.left = true;
                if (!entity1.body.isFixed && !entity2.body.isFixed) {
                    entity1.x -= rect.width / 2;
                    entity2.x += rect.width / 2;
                } else if (!entity1.body.isFixed) {
                    entity1.x -= rect.width;
                } else if (!entity2.body.isFixed) {
                    entity2.x += rect.width;
                }
            } else {
                entity1.body.touching.left = true;
                entity2.body.touching.right = true;
                if (!entity1.body.isFixed && !entity2.body.isFixed) {
                    entity1.x += rect.width / 2;
                    entity2.x -= rect.width / 2;
                } else if (!entity1.body.isFixed) {
                    entity1.x += rect.width;
                } else if (!entity2.body.isFixed) {
                    entity2.x -= rect.width;
                }
            }
            entity1.body.velocity.x = 0;
            entity2.body.velocity.x = 0;
        } else {
            if (entity1.getBounds().getCenter().y < entity2.getBounds().getCenter().y) {
                entity1.body.touching.bottom = true;
                entity2.body.touching.top = true;
                if (!entity1.body.isFixed && !entity2.body.isFixed) {
                    entity1.y -= rect.height / 2;
                    entity2.y += rect.height / 2;
                } else if (!entity1.body.isFixed) {
                    entity1.y -= rect.height;
                } else if (!entity2.body.isFixed) {
                    entity2.y += rect.height;
                }
            } else {
                entity1.body.touching.top = true;
                entity2.body.touching.bottom = true;
                if (!entity1.body.isFixed && !entity2.body.isFixed) {
                    entity1.y += rect.height / 2;
                    entity2.y -= rect.height / 2;
                } else if (!entity1.body.isFixed) {
                    entity1.y += rect.height;
                } else if (!entity2.body.isFixed) {
                    entity2.y -= rect.height;
                }
            }
            entity1.body.velocity.y = 0;
            entity2.body.velocity.y = 0;
        }
    }
};
Light.Physics.prototype.update = function (elapsed) {
    for (var i = 0; i < this.entities.length; i++) {
        var entity = this.entities[i];
        entity.body.update(elapsed);
        if (!entity.body.isFixed) {

            if (entity.body.isGravityAllowed) {
                entity.body.velocity.x += (this.gravity.x + entity.body.gravity.x) * elapsed;
                entity.body.velocity.y += (this.gravity.y + entity.body.gravity.y) * elapsed;
            }

            if (entity.body.velocity.x > entity.body.maxVelocity.x)
                entity.body.velocity.x = entity.body.maxVelocity.x;
            else if (entity.body.velocity.x < -entity.body.maxVelocity.x)
                entity.body.velocity.x = -entity.body.maxVelocity.x;
            if (entity.body.velocity.y > entity.body.maxVelocity.y)
                entity.body.velocity.y = entity.body.maxVelocity.y;
            else if (entity.body.velocity.y < -entity.body.maxVelocity.y)
                entity.body.velocity.y = entity.body.maxVelocity.y;

            entity.position.add(entity.body.velocity);
            entity.body.velocity.multiply(entity.body.friction);
        }

        //if (!entity.body.isCollisionAllowed) continue;
        //충돌 확인
        for (var j = 0; j < this.entities.length; j++) {
            if (entity === this.entities[j] || !this.entities[j].body.isCollisionAllowed) continue;
            this.game.physics.collide(entity, this.entities[j]);
        }
    }
};

Light.Body = function (parent) {
    Light.Entity.call(this);
    this.parent = parent;
    this.velocity = new Light.Point();
    this.maxVelocity = new Light.Point();
    this.gravity = new Light.Point();
    this.friction = new Light.Point(1, 1);
    this.touching = {
        top: false,
        left: false,
        right: false,
        bottom: false
    };
    this.isFixed = false;
    this.isGravityAllowed = true;
    this.isCollisionAllowed = true;
    this.prevParentPosition = new Light.Point();
};
Light.Body.prototype.update = function (elapsed) {
    this.prevParentPosition = this.parent.position;
    this.touching.top = false;
    this.touching.left = false;
    this.touching.right = false;
    this.touching.bottom = false;
};
