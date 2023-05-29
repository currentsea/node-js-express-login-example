const EventEmitter = require('events');
const events = require("events");
const SortedArray = require('./sorted_array');
const _ = require('lodash');
const db = require('./database')
const assert = require("assert");
const lib = require("./lib");
const async = require("async");
const tickRate = 150; // ping the client every X miliseconds
const afterCrashTime = 3000; // how long from game_crash -> game_starting
const restartTime = 5000; // How long from  game_starting -> game_started

class Game extends EventEmitter {
    constructor(lastGameId, lastHash, bankroll, gameHistory, io) {
        super();
        this.io = io
        this.bankroll = bankroll
        this.maxWin = Math.round(this.bankroll * 0.03); // Risk 3% per game
        this.gameShuttingDown = false;
        this.startTime;
        this.crashPoint;
        this.gameDuration;
        this.forcePoint = null;
        this.state = 'ENDED';
        this.pending = {};
        this.pendingCount = 0;
        this.joined = new SortedArray()
        this.players = {}
        this.gameId = lastGameId;
        this.gameHistory = gameHistory;
        this.lastHash = lastHash;
        this.hash = null;

        // // use nextTick to emit the event once a handler is assigned
        // process.nextTick(() => {
        //     this.io.emit('event');
        // });
        events.EventEmitter.call(this);
    }

    runGame = async(io) => {
        const newGame = await db.createGame(this.gameId + 1);

        // todo: check newGame for error here
        this.state = 'STARTING'
        this.crashPoint = newGame.crashPoint

        this.hash = newGame.hash
        this.gameId++
        this.startTime = new Date(Date.now() + restartTime);
        this.players = {}
        this.gameDuration = Math.ceil(inverseGrowth(this.crashPoint + 1)); // how long till the game will crash..
        this.maxWin = Math.round(this.bankroll * 0.03); // Risk 3% per game

        this.io.emit("game_starting", {
            game_id: this.gameId,
            max_win: this.maxWin,
            time_till_start: restartTime
        })

        // console.log("Starting the game.")
        // console.log(newGame)
        setTimeout(await this.blockGame, restartTime)
    }

    blockGame = async() => {
        this.state = "BLOCKING"
        const loop = async() => {
            if (this.pendingCount > 0) {
                console.log("Delaying game by 100ms for " + this.pendingCount + " joins")
                return setTimeout(await this.blockGame.loop, 100)
            }
            await this.startGame()
        }
        await loop()
    }

    startGame = async() => {
        this.state = "IN_PROGRESS"
        this.startTime = new Date()
        this.pending = {}
        this.pendingCount = 0
        let bets = {}
        let arr = this.joined.getArray()

        for (let i = 0; i < arr.length; i++) {
            let a = arr[i]
            bets[a.user.username] = a.bet
            this.players[a.user.username] = a
        }
        this.joined.clear()
        this.io.emit("game_started", bets)
        await this.setForcePoint();
        await this.callTick(0)
    }

    callTick = async(elapsed) => {
        let left = this.gameDuration - elapsed
        let nextTick = Math.max(0, Math.min(left, tickRate));
        // console.log("Called a tick..." + left)
        return setTimeout(await this.runTick, nextTick)
    }

    runTick = async() => {
        let elapsed = new Date() - this.startTime
        let at = growthFunc(elapsed)
        this.io.emit("game_tick", {elapsed: elapsed, at:at})
        // console.log("Ran a tick")

        await this.runCashOuts(at)

        if (this.forcePoint === null) {
            this.forcePoint = Infinity;
        }

        if(this.forcePoint <= at && this.forcePoint <= this.crashPoint) {
            await this.cashOutAll(this.forcePoint)
            console.log("Force cashed out everyone at : " + this.forcePoint)
            await this.endGame(true)
            this.io.emit("game_over", at)
        }

        if (at > this.crashPoint) {
            await this.endGame(false)
            this.io.emit("game_over", at)
        } else {
            await this.tick(elapsed)
        }

    }

