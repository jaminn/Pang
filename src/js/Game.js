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
    changeWhenOther(spr, allowedSprs) {
        let isOther = true;
        for(let allowed of allowedSprs)
            if(this.isSame(allowed)) isOther = false; 
                
        if(isOther) this.change(spr);
    }
    changeWhenMatch(spr, allowedSprs) {
        let isMatch = false;
        for(let allowed of allowedSprs)
            if(this.isSame(allowed)) isMatch = true; 
          
        if(isMatch) this.change(spr);
    }
};
class Area{
  static isLeftUp(pos)    { return ((-pos.x)-pos.y) > 0; }
  static isRightDown(pos) { return ((-pos.x)-pos.y) <= 0; }
  static isRightUp(pos)   { return (pos.y-pos.x) <= 0; }
  static isLeftDown(pos)  { return (pos.y-pos.x) > 0; }

  static isUp(pos)    { return Area.isLeftUp(pos)  && Area.isRightUp(pos); }
  static isDown(pos)  { return Area.isLeftDown(pos)&& Area.isRightDown(pos); }
  static isLeft(pos)  { return Area.isLeftUp(pos)  && Area.isLeftDown(pos); }
  static isRight(pos) { return Area.isRightUp(pos) && Area.isRightDown(pos); }
}

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
      playerPosY : 0
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
        
        let speed = 6;
        let deltaX;
        let deltaY;    
        
        Game.physics.add(container);
        container.body.maxVelocity.x = speed;
        container.body.maxVelocity.y = speed;
        container.body.friction.x = 0;
        container.body.friction.y = 0;
        
        container.body.isCollisionAllowed = false;

        this.bodyUpdate = (elapsed,pos,mousePos) => {
            deltaX = 0;
            deltaY = 0;
            this.mousePos = input.getMousePos(container);
            if(input.isKeyLeft())  container.body.velocity.x = -speed;
            if(input.isKeyRight()) container.body.velocity.x =  speed;
            if(input.isKeyUp())    container.body.velocity.y = -speed;
            if(input.isKeyDown())  container.body.velocity.y =  speed;
          
            if(Area.isUp(pos))    body.changeWhenOther(sprs.back, [sprs.backW1, sprs.backW2]);
            if(Area.isDown(pos))  body.changeWhenOther(sprs.front, [sprs.frontW1, sprs.frontW2]);
            if(Area.isLeft(pos))  body.changeWhenOther(sprs.left, [sprs.leftW]);
            if(Area.isRight(pos)) body.changeWhenOther(sprs.right, [sprs.rightW]);
          
            if(!input.isArrowKey()){
              body.changeWhenMatch(sprs.back, [sprs.backW1, sprs.backW2]);
              body.changeWhenMatch(sprs.front, [sprs.frontW1, sprs.frontW2]);
              body.changeWhenMatch(sprs.left, [sprs.leftW]);
              body.changeWhenMatch(sprs.right, [sprs.rightW]);
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
        if(Area.isUp(pos)) {
          arm.change(sprs.twohand);
          container.children.moveToNext(arm.spr, body.spr);
        } else if(Area.isDown(pos)) {
          arm.change(sprs.twohand);
          container.children.moveToNext(body.spr, arm.spr);
        } else if(Area.isLeft(pos)) {
          arm.change(sprs.onehand_L);
          container.children.moveToNext(body.spr, arm.spr);
        } else if(Area.isRight(pos)) {
          arm.change(sprs.onehand_R);
          container.children.moveToNext(body.spr, arm.spr);
        }
        arm.spr.rotation = this.cen.getRotation(mousePos);
      };
    }
    initBullet(input, scene, container, bulletCon, sprs, arm, body){     
      let timeCnt = 0;
      let secWait = 0.2;
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
        
          let bulletObj = new Img(bulletCon, sprs.bullet);
          let bullet = bulletObj.spr;
          let setSprY = (y) => {
            bullet.position.set(this.cen);
            bullet.position.add(container.position);
            bullet.y -= y;
            bullet.rotationCenter.y = y;
            bullet.initPos = new Light.Point(bullet.x, bullet.y);

            bullet.x += Math.cos(bullet.rotation) * 10;
            bullet.y += Math.sin(bullet.rotation) * 10;
          };
          

          bullet.rotation = this.cen.getRotation(mousePos);
          if(Area.isUp(pos)) {
            setSprY(bullet.height/2);
          } else if(Area.isDown(pos)) {
            setSprY(bullet.height/2);
          } else if(Area.isLeft(pos)) {
            setSprY(bullet.height/2 - 5);
          } else if(Area.isRight(pos)) {
            setSprY(bullet.height/2 + 5);
          }
        });
        
        let speed = 1000;
        for(let bullet of bulletCon.children){
          if(Math.abs(bullet.initPos.x - bullet.x) > 1000) bulletCon.children.remove(bullet);
          if(Math.abs(bullet.initPos.y - bullet.y) > 1000) bulletCon.children.remove(bullet);
          let divideNum = Math.ceil((speed * elapsed) / bullet.width);

          for(let i=0; i<divideNum; i++){
            bullet.x += Math.cos(bullet.rotation) * speed * elapsed / divideNum;
            bullet.y += Math.sin(bullet.rotation) * speed * elapsed / divideNum;
              
            for(let player of this.players) if(player.id !== this.id){
              if(player.container.contains(bullet.position)){
                this.bulletCon.children.remove(bullet);
                if(this.mode === "p1") Conn.sendOtherShooted(player.id);
              }
            }
          }
          

          for(let wall of scene.wallContainer.children){
              if(wall.contains(bullet.position))
                  bulletCon.children.remove(bullet);
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
        playerPosY : this.container.y
      };
      Conn.sendMsg(msgpack.encode({id: Conn.socket.id, data : data}).buffer);
    }
}

