Game.states.create('initScene', (scene) => {
    RawKeyboard.init(jQuery);
    Keyboard.init(jQuery);
    ArrowKey.init(Keyboard);
    Mouse.init(jQuery, Game);
    UI.init(Game);
    Mouse.moves.add(()=>{});
  
    Game.states.change('startScene');
});

let Img = class {
    constructor(container, spr){ this.spr = container.addChild(_.cloneDeep(spr)); }
    isSame(spr)  { return this.spr.texture === spr.texture; }
    change(spr)  { if(!this.isSame(spr)) this.spr.texture = spr.texture; }
    whenOtherChange(spr, ...allowedSprs) {
        let isOther = true;
        for(let allowed of allowedSprs)
            if(this.isSame(allowed)) isOther = false; 
                
        if(isOther) this.change(spr);
    }
    whenMatchesChange(spr, ...allowedSprs) {
        let isMatch = false;
        for(let allowed of allowedSprs)
            if(this.isSame(allowed)) isMatch = true; 
          
        if(isMatch) this.change(spr);
    }
};

let isLeftUp    = (pos)=>{ return ((-pos.x)-pos.y) > 0; };
let isRightDown = (pos)=>{ return ((-pos.x)-pos.y) <= 0; };
let isRightUp   = (pos)=>{ return (pos.y-pos.x) <= 0; };
let isLeftDown  = (pos)=>{ return (pos.y-pos.x) > 0; };

let isUp    = (pos)=>{ return isLeftUp(pos)  && isRightUp(pos); };
let isDown  = (pos)=>{ return isLeftDown(pos)&& isRightDown(pos); };
let isLeft  = (pos)=>{ return isLeftUp(pos)  && isLeftDown(pos); };
let isRight = (pos)=>{ return isRightUp(pos) && isRightDown(pos); };

let cloneSpr = (container, spr)=>{ return container.addChild(_.cloneDeep(spr)); };

let Input = class {
  constructor(mode){
    this.mode = mode; 
    this.p0Data = {
      pressedKeys : [],
      mousePosX : 0,
      mousePosY : 0,
      isMouseDown : 0,
      playerPosX : 0,
      playerPosY : 0,
      hp : 0
    }; 
  }
  isKeyLeft(){
    if(this.mode === "p0") return this.p0Data.pressedKeys.includes("a");
    if(this.mode === "p1") return Keyboard.pressedKeys.includes("a");
    if(this.mode === "p2") return Keyboard.pressedKeys.includes("ArrowLeft");
  }
  isKeyRight(){
    if(this.mode === "p0") return this.p0Data.pressedKeys.includes("d");
    if(this.mode === "p1") return Keyboard.pressedKeys.includes("d");
    if(this.mode === "p2") return Keyboard.pressedKeys.includes("ArrowRight");
  }
  isKeyUp(){
    if(this.mode === "p0") return this.p0Data.pressedKeys.includes("w");
    if(this.mode === "p1") return Keyboard.pressedKeys.includes("w");
    if(this.mode === "p2") return Keyboard.pressedKeys.includes("ArrowUp");
  }
  isKeyDown(){
    if(this.mode === "p0") return this.p0Data.pressedKeys.includes("s");
    if(this.mode === "p1") return Keyboard.pressedKeys.includes("s");
    if(this.mode === "p2") return Keyboard.pressedKeys.includes("ArrowDown");
  }
  isArrowKey(){
    return this.isKeyLeft() || this.isKeyRight() || this.isKeyUp() || this.isKeyDown();
  }
  isMouseDown(){
    if(this.mode === "p0") return this.p0Data.isMouseDown;
    if(this.mode === "p1") return Mouse.key === "Left";
    if(this.mode === "p2") return Mouse.key === "Right";
  }
  getMousePos(container){
    if(this.mode === "p0") return new Light.Point(this.p0Data.mousePosX, this.p0Data.mousePosY);
    if(this.mode === "p1") return container.screenToLocal(Mouse.pos.toLocal());
    if(this.mode === "p2") return container.screenToLocal(Mouse.pos.toLocal());
  }
  getPos(container, cen){
    if(this.mode === "p0") return this.getMousePos(container).subtract(cen);
    if(this.mode === "p1") return this.getMousePos(container).subtract(cen);
    if(this.mode === "p2") return this.getMousePos(container).subtract(cen);
  }
  getHp(player){
    if(this.mode === "p0") return this.p0Data.hp;
    if(this.mode === "p1") return player.hp;
    if(this.mode === "p2") return player.hp;
  }
  setPlayerPos(container){
    container.x = this.p0Data.playerPosX;
    container.y = this.p0Data.playerPosY;
  }
  setP0Data(p0Data, container){
    this.p0Data = p0Data;
    this.setPlayerPos(container);
  }
};