    tick = async(elapsed) => {
        this.emit("game_tick", elapsed)
        await this.callTick(elapsed)
    }

    endGame = async(forced) => {
        let gameId = this.gameId
        let crashTime = Date.now()

        assert(this.crashPoint === 0 || this.crashPoint >= 100)
        let prevBankroll = this.bankroll
        if (this.crashPoint !== 0) {
            let givenOut = 0
            for (const player of Object.keys(this.players)) {
                let record = this.players[player];

                givenOut += record.bet * 0.01;
                if (record.status === 'CASHED_OUT') {
                    let given = record.stoppedAt * (record.bet / 100);
                    assert(lib.isInt(given) && given > 0);
                    givenOut += given;
                }
            }
            this.bankroll -= givenOut;

            if (this.bankRoll !== prevBankroll) {
                console.log("Changed bankroll to " + this.bankroll + " (givenOut: " + givenOut + ")")
            }
        }

        let playerInfo = this.getInfo().player_info

        this.lastHash = this.hash

        this.io.emit("game_crash", {
            forced: forced,
            elapsed: this.gameDuration,
            game_crash: this.crashPoint,
            hash: this.lastHash
        })

        this.gameHistory.addCompletedGame({
            game_id: gameId,
            game_crash: this.crashPoint,
            created: this.startTime,
            player_info: playerInfo,
            hash: this.lastHash
        })

        /*
        let dbTimer;
        const dbTimeout = async () => {
            dbTimer = setTimeout(function() {
                console.log('Game', gameId, 'is still ending... Time since crash:',
                    ((Date.now() - crashTime)/1000).toFixed(3) + 's');
                dbTimeout();
            }, 1000);
        }
        *
         */

        // await dbTimeout()

        await db.endGame(gameId, [])

        if (this.gameShuttingDown) {
            this.io.emit("shutdown")
        } else {
            console.log("Starting a NEW game...")
            setTimeout(await this.runGame, (crashTime + afterCrashTime) - Date.now())
        }

        this.state = "ENDED";
    }
}

Game.prototype.getInfo = async() => {
    let playerInfo = {}

    for (let username in this.players) {
        let record = this.players[username]
        assert (lib.isInt(record.bet))
        let info = {
            bet: record.bet
        }

        if (record.status === "CASHED_OUT") {
            assert (lib.isInt(record.stoppedAt))
            info['stopped_at'] = record.stoppedAt
        }

        playerInfo[username] = info
    }

    let res = {
        state: this.state,
        player_info: playerInfo,
        game_id: this.gameId,
        last_hash: this.lastHash,
        max_win: this.maxWin,
        elapsed: Date.now() - this.startTime,
        created: this.startTime,
        joined: this.joined ? this.joined.getArray().map(async (u) => {
            return u.user.username ? u.user.username : null;
        }) : []
    }

    if (this.state === "ENDED") {
        res.crashed_at = this.crashPoint
    }

    return res
}

Game.prototype.placeBet = async(user, betAmount, autoCashOut) => {
    assert(typeof user.id === 'number');
    assert(typeof user.username === 'string');
    assert(lib.isInt(betAmount));
    assert(lib.isInt(autoCashOut) && autoCashOut >= 100);
    if (this.state !== 'STARTING')
        return "GAME_IN_PROGRESS";

    if (lib.hasOwnProperty(this.pending, user.username) || lib.hasOwnProperty(this.players, user.username))
        return "ALREADY_PLACED_BET"

    this.pending[user.username] = user.username
    this.pendingCount++

    let bet = await db.placeBet(betAmount, autoCashOut, user.id, this.gameId)

}

