const assert = require('assert');
const uuid = require('uuid');
const async = require('async');
const lib = require('./lib');
const config = require('./config');
const {Client} = require("pg");



const getClient = async () => {
    if (!config.DATABASE_URL)
        throw new Error('must set DATABASE_URL environment const');

    const dbConfig = {
        connectionString: config.DATABASE_URL
    }
    const client = new Client(dbConfig)
    return client
}

const validateOneTimeToken = async(token) => {
    assert(token)
    const client = getClient()
    await client.connect()
    let res = await client.query('WITH t as (UPDATE sessions SET expired = now() WHERE id = $1 AND ott = TRUE RETURNING *)' +
        'SELECT * FROM users WHERE id = (SELECT user_id FROM t)', [token])
    await client.end()

    if (res.rowCount === 0) {
        return "NOT_VALID_TOKEN"
    }
    assert (res.rows.length === 1)
    return result.rows[0]
}

const getLastGameInfo = async () => {
    const client = await getClient()
    await client.connect()
    let query = await client.query('SELECT MAX(id) FROM games', null)
    let lastGame = null

    if (query.rowCount === 0) {
        let minId = await client.query("SELECT MIN(game_id) FROM game_hashes", null)
        assert(minId.rows.length === 1)
        let minHash = await client.query('SELECT hash FROM game_hashes WHERE game_id = $1', [minId.rows[0].max])
        assert(minHash.rows.length === 1)
        return {
            id: minId.rows[0].min,
            hash: minHash.rows[0].hash
        }
    }

    assert(query.rows.length === 1)
    const id = query.rows[0].max;
    const hashQuery = await client.query('SELECT hash FROM game_hashes WHERE game_id = $1', [id])
    assert(query.rows.length === 1)

    if (!id || id < 1e6) {
        lastGame = {
            id: 1000000,
            hash: '75c8bfda2322e3cf110699e391cb3f780c10cbdf07786f0ae33e9060e889ba97'
        };
    } else {
        lastGame = {
            id: id,
            hash: hashQuery.rows[0].hash
        }
    }
    await client.end()
    return lastGame
}

const getUserByName = async (username) => {
    assert(username)
    try {
        const client = await getClient()
        await client.connect()
        let query = await client.query('SELECT * FROM users WHERE lower(username) = lower($1)', [username])

        if (query.rows?.length === undefined) {
            return "NO_ROWS_RETURNED_POSSIBLE_DEADLOCK"
        }

        if (query.rows?.length === 0) {
            return "USER_DOES_NOT_EXIST"
        }
        await client.end()
        return query.rows[0]

    } catch (e) {
        console.log("Got error ", e)
        throw new Error(e.message)
    }

}

const placeBet = async(amount, autoCashOut, userId, gameId) => {
    assert (typeof amount === 'number')
    assert (typeof autoCashOut === 'number')
    assert (typeof userId === 'number')
    assert (typeof gameId === 'number')
    const client = await getClient()
    let tasks = [
        async () => {
            await client.query('UPDATE users SET balance_satoshis = balance_satoshis - $1 WHERE id = $2', [amount, userId])
        },
        async () => {
            await client.query('INSERT INTO plays(user_id, game_id, bet, auto_cash_out) VALUES($1, $2, $3, $4) RETURNING id',
                [userId, gameId, amount, autoCashOut])
        }
    ]

    return await async.parallel(tasks, (err, result) => {
        if (err)
            console.log(err)
        let playId = result[1].rows[0].id
        assert(typeof playId === 'number')
        return playId
    })

}

const endGame = async(gameId, bonuses) => {
    const endGameQuery =
        'WITH vals AS ( ' +
        ' SELECT ' +
        ' unnest($1::bigint[]) as user_id, ' +
        ' unnest($2::bigint[]) as play_id, ' +
        ' unnest($3::bigint[]) as bonus ' +
        '), p AS (' +
        ' UPDATE plays SET bonus = vals.bonus FROM vals WHERE id = vals.play_id RETURNING vals.user_id '+
        '), u AS (' +
        ' UPDATE users SET balance_satoshis = balance_satoshis + vals.bonus ' +
        ' FROM vals WHERE id = vals.user_id RETURNING vals.user_id ' +
        ') SELECT COUNT(*) count FROM p JOIN u ON p.user_id = u.user_id'
    assert(typeof gameId === 'number')
    const client = await getClient()
    await client.connect()
    let game_ended = await client.query('UPDATE games SET ended = true WHERE id = $1', [gameId])
    if (bonuses != undefined && bonuses.length === 0) {
        returnString = "GAME_COMPLETED_SUCCESS"
        return returnString
    } else {
        let userIds = []
        let playIds = []
        let bonusesAmounts = []
        if (bonuses !== undefined ) {
            bonuses.forEach((bonus) => {
                assert(lib.isInt(bonus.user.id))
                userIds.push(bonus.user.id)
                assert(lib.isInt(bonus.playId))
                playIds.push(bonus.playId)
                assert(lib.isInt(bonus.amount) && bonus.amount > 0)
                bonusesAmounts.push(bonus.amount)
            })
        }
        let returnString = ""
        assert (userIds.length == playIds.length && playIds.length == bonusesAmounts.length)
        let endGameResults = await client.query(endGameQuery, [userIds, playIds, bonusesAmounts])
        // if (endGameResults.rows[0].count !== userIds.length) {
        //     throw new Error('Mismatch row count: ' + endGameResults.rows[0].count + ' and ' + userIds.length);
        // }
        await client.end()
        returnString = "GAME_COMPLETED_SUCCESS"
        return returnString
    }

}