class Player{
    constructor(scene, players, playersContainer, bulletsContainer, namesContainer, hpsContainer, sprs, name, mode){
        this.scene = scene;
        this.sprs = sprs;  
        this.name = name;
        this.mode = mode;
        this.hp = 100;
        this.tmpHp = 100;
      
        this.players = players;
        this.playersContainer = playersContainer;
        this.bulletsContainer = bulletsContainer;
        this.namesContainer = namesContainer;
        this.hpsContainer = hpsContainer;
      
        
        let input = this.input = new Input(mode);
        let container = this.container = new UI.Container(playersContainer);
        let body = this.body = new Img(this.container,sprs.front);
        let arm = this.arm = new Img(this.container, sprs.twohand);
        let bulletCon = this.bulletCon = new UI.Container(bulletsContainer);
        let nameText = this.nameText = namesContainer.addChild(UI.makeText(name, 0, 0, '#fff', 'Dosis', 20));
        let hpBar = this.hpBar = new UI.Container(hpsContainer);
        nameText.textAlign = "center";
        hpBar.backSpr = hpBar.addChild(_.cloneDeep(sprs.hpBack));
        hpBar.frontSpr = hpBar.addChild(_.cloneDeep(sprs.hpFront));
        
        container.width = body.spr.width;
        container.height = body.spr.height;
        //Game.physics.add(container);
        
        this.bodyUpdate   = ()=>{ };
        this.armUpdate    = ()=>{ };
        this.bulletUpdate = ()=>{ };
      
        this.cen = new Light.Point();
        this.mousePos = new Light.Point();
        this.pos =  new Light.Point();
      
        this.initBody(input, scene, container, sprs, arm, body);
        this.initArm(input, container, sprs, arm, body);
        this.initBullet(input, scene, container, bulletCon, sprs, arm, body);
        this.cen.set(arm.spr.x, arm.spr.y + arm.spr.height/2);
      
        this.container.onUpdate = (elapsed) => {
          this.bodyUpdate(elapsed, this.pos, this.mousePos);
          this.armUpdate(elapsed, this.pos, this.mousePos);
          this.bulletUpdate(elapsed, this.pos, this.mousePos);
          
          nameText.position.set(container.position);
          nameText.y -= 25;
          nameText.x += this.body.spr.width/2;
          
          hpBar.position.set(container.position);
          hpBar.y -= 30;
          hpBar.x += this.body.spr.width/2 - hpBar.backSpr.width/2;
          this.hp = this.input.getHp(this);
          this.tmpHp = (this.tmpHp - this.hp) / 10 + this.hp;
          hpBar.frontSpr.width = hpBar.backSpr.width * this.tmpHp / 100;
        };
    }
    initBody(input, scene, container, sprs, arm, body){
        let timer = new Light.Timer(Game, 0.1, -1, ()=>{
             if(!input.isArrowKey()) return;
              
             if(body.isSame(sprs.back))        body.change(sprs.backW1);
             else if(body.isSame(sprs.backW1)) body.change(sprs.backW2);
             else if(body.isSame(sprs.backW2)) body.change(sprs.backW1);
              
             if(body.isSame(sprs.front))        body.change(sprs.frontW1);
             else if(body.isSame(sprs.frontW1)) body.change(sprs.frontW2);
             else if(body.isSame(sprs.frontW2)) body.change(sprs.frontW1);
              
             if(body.isSame(sprs.left))       body.change(sprs.leftW);
             else if(body.isSame(sprs.leftW)) body.change(sprs.left);
              
             if(body.isSame(sprs.right))       body.change(sprs.rightW);
             else if(body.isSame(sprs.rightW)) body.change(sprs.right);
        });
        timer.start();
        
        let speed = 5;
        let deltaX;
        let deltaY;    
      
        this.bodyUpdate = (elapsed,pos,mousePos) => {
            deltaX = 0;
            deltaY = 0;
            this.mousePos = input.getMousePos(container);
            if(input.isKeyLeft())  deltaX -= speed;
            if(input.isKeyRight()) deltaX += speed;
            if(input.isKeyUp())    deltaY -= speed;
            if(input.isKeyDown())  deltaY += speed;
          
            container.x += deltaX;
            let rect;
            for(let wall of scene.wallContainer.children){
                rect = wall.getIntersect(container);
                if(rect) container.x -= deltaX;
             }
          
            container.y += deltaY;
            for(let wall of scene.wallContainer.children){
                rect = wall.getIntersect(container);
                if(rect) container.y -= deltaY;
             }
          
            if(isUp(pos))    body.whenOtherChange(sprs.back, sprs.backW1, sprs.backW2);
            if(isDown(pos))  body.whenOtherChange(sprs.front, sprs.frontW1, sprs.frontW2);
            if(isLeft(pos))  body.whenOtherChange(sprs.left, sprs.leftW);
            if(isRight(pos)) body.whenOtherChange(sprs.right, sprs.rightW);
          
            if(!input.isArrowKey()){
              body.whenMatchesChange(sprs.back, sprs.backW1, sprs.backW2);
              body.whenMatchesChange(sprs.front, sprs.frontW1, sprs.frontW2);
              body.whenMatchesChange(sprs.left, sprs.leftW);
              body.whenMatchesChange(sprs.right, sprs.rightW);
            }
            
            let whenBeShoted = () => {
              Game.camera.shake(0, 20, 3,3);
              let scale = 5;
              if(this.hp-scale>0){
                this.hp -= scale;
              }else{
                console.log("[whenBeShoted] 죽었습니다.");
                this.players.forEach((player)=>{
                  player.destory();
                  this.players.remove(player);
                  console.log(this.players);
                });
                Game.states.change('endingScene');
              }
            };
            
            if(this.mode === "p1"){
              this.players.forEach((player)=>{
                if(player === this) return;
                player.bulletCon.children.forEach((bullet)=>{
                  let pos = bullet.position.clone();
                  pos.y -= bullet.height/2;
                  if(this.container.getBounds().contains(pos)) whenBeShoted();
                });
              });
            }
        };
    }
    initArm(input, container, sprs, arm, body){
      arm.spr.rotationCenter.set(0,arm.spr.height/2);
      arm.spr.rotation = Math.PI/2;
      arm.spr.x = body.spr.width/2;
      arm.spr.y = 15;
      
      this.armUpdate = (elapsed,pos,mousePos) => {
        this.pos = input.getPos(container, this.cen);
        if(isUp(pos)) {
          arm.change(sprs.twohand);
          container.children.moveToNext(arm.spr, body.spr);
        } else if(isDown(pos)) {
          arm.change(sprs.twohand);
          container.children.moveToNext(body.spr, arm.spr);
        } else if(isLeft(pos)) {
          arm.change(sprs.onehand_L);
          container.children.moveToNext(body.spr, arm.spr);
        } else if(isRight(pos)) {
          arm.change(sprs.onehand_R);
          container.children.moveToNext(body.spr, arm.spr);
        }
        arm.spr.rotation = this.cen.getRotation(mousePos);
      };
    }
    initBullet(input, scene, container, bulletCon, sprs, arm, body){     
      let timeCnt = 0;
      let secWait = 0.1;
      let timeToShotBullet = (elapsed, callback)=>{
        if(timeCnt > secWait){
          if(input.isMouseDown()){ 
            callback();
            timeCnt = 0;
          }
        }else{
          timeCnt += elapsed;
        }
      };
      this.bulletUpdate = (elapsed,pos,mousePos) =>{
        timeToShotBullet(elapsed, ()=>{
          let pos = this.pos;
          let mousePos = this.mousePos;
        
          let bullet = new Img(bulletCon, sprs.bullet);
          let setSprY = (y) => {
            bullet.spr.position.set(this.cen);
            bullet.spr.position.add(container.position);
            bullet.spr.y -= y;
            bullet.spr.rotationCenter.y = y;
            bullet.spr.initPos = new Light.Point(bullet.spr.x, bullet.spr.y);
          };
          
          if(isUp(pos)) {
            setSprY(bullet.spr.height/2);
          } else if(isDown(pos)) {
            setSprY(bullet.spr.height/2);
          } else if(isLeft(pos)) {
            setSprY(bullet.spr.height/2 - 5);
          } else if(isRight(pos)) {
            setSprY(bullet.spr.height/2 + 5);
          }
          bullet.spr.rotation = this.cen.getRotation(mousePos);
        });
        
        let speed = 2000;
        for(let bulletSpr of bulletCon.children){
          if(Math.abs(bulletSpr.initPos.x - bulletSpr.x) > 1000) bulletCon.children.remove(bulletSpr);
          if(Math.abs(bulletSpr.initPos.y - bulletSpr.y) > 1000) bulletCon.children.remove(bulletSpr);
          
          bulletSpr.x += Math.cos(bulletSpr.rotation) * speed * elapsed;
          bulletSpr.y += Math.sin(bulletSpr.rotation) * speed * elapsed;
          for(let wall of scene.wallContainer.children){
              if(wall.contains(bulletSpr.position))
                  bulletCon.children.remove(bulletSpr);
          }
        }
      };
    }
    destory(){
      this.playersContainer.children.remove(this.container);
      this.bulletsContainer.children.remove(this.bulletCon);
      this.namesContainer.children.remove(this.nameText);
      this.hpsContainer.children.remove(this.hpBar);
    }
    sendData(){
      let mousePos = this.input.getMousePos(this.container);
      let data = {
        pressedKeys : Keyboard.pressedKeys,
        mousePosX : mousePos.x,
        mousePosY : mousePos.y,
        isMouseDown : (Mouse.key === "Left") ? true : false,
        mouseUpCnt : 0,
        playerPosX : this.container.x,
        playerPosY : this.container.y,
        hp : this.hp
      };
      sendMsg({id: p2p.peerId, data : data});
    }
}

