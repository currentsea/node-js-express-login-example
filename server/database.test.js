const db = require('./database')
const lib = require('./lib')
const { Client } = require("pg")
const {getLastGameInfo} = require("./database");

jest.mock('pg', () => {
    const mClient = {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn()
    }
    return { Client: jest.fn(() => mClient) }
})

describe('Database Tests', () => {
    let client

    beforeEach(() => {
        client = new Client()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("Database is defined", async () => {
        let client = await db.getClient()
        expect(client).toBeDefined()
    })

    it("Finds a user name jtbull", async() => {
        client.query.mockResolvedValueOnce({
            "command": "SELECT",
            "rowCount": 1,
            "oid": null,
            "rows": [
                {
                    "id": '1',
                    "created": "2023-05-06T22:18:25.444Z",
                    "username": 'jtbull',
                    "email": '',
                    "password": 'sha1$28c821f3$1$e8b044738de5813ddada10a4f127e68b95325464',
                    "mfa_secret": null,
                    "balance_satoshis": '0',
                    "gross_profit": '0',
                    "net_profit": '0',
                    "games_played": '0',
                    "userclass": 'user',
                    "monero_address": ''
                }
            ]
        })
        let user = await db.getUserByName("jtbull")
        expect(user).toBeDefined()
    })

    it("Fails when trying to find a user that doesnt exist", async() => {
        client.query.mockResolvedValueOnce({
            "command": "SELECT",
            "rowCount": 0,
            "oid": null,
            "rows": []
        })
        let user = await  db.getUserByName("idontexist")
        expect(user).toBe("USER_DOES_NOT_EXIST")
    })

    it("Should return failure when deadlock occurs", async() => {
        const mError = new Error('dead lock');
        client.query.mockResolvedValueOnce(mError)
        let user = await  db.getUserByName("idontexist")
        expect(client.query).toBeCalledWith('SELECT * FROM users WHERE lower(username) = lower($1)', ["idontexist"])
        expect(user).toBe("NO_ROWS_RETURNED_POSSIBLE_DEADLOCK")
    })

    it("Should get the last game when none are played", async() => {
        client.query.mockResolvedValueOnce({
            "command": "SELECT",
            "rowCount": 0,
            "oid": null,
            "rows": [{
                "max": null
            }]
        })
        client.query.mockResolvedValueOnce({
            "command": "SELECT",
            "rowCount": 1,
            "oid": null,
            "rows": [{
                "max": 10999
            }]
        })
        client.query.mockResolvedValueOnce({
            "command": "SELECT",
            "rowCount": 1,
            "oid": null,
            "rows": [{
                "hash": "68d428578122c372f1e9ac810863a1ba79c8bfc87667f76ebf18093ca5f26e87"
            }]
        })
        let lastGameInfo = await db.getLastGameInfo()
        expect(lastGameInfo).toBeDefined()
    })

    it("Should create a game with an ID", async() => {
        const gameHash = "b93f3fddc39a369716df12b5743b81dd5c292f8fb3d65b2aa5e32f556efe62e6"
        const gameCrash = lib.crashPointFromHash(gameHash)
        const gameId = 10997
        client.query.mockResolvedValueOnce({
            "command": "SELECT",
            "rowCount": 1,
            "oid": null,
            "rows": [{
                "hash": gameHash
            }]
        })
        client.query.mockResolvedValueOnce({
            "command": "INSERT",
            "rowCount": 1,
            "oid": null,
            "rows": []
        })

        let newGame = await db.createGame(gameId)
        expect(newGame.hash).toEqual(gameHash)
        expect(newGame.crashPoint).toEqual(gameCrash)
    })

    it("Should create a game with an ID", async() => {
        const gameHash = "b93f3fddc39a369716df12b5743b81dd5c292f8fb3d65b2aa5e32f556efe62e6"
        const gameCrash = lib.crashPointFromHash(gameHash)
        const gameId = 10997
        client.query.mockResolvedValueOnce({
            "command": "SELECT",
            "rowCount": 1,
            "oid": null,
            "rows": [{
                "hash": gameHash
            }]
        })
        client.query.mockResolvedValueOnce({
            "command": "INSERT",
            "rowCount": 1,
            "oid": null,
            "rows": []
        })

        let newGame = await db.createGame(gameId)
        expect(newGame.hash).toEqual(gameHash)
        expect(newGame.crashPoint).toEqual(gameCrash)
    })


    // it("Should validate a one time token properly", async() => {
    //     client.query.mockResolvedValueOnce({
    //         "command": "SELECT",
    //         "rowCount": 1,
    //         "oid": null,
    //         "rows":
    //             [
    //                 {
    //                 "id": '1',
    //                 "created": "2023-05-06T22:18:25.444Z",
    //                 "username": 'jtbull',
    //                 "email": '',
    //                 "password": 'sha1$28c821f3$1$e8b044738de5813ddada10a4f127e68b95325464',
    //                 "mfa_secret": "mfasecret123",
    //                 "balance_satoshis": '0',
    //                 "gross_profit": '0',
    //                 "net_profit": '0',
    //                 "games_played": '0',
    //                 "userclass": 'user',
    //                 "monero_address": ''
    //             }
    //         ]
    //     })
    //
    //     client.query.mockResolvedValueOnce({
    //         "command": "SELECT",
    //         "rowCount": 1,
    //         "oid": null,
    //         "rows":
    //             [
    //                 {
    //                     "id": '1',
    //                     "created": "2023-05-06T22:18:25.444Z",
    //                     "username": 'jtbull',
    //                     "email": '',
    //                     "password": 'sha1$28c821f3$1$e8b044738de5813ddada10a4f127e68b95325464',
    //                     "mfa_secret": "mfasecret123",
    //                     "balance_satoshis": '0',
    //                     "gross_profit": '0',
    //                     "net_profit": '0',
    //                     "games_played": '0',
    //                     "userclass": 'user',
    //                     "monero_address": ''
    //                 }
    //             ]
    //     })
    //
    // })


})