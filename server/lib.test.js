const lib = require("./lib");
const {validateOneTimeToken} = require("./database");
describe('Standard Library Tests - Gamerserver', () => {

    beforeEach(() => {
    })

    afterEach(() => {
    })

    it("Should return a days worth of milliseconds when 1d is passed to parseTimeString", () => {
        const timeString = "1d"
        const response = lib.parseTimeString(timeString)
        expect(response).toBe(86400000)
    })

    it("Should return 7 days worth of milliseconds when 7d is passed to parseTimeString", () => {
        const timeString = "7d"
        const response = lib.parseTimeString(timeString)
        expect(response).toBe(604800000)
    })

    it("Should return a hour worth of milliseconds when 1h is passed to parseTimeString", () => {
        const timeString = "1h"
        const response = lib.parseTimeString(timeString)
        expect(response).toBe(3600000)
    })

    it("Should return a minute worth of milliseconds when 1m is passed to parseTimeString", () => {
        const timeString = "1m"
        const response = lib.parseTimeString(timeString)
        expect(response).toBe(60000)
    })

    it("Should return a second worth of milliseconds when 1s is passed to parseTimeString", () => {
        const timeString = "1s"
        const response = lib.parseTimeString(timeString)
        expect(response).toBe(1000)
    })

    // it("Should validate a one time token", async() => {
    //     client.query.mockResolvedValueOnce({
    //         "command": "SELECT",
    //         "rowCount": 1,
    //         "oid": null,
    //         "rows": [{
    //             "token": "mytoken"
    //         }]
    //     })
    //     await client.connect()
    //     let res = await validateOneTimeToken("mytoken")
    //     assert(res.rowCount === 1)
    //     expect(result.rows[0]).toBeDefined()
    // })
})