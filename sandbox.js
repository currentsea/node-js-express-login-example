// const app = require('express')();
// const http = require('http').Server(app);
// const io = require('socket.io')(http, { cors: {
//         // todo: change this before prod
//         origin: "*",
//         methods: ["*"],
//     }});
// const lib = require('./server/lib')
// const database = require("./server/database")
//
// app.get('/', function(req, res){
//     res.sendFile("/Users/twinflame/sandybox/index.html");
// });
//
//
// http.listen(3005, function(){
//     console.log('listening on localhost:3005');
// });
const express = require('express');
const app = express();
const http = require("http");
const server = http.createServer(app);
const game = require('./server/game')
const db = require('./server/database')
const async = require("async");
const GameHistory = require("./server/game_history");
const io = require("socket.io")(server, {
    cors: {
        // todo: change this before prod
        origin: "*",
        methods: ["*"],
    }
});

io.on("shutdown", () => {
    console.log("Game over SHUTDOWN")
})

let theGame;

const runTheGame = async() => {
    console.log("Starting first game in sequence...")
    async.parallel([db.getGameHistory, db.getLastGameInfo, db.getBankroll], async (err, results) => {
        console.log("Inside async parallel")
        let gh = new GameHistory(results[0])
        let info = results[1]
        let bankroll = results[2] ? results[2] : 1e100
        console.log('Have a bankroll of: ', bankroll / 1e8, ' xmr');
        let lastGameId = parseInt(info.id)
        let lastGameHash = info.hash
        theGame = new game(lastGameId, lastGameHash, bankroll, gh);

        await theGame.runGame()
    })
}

runTheGame().then((lastGame) => {
    console.log("Game over")
    console.log(lastGame)
})
// http.listen(3005, function(){
//     console.log('listening on localhost:3005');
// });
