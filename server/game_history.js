const CBuffer = require("CBuffer")
const database = require('./database')
const _ = require('lodash')

function GameHistory  (gameTable) {
    this.gameTable = new CBuffer(20)
    if (gameTable !== undefined) {
        gameTable.forEach((game) => {
            if (this.gameTable !== undefined) {
                this.gameTable.push(game)
            }
        })
    }
}

GameHistory.prototype.addCompletedGame = function (game) {
    this.gameTable.unshift(game)
}

GameHistory.prototype.getHistory = function () {
    return this.gameTable.toArray()
}

module.exports = GameHistory