Game.prototype.doCashOut = async(play, at) => {
    assert(typeof play.user.username === 'string');
    assert(typeof play.user.id == 'number');
    assert(typeof play.playId == 'number');
    assert(typeof at === 'number');
    let username = play.user.username

    assert(this.players[username].status === 'PLAYING');
    this.players[username].status = 'CASHED_OUT';
    this.players[username].stoppedAt = at;

    let won = (this.players[username].bet / 100) * at;
    assert(lib.isInt(won))

    this.io.emit("cashed_out", {
        username: username,
        stopped_at: at
    })

    await db.cashOut(play.user.id, play.playId, won)
}

Game.prototype.runCashOuts = async(at) => {
    let update = false

    if (this.players !== undefined && this.players !== null) {
        for (const playerUserName of Object.keys(this.players)) {
            let play = this.players[playerUserName]
            if (play.status === "CASHED_OUT")
                continue;
            assert(play.status === "PLAYING")
            assert(play.autoCashOut)

            if (play.autoCashOut && play.autoCashOut <= this.crashPoint && play.autoCashOut <= this.forcePoint) {
                await this.doCashOut(play, play.autoCashOut)
                update = true
            }
        }
    }

    if (update) {
        await this.setForcePoint()
    }
}

Game.prototype.setForcePoint = async() => {
    let totalBet = 0
    let totalCashedOut = 0
    console.log(this.players ? this.players : [])

    if (this.players !== undefined && this.players !== null && this.players !== []) {
        for (const playerName of Object.keys(this.players)) {
            let play = this.players[playerName]
            if (play.status === "CASHED_OUT") {
                let amount = play.bet * (play.stoppedAt - 100) / 100;
                totalCashedOut += amount
            } else {
                assert(play.status === 'PLAYING');
                assert(lib.isInt(play.bet));
                totalBet += play.bet;
            }
        }
    }

    if (totalBet === 0 || totalBet === undefined || totalBet === null) {
        this.forcePoint = Infinity;
    } else {
        let left = this.maxWin - totalCashedOut - (totalBet * 0.01)
        let ratio = (left+totalBet) / totalBet;
        this.forcePoint = Math.max(Math.floor(ratio * 100), 101);
    }
}

Game.prototype.cashOut = async(user) => {
    assert(typeof user.id === 'number');
    if (this.state !== 'IN_PROGRESS')
        return "GAME_NOT_IN_PROGRESS"

    let elapsed = new Date() - this.startTime
    let at = growthFunc(elapsed)
    let play = lib.getOwnProperty(this.players, user.username)

    if (!play)
        return "NO_BET_PLACED"

    if (play.autoCashOut <= at)
        at = play.autoCashOut

    if (this.forcePoint <= at)
        at = this.forcePoint

    if (at > this.crashPoint)
        return "GAME_ALREADY_CRASHED"

    if (play.status === "CASHED_OUT") {
        return "ALREADY_CASHED_OUT"
    }

    await this.doCashOut(play, at)
    await this.setForcePoint()
}

Game.prototype.cashOutAll = async(at) => {
    if (this.state !== 'IN_PROGRESS')
        return null

    console.log("Cashing everyone at: " + at)

    assert(at >= 100)
    await this.runCashOuts(at)

    if (at > this.crashPoint) {
        return null
    }

    let tasks = []
    for (const playerName of Object.keys(this.players)) {
        let play = this.players[playerName]

        if (play.status === "PLAYING") {
            tasks.push(async () => {
                if (play.status === "PLAYING")
                    this.doCashOut(play, at)
                else
                    return null
            })
        }
    }
    await async.parallelLimit(tasks, 4);
}

Game.prototype.shutDown = async() => {
    this.gameShuttingDown = true;
    this.io.emit("shuttingdown")

    if (this.state === "ENDED") {
        this.io.emit("shutdown")
    }
}

const growthFunc = (ms) => {
    var r = 0.00006;
    return Math.floor(100 * Math.pow(Math.E, r * ms));
}

const inverseGrowth = (result) => {
    var c = 16666.666667;
    return c * Math.log(0.01 * result);
}


module.exports = Game;