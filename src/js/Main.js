let Game = new Light.Game('game', 1100, 600, '#282828', function (asset) {
    //asset.loadImage('Main', 'startScene/Main.png');
    asset.loadImage('AD', 'startScene/AD.png');
    asset.loadImage('Start', 'startScene/Start.png');
    asset.loadImage('inputNickname', 'startScene/inputNickname.png');
});

Game.states.create('initScene', (scene) => {
    RawKeyboard.init(jQuery);
    Keyboard.init(jQuery);
    ArrowKey.init(Keyboard);
    Mouse.init(jQuery, Game);
    UI.init(Game);

    Mouse.moves.add(() => {});
    Mouse.ups.add(() => {});

    Game.states.change('startScene');
});

Game.states.create('startScene', (scene) => {
    let testBtn = new Button(scene, UI.makeSpr("Start"), 0, 0);
    let inputBar = new InputBar(scene, UI.makeSpr('inputNickname'), "hello!", 0, 0);

    testBtn.onClick = function () {
        console.log("테스트! 입니다.");
    };
    testBtn.onUpdate = function () {
        //this.position.add(ArrowKey.dir.multiply(1).toPoint());
        //this.rotation = Vec2.fromPoint(this.position).minus(Mouse.pos).toRad() * -1 - Math.PI/2;
    };
    inputBar.onUpdate = function () {
        this.position.add(ArrowKey.dir.multiply(1).toPoint());
    };
});

Game.states.change('initScene');