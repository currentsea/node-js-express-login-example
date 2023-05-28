const CBuffer = require("CBuffer")
const database = require('./database')
const _ = require('lodash')

function GameHistory (gameTable) {
    let self = this
    self.gameTable = new CBuffer(20)

    if (gameTable !== undefined) {
        gameTable.forEach((game) => {
            self.gameTable.push(game)
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