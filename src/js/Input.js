let RawKeyboard = {
    key: '',
    keyCode: 0
};

RawKeyboard.init = function (jQuery) {
    jQuery(document).keypress((event) => {
        this.key = event.key;
        this.keyCode = event.which;
        this.presses.execute(this.key, this.keyCode);
    });

    jQuery(document).keydown((event) => {
        this.key = event.key;
        this.keyCode = event.which;
        this.downs.execute(this.key, this.keyCode);
    });

    jQuery(document).keyup((event) => {
        this.key = event.key;
        this.keyCode = event.which;
        this.ups.execute(this.key, this.keyCode);
        this.key = '';
    });
};
RawKeyboard.presses = new Callback((key, keyCode) => {
    console.log(`[RawKeyboard.presses] ${key} 키(${keyCode})를 눌렸습니다.`);
});
RawKeyboard.downs = new Callback((key, keyCode) => {
    console.log(`[RawKeyboard.downs] ${key} 키(${keyCode})를 눌렸습니다.`);
});
RawKeyboard.ups = new Callback((key, keyCode) => {
    console.log(`[Keyboard.ups] ${key} 키(${keyCode})에서 손을 땠습니다.`);
});

let Keyboard = {
    pressedKeys: [],
    key: '',
    keyCode: 0
};

Keyboard.init = function (jQuery) {
    jQuery(document).keydown((event) => {
        if (!this.pressedKeys.includes(event.key)) {
            this.key = event.key;
            this.keyCode = event.which;
            this.pressedKeys.push(event.key);
            this.downs.execute(this.key, this.keyCode);
        }
    });
    jQuery(window).blur(()=>{
      this.pressedKeys = [];
      this.key = '';
      this.keyCode = 0;
    });

    jQuery(document).keyup((event) => {
        this.pressedKeys.remove(event.key);
        this.key = event.key;
        this.keyCode = event.which;
        this.ups.execute(this.key, this.keyCode);
        this.key = '';
    });
};
Keyboard.downs = new Callback((key, keyCode) => {
    console.log(`[Keyboard.downs] ${key} 키(${keyCode})를 눌렸습니다.`);
});
Keyboard.ups = new Callback((key, KeyCode) => {
    console.log(`[Keyboard.ups] ${key} 키(${keyCode})에서 손을 땠습니다.`);
});


let KeyGroup = function () {
    this.keyMap = {};
};

KeyGroup.prototype.init = function (Keyboard) {
    Keyboard.downs.add(() => {
        if (Object.values(this.keyMap).includes(Keyboard.key)) {
            this.down();
        }
    });
    Keyboard.ups.add(() => {
        if (Object.values(this.keyMap).includes(Keyboard.key)) {
            this.up();
        }
    });
};
KeyGroup.prototype.down = function () {
    console.log(`[KeyGroup.prototype.down] ${Keyboard.key} 키를 눌렸습니다.`);
};
KeyGroup.prototype.up = function () {
    console.log(`[KeyGroup.prototype.up] ${Keyboard.key} 키에서 손을 땠습니다.`);
};

let ArrowKey = {
    keyMap: {
        up: 'ArrowUp',
        right: 'ArrowRight',
        down: 'ArrowDown',
        left: 'ArrowLeft'
    },
    dir: new Vec2()
};

ArrowKey.onDirChange = function () {
    console.log(`[ArrowKey.onDirChange] dir : ${this.dir.toString()}`);
};
ArrowKey = Object.assign(new KeyGroup(), ArrowKey);
ArrowKey.down = function () {
    if (Keyboard.key === this.keyMap.up) this.dir.y = -1;
    if (Keyboard.key === this.keyMap.right) this.dir.x = 1;
    if (Keyboard.key === this.keyMap.down) this.dir.y = 1;
    if (Keyboard.key === this.keyMap.left) this.dir.x = -1;
    this.onDirChange();
};
ArrowKey.up = function () {
    if (Keyboard.key === this.keyMap.up) this.dir.y = 0;
    if (Keyboard.key === this.keyMap.right) this.dir.x = 0;
    if (Keyboard.key === this.keyMap.down) this.dir.y = 0;
    if (Keyboard.key === this.keyMap.left) this.dir.x = 0;
    if (Keyboard.pressedKeys.length === 1) {
        if (Keyboard.pressedKeys[0] === this.keyMap.up) this.dir.y = -1;
        if (Keyboard.pressedKeys[0] === this.keyMap.right) this.dir.x = 1;
        if (Keyboard.pressedKeys[0] === this.keyMap.down) this.dir.y = 1;
        if (Keyboard.pressedKeys[0] === this.keyMap.left) this.dir.x = -1;
    }
    this.onDirChange();
};

let Mouse = {
    pos: new Vec2(),
    key: ""
};

Mouse.init = function (jQuery, game) {
    jQuery(document).mousemove((event) => {
        let canvas = game.canvas;
        let rect = canvas.getBoundingClientRect();
        this.pos.x = event.clientX - rect.left;
        this.pos.y = event.clientY - rect.top;
        this.moves.execute(this.key);
    });
    jQuery(document).contextmenu((event) => {
        event.preventDefault();
    });
    jQuery(document).mousedown((event) => {
        if (event.which === 1) this.key = "Left";
        if (event.which === 2) this.key = "Middle";
        if (event.which === 3) this.key = "Right";
        Mouse.downs.execute(this.key);
    });
    jQuery(document).mouseup((event) => {
        if (event.which === 1) this.key = "Left";
        if (event.which === 2) this.key = "Middle";
        if (event.which === 3) this.key = "Right";
        Mouse.ups.execute(this.key);
        this.key = "";
    });
    jQuery(document).mousewheel((event)=>{
        Mouse.wheels.execute(event.deltaY);
    });
    
};
Mouse.moves = new Callback((key) => {
    console.log(`[Mouse.moves] 마우스가 움직였습니다. pos.x : ${Mouse.pos.x}, pos.y : ${Mouse.pos.y}`);
});
Mouse.downs = new Callback((key) => {
    console.log(`[Mouse.downs] 마우스 버튼(${key})이 눌렸습니다. pos.x : ${Mouse.pos.x}, pos.y : ${Mouse.pos.y}`);
});
Mouse.ups = new Callback((key) => {
    console.log(`[Mouse.ups] 마우스 버튼(${key})에서 손을 땠습니다. pos.x : ${Mouse.pos.x}, pos.y : ${Mouse.pos.y}`);
});
Mouse.wheels = new Callback((speed) => {
    console.log(`[Mouse.wheels] ${speed}의 속도로 마우스 휠을 올리셨습니다.`);
});