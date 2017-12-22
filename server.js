let express = require('express');
let app = express();
let server = require('http').createServer(app);
let io = require('socket.io')(server);
let fs = require('fs');

class RoomManager {
  constructor() {
    this.rooms = [];
  }
  addRoom(room) {
    this.rooms.push(room);
  }
  removeRoom(room) {
    this.rooms.splice(this.rooms.indexOf(room), 1);
  }
  autoJoin(peer) {
    const minPeerRoom = this.rooms.filter(room => !room.isFull())
      .sort((before, after) => before.peers.length < after.peers.length)[0];

    if(minPeerRoom) return minPeerRoom.addPeer(peer);
    const room = new Room(this, `room_${this.rooms.length}`)
    room.addPeer(peer);
  }
  socketIdToPeer(id){
    for(let room of this.rooms) 
    for(let peer of room.peers) 
    if(peer.socket.id === id) 
      return peer;
  }
}

class Room {
  constructor(roomManager, name, maxPeer = 5) {
    this.roomManager = roomManager;
    roomManager.addRoom(this);
    this.peers = [];
    this.name = name;
    this.maxPeer = maxPeer;
  }
  isFull() {
    return this.peers.length === this.maxPeer;
  }
  destory() {
    roomManager.removeRoom(this);
  }
  addPeer(peer) {
    let peers = this.peers;
    peers.push(peer);
    peer.socket.join(this.name);
    let room = peer.room = this;
    
    this.sendAll('peer-entered', peers.map(p=>( {id:p.id, name:p.name, hp:p.hp} )));
    peer.socket.on('peer-msg', msg => { room.broadcast(peer, 'peer-msg', msg) });

    peer.socket.on('other-shooted', id =>{
      let p = roomManager.socketIdToPeer(id);
      if(!p) return; 
      const delta = 5;
      p.hp = (delta < p.hp) ? (p.hp - delta) : 0;
      this.sendAll('hp-changed', {id: p.id, hp: p.hp});
      if(p.hp === 0) this.removePeer(p);
    });
  }
  removePeer(peer) {
    let peers = this.peers;
    peer.socket.leave(this.name);
    this.peers.splice(this.peers.indexOf(peer), 1);
    this.sendAll('peer-entered', peers.map(p=>( {id:p.id, name:p.name, hp:p.hp})));
  }
  sendAll(tag, ...args) {
    io.sockets.in(this.name).emit(tag, ...args);
  }
  broadcast(peer, tag, ...args) {
    peer.socket.broadcast.to(this.name).emit(tag, ...args);
  }
}

class Peer {
  constructor(socket, name) {
    this.room;
    this.socket = socket;
    this.id = socket.id;
    this.name = name;
    this.hp = 100;
  }
}
const roomManager = new RoomManager();

let Api = {
  dir: './src',
  readDir: function (path, callback) {
    callback = callback || ((files) => {
      console.log(files);
    });
    fs.readdir(`${this.dir}${path}`, 'utf8', (err, files) => {
      callback(files);
    });
  },
  readFile: function (path, callback) {
    callback = callback || ((text) => {
      console.log(text);
    });
    fs.readFile(`${this.dir}${path}`, 'utf8', (err, text) => {
      callback(text);
    });
  },
  read: function (path, callback) {
    if (path.match(/^.+?\/?\w+?\.\w+$/g))
      this.readFile(path, callback);
    else
      this.readDir(path, callback);
  },
  writeFile: function (path, data, callback) {
    let patt = /\"(.*)\"/g;
    let raw = patt.exec(data);
    data = raw[1];
    callback = callback || ((isSaved) => {
      if (isSaved) console.log("파일이 저장되었습니다.");
      else console.log("파일 저장에 실패하였습니다.");
    });
    fs.writeFile(`${this.dir}${path}`, data, (err) => {
      if (err) callback(false);
      else callback(true);
    });
  },
  joinRoom: function (socket, roomName, playerName, callback) {
    callback = callback || (roomName => { console.log(`[Api.joinRoom] ${namroomNamee}방에 접속합니다.`) });
    let peer = new Peer(socket, playerName);
    roomManager.autoJoin(peer);
    callback(roomName, peer.room.peers.length);
  },
  leaveRoom: function (socket, callback) {
    callback = callback || (roomName => { console.log(`[Api.leaveRoom] ${roomName}방에서 나갑니다.`) });
    const peer = roomManager.socketToPeer(socket);
    peer.room.removePeer(peer);
    callback(peer.room.name);
  }
}

io.on('connection', (socket) => {
  socket.on('msg', (msg, callback) => {
    let command;
    if (!msg.includes(' ')) command = [msg, '', '', ''];
    else command = msg.match(/(?:".+")|(?:[\w\.\/]+)/g);

    if (command[0] === 'readDir') Api.readDir(command[1], callback);
    else if (command[0] === 'readFile') Api.readFile(command[1], callback);
    else if (command[0] === 'read') Api.read(command[1], callback);
    else if (command[0] === 'writeFile') Api.writeFile(command[1], command[2], callback);
    else callback("그런 명령어는 없습니다.");
  });

  socket.on('join-room', (roomName, playerName, callback) => {
    Api.joinRoom(socket, roomName, playerName, callback);
  });

  socket.on('leave-room', (callback) => {
    Api.leaveRoom(socket, callback);
  });

  socket.on('disconnect', () => {
      const peer = roomManager.socketIdToPeer(socket.id);
      if(peer) peer.room.removePeer(peer);
  });
});

app.use(express.static('src'));
server.listen(process.env.PORT || 3000);