Game.states.create('startScene', (scene)=>{
    window.startScene = scene;
    let container = new UI.Container(scene);
    let inputBar;
    socketInit();
    renderPlayMode(scene, (key, spr, data)=>{
      if(spr === scene.sprs.back){
        spr.x = data.x;
        spr.y = data.y;
        container.addChild(spr);
      }
      if(spr === scene.sprs.start){
         let button = new UI.Button(container, spr, data.x, data.y);
        button.onClick = ()=>{
          let playerName = inputBar.text.text;
          joinRoom("firstRoom",playerName, (name, cnt)=>{
            if(name){
              console.log(`[joinRoom] ${cnt}번째 플레이어 ${name}에 접속했습니다.`);
              Game.states.change('gameScene'); 
            }else{
              console.log(`[joinRoom] 접속에 실패하였습니다.`);
            }
          });
        };
      }
      if(spr === scene.sprs.inputNickname){
         inputBar = new UI.InputBar(container, spr, "", data.x, data.y);
      }
    });
    container.alignX = "center";
    container.alignY = "center";
});

Game.states.create('gameScene', (scene)=>{
    window.gameScene = scene;
    console.log(`[charScene] 시작합니다.`);
    //renderEditMode(scene);    return;
    
    let pointContainer = new UI.Container(scene);
    scene.pointContainer = pointContainer;
  
    let wallContainer = new UI.Container(scene);
    scene.wallContainer = wallContainer;
  
  
    let scale = 2.6;
    let resize = (obj, scale)=>{
      obj.x *= scale;
      obj.y *= scale;
      obj.width *= scale;
      obj.height *= scale;
    };
    let fore;
    renderPlayMode(scene, (key, spr, data)=>{
      if(spr === scene.sprs.point){
        let point = cloneSpr(pointContainer, spr);
        point.x = data.x;
        point.y = data.y;
        resize(point, scale);
        return;
      }
      if(key === "back"){
        let back = cloneSpr(scene, spr);
        back.x = data.x;
        back.y = data.y;
        resize(back, scale);
      }else if(key === "fore"){
        fore = cloneSpr(scene, spr);
        fore.x = fore.x;
        fore.y = fore.y;
        resize(fore, scale);    
      }else{
        let wall = cloneSpr(wallContainer, spr);
        Game.physics.add(wall);
        wall.body.isFixed = true;
        wall.x = data.x;
        wall.y = data.y;
        resize(wall, scale);
      }
    });
  
    scene.loadFolder('p1',(sprs)=>{
        let players = scene.players = [];
        let playersContainer = scene.playersContainer = new UI.Container(scene);
        let bulletsContainer = scene.bulletsContainer = new UI.Container(scene);
        let namesContainer   = scene.namesContainer   = new UI.Container(scene);
        let hpsContainer     = scene.hpsContainer     = new UI.Container(scene);
      
        scene.children.moveToNext(pointContainer, fore);
        scene.children.moveToNext(playersContainer, fore);
        scene.children.moveToNext(bulletsContainer, fore);
      
        Game.camera.smoothFollow = 10;
        
        let p1;
        let renderPlayers = (pastIds, ids, pNames)=>{
          console.log(`[renderPlayers] pastIds : ${pastIds}, ids : ${ids}, pastIds : ${pNames}`);
          let removedIds = _.difference(pastIds,ids);
          let addedIds = _.difference(ids, pastIds);
          
          for(let i=0; i < addedIds.length; i++){
            let id = addedIds[i];
            if(id === p2p.peerId){
              let player = new Player(scene, players, playersContainer, bulletsContainer, namesContainer, hpsContainer, sprs, pNames[ids.indexOf(id)],"p1");
              p1 = player;
              player.container.x = pointContainer.children[i%4].x;
              player.container.y = pointContainer.children[i%4].y - 70;
              Game.camera.follow(player.container);
              player.id = id;
              players.push(player);
            }else{
              let player = new Player(scene, players, playersContainer, bulletsContainer, namesContainer, hpsContainer, sprs, pNames[ids.indexOf(id)],"p0");
              player.id = id;
              players.push(player);
            }
          }
          for(let i=0; i < removedIds.length; i++){
            let id = removedIds[i];
            players.forEach((val,idx)=>{
              //console.log(`[renderPlayers] ${val.id} ${id}`);
              if(val.id === id){
                val.destory();
                players.remove(val);
              } 
            });
          }
        };
        renderPlayers([], IDS, P_NAMES);
        console.log("IDS다");
        console.log(IDS);
        whenPeerEnter = (pastIds, pastPNames, ids, pNames)=>{
          renderPlayers(pastIds, ids, pNames);
        };
        whenMsgGetted = (data)=>{
          let id = data.id;
          let p0Data = data.data;
          players.forEach((player)=>{
            if(player.id === id){
              player.input.setP0Data(p0Data, player.container);
            }
          });
        };
        playersContainer.onUpdate = (elapsed) => {
          p1.sendData();
        };
    });
});