Game.states.create('startScene', (scene)=>{
    window.startScene = scene;
    let container = new UI.Container(scene);
    let inputBar;
    renderPlayMode(scene, (key, spr, data)=>{
      if(spr === scene.sprs.back){
        spr.x = data.x;
        spr.y = data.y;
        container.addChild(spr);
      }
      if(spr === scene.sprs.start){
        let button = new UI.Button(container, spr, data.x, data.y);
        let isAvailable = true;
        button.onClick = ()=>{
          if(!isAvailable) return;
          isAvailable = false;
          let playerName = inputBar.text.text;
          Conn.joinRoom("firstRoom", playerName, (name, cnt)=>{
            if(!name) console.log(`[Conn.joinRoom] 접속에 실패하였습니다.`);
            console.log(`[Conn.joinRoom] ${cnt}번째 플레이어 ${name}에 접속했습니다.`);
            Game.states.change('gameScene'); 
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
    Conn.whenHpChanged = (data)=>{
      let player = players.find(p=> p.id === data.id);
      if(!player) return;
      player.hp = data.hp;
      
      if(player.mode === "p1"){
        Game.camera.shake(0, 20, 3,3);
        if(player.hp !== 0) return;
        
        console.log("[whenBeShoted] 죽었습니다.");
        for(player of players){
          player.destory();
          players.remove(player);
        }
        Game.states.change('endingScene');
      }
    };

    let renderPlayers = async (pastPeers, peers)=>{
      let sprs = await scene.loadFolder('p1');
      let addedPeers = _.differenceBy(peers, pastPeers, 'id');
      let removedPeers = _.differenceBy(pastPeers, peers, 'id');
      console.log(addedPeers);
      console.log(removedPeers);
      
      for(let peer of addedPeers){
        if(peer.id === Conn.socket.id){
          let player = new Player(scene, players, playersContainer, bulletsContainer, namesContainer, hpsContainer, sprs, peer.name,"p1");
          p1 = player;
          player.container.x = pointContainer.children[peers.indexOf(peer) % 4].x;
          player.container.y = pointContainer.children[peers.indexOf(peer) % 4].y - 70;
          Game.camera.follow(player.container);
          player.id = peer.id;
          player.hp = peer.hp;
          players.push(player);
        }else{
          let player = new Player(scene, players, playersContainer, bulletsContainer, namesContainer, hpsContainer, sprs, peer.name,"p0");
          player.id = peer.id;
          player.hp = peer.hp;
          players.push(player);
        }
      }
      for(let peer of removedPeers){
        let player = players.find(p=> p.id === peer.id);
        if(!player) continue;
        player.destory();
        players.remove(player);
      }
    };
    renderPlayers([], Conn.pastPeers);
    Conn.whenPeerEnter = (pastPeers, peers)=>{
      renderPlayers(pastPeers, peers);
    };
    Conn.whenMsgGetted = (data)=>{
      let id = data.id;
      let p0Data = data.data;
      player = players.find(p => p.id === id);
      if(player) player.input.setP0Data(p0Data, player.container);
    };
    playersContainer.onUpdate = (elapsed) => {
      if(p1) p1.sendData();
    };
    
});

Game.states.create('endingScene', (scene)=>{
  let container = new UI.Container(scene);
  container.alignX = "center";
  container.alignY = "center";
  container.addChild(scene.sprs.deadscene);
  
  let whenMouseDown = ()=>{
    Mouse.downs.remove(whenMouseDown);
    Mouse.downs.reset();
    Game.states.change('startScene');
  };
  Mouse.downs.add(whenMouseDown);

});

Game.states.change('initScene');