const addSatoshis = async (client, userId, amount) => {
    let res = await client.query('UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE id = $2', [amount, userId])
    assert (res.rowCount === 1)
    return true
}

const cashOut = async(userId, playId, amount) => {
    assert(typeof userId === 'number');
    assert(typeof playId === 'number');
    assert(typeof amount === 'number');
    const client = await getClient()
    let satoshisAdded = addSatoshis(client, userId, amount)
    if (satoshisAdded) {
        console.log("Added " + amount + " satoshis to userId " + userId)
    } else {
        console.error("Unable to add " + amount + " satoshis to userId " + userId)
    }
    let cashoutResult = await client.query('UPDATE plays SET cash_out = $1 WHERE id = $2 AND cash_out IS NULL', [amount, playId])
    if (cashoutResult.rowCount !== 1) {
        console.error('[INTERNAL_ERROR] Double cashout? ',
            'User: ', userId, ' play: ', playId, ' amount: ', amount,
            ' got: ', result.rowCount)
        return new Error("Double cashout")
    }
    return true
}

const createGame = async(gameId) => {
    assert(typeof gameId === 'number');
    const client = await getClient()
    await client.connect()
    let results = await client.query('SELECT hash FROM game_hashes WHERE game_id = $1', [gameId])
    if (results.rowCount !== 1) {
        console.error('[INTERNAL_ERROR] Could not find hash for game ', gameId)
        return "NO_GAME_HASH"
    }
    const hash = results.rows[0].hash
    const gameCrash = lib.crashPointFromHash(hash)
    assert(lib.isInt(gameCrash))

    let insertResult = await client.query('INSERT INTO games(id, game_crash) VALUES($1, $2)', [gameId, gameCrash])
    await client.end()
    if (insertResult.rowCount === 1) {
        return { crashPoint: gameCrash, hash: hash }
    } else {
        console.error("Could not create game due to error, rowcount is greater than 1")
    }
}

const getGameHistory = async() => {
    const sql =
        'SELECT games.id game_id, game_crash, created, ' +
        '     (SELECT hash FROM game_hashes WHERE game_id = games.id), ' +
        '     (SELECT to_json(array_agg(to_json(pv))) ' +
        '        FROM (SELECT username, bet, (100 * cash_out / bet) AS stopped_at, bonus ' +
        '              FROM plays JOIN users ON user_id = users.id WHERE game_id = games.id) pv) player_info ' +
        'FROM games ' +
        'WHERE games.ended = true ' +
        'ORDER BY games.id DESC LIMIT 10';
    const client = await getClient()
    await client.connect()
    let data = await client.query(sql)

    if (data.rowCount >= 1) {
        data.rows.forEach((row) => {
            let oldInfo = row.player_info || []
            let newInfo = row.player_info = {}
            oldInfo.forEach((play) => {
                newInfo[play.username] = {
                    bet: play.bet,
                    stopped_at: play.stopped_at,
                    bonus: play.bonus
                }
            })
        })
    }
    await client.end()
    return data.rows
}

const getBankroll = async () => {
    const client = await getClient()
    await client.connect()
    const queryString = 'SELECT (' +
        '(SELECT COALESCE(SUM(amount),0) FROM fundings) - ' +
        '(SELECT COALESCE(SUM(balance_satoshis), 0) FROM users)) AS profit '
    let res = await client.query(queryString)
    assert (res.rowCount === 1)
    let profit = res.rows[0].profit + config.BANKROLL_OFFSET
    const min = 1e8
    return Math.max(min, profit)
}



module.exports = { getBankroll, getLastGameInfo, getUserByName, getClient, validateOneTimeToken, endGame, cashOut, getGameHistory, createGame, placeBet }