Game.states.create('endingScene', (scene)=>{
  let container = new UI.Container(scene);
  container.alignX = "center";
  container.alignY = "center";
  container.addChild(scene.sprs.deadscene);
  leaveRoom(()=>{
    let whenMouseDown = ()=>{
      Mouse.downs.remove(whenMouseDown);
      Mouse.downs.reset();
      Game.states.change('startScene');
    };
    Mouse.downs.add(whenMouseDown);
  });
});

// Game.states.create('gameScene', (scene)=>{
//     window.gameScene = scene;
//     console.log(`[gameScene] 시작합니다.`); 
//     renderEditMode(scene);
//     //renderPlayMode(scene);
// });

/*Game.states.create('editScene', (scene) => {
    console.log(`[editScene] 시작합니다.`);
    Game.camera.smoothFollow = 2;
    Game.camera.smoothZoom = 5;
    let center = scene.addSpr("AD");
    window.center = center;
    center.alpha = 0.3;
    let container = new Movables(scene, center);
    container.follow(center, new Light.Point(0, 0));
    window.container = container;
    
    let bottom = scene.addSpr("AD");
    bottom.position.set(0,400);
    let bottomCon = new UI.Container(scene, bottom);
    let btn = new Button(bottomCon, UI.makeSpr('Start'), 0, 400);
    btn.onClick = function(){
        let start = new Movable(container, UI.makeSpr('Start'));
    };
});*/

/*Game.states.create('startScene', (scene) => {
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
});*/

Game.states.change('initScene');