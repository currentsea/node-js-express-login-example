const express = require('express');
const app = express();
const http = require("http");
const server = http.createServer(app);
const game = require('./server/game')
const db = require('./server/database')
const async = require("async");
const GameHistory = require("./server/game_history");
const config = require('./server/config')
const lib = require('./server/lib')

const io = require("socket.io")(server, {
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {
    relayLastGameInfo()
})

let theGame;

const relayLastGameInfo = () => {
    db.getGameHistory().then((res) => {
        io.emit("gamehistory_info", {game_history: res})
    })
}

const runTheGame = async() => {
    console.log("Starting first game in sequence...")
    async.parallel([db.getGameHistory, db.getLastGameInfo, db.getBankroll], async (err, results) => {
        let gh = new GameHistory(results[0])
        let info = results[1]
        let bankroll = results[2] ? results[2] : 1e100
        console.log('Have a bankroll of: ', bankroll / 1e8, ' xmr');
        let lastGameId = parseInt(info.id)
        let lastGameHash = info.hash
        theGame = new game(lastGameId, lastGameHash, bankroll, gh, io);

        await theGame.runGame()
    })
}

runTheGame().then((lastGame) => {
    console.log("Game over")
    console.log(lastGame)
})

server.listen(config.PORT, () => {
    console.log('Listening on port ', config.PORT);
});

app.use("/login", async (req, res) => {
    try {
        if (!username || !password) {
            res.sendStatus(400)
            return res.render(res.json({"message": "no username or password provided"}))
        }

        let username = lib.removeNullsAndTrim(req.body.username);
        let password = lib.removeNullsAndTrim(req.body.password);
        let fp = lib.removeNullsAndTrim(req.body.fp);
        let otp = lib.removeNullsAndTrim(req.body.otp);
        let remember = !!req.body.remember;
        let ipAddress = req.ip;
        let userAgent = req.get('user-agent');

    } catch (e) {
        console.log("Got error: " + e)
    } finally {
        console.log()
    }


})