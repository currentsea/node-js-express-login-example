module.exports = {
    PORT: process.env.PORT || 3001,
    USE_HTTPS: false,
    HTTPS_KEY: process.env.HTTPS_KEY || './key.pem',
    HTTPS_CERT: process.env.HTTPS_CERT || './cert.pem',
    HTTPS_CA: process.env.HTTPS_CA,
    DATABASE_URL:  process.env.DATABASE_URL || "postgres://crashltc:IRONman1@192.168.1.228:5432/crashltcdb",
    ENC_KEY: process.env.ENC_KEY || '73181660-e95d',
    PRODUCTION: process.env.NODE_ENV  === 'production',
    BANKROLL_OFFSET : parseInt(process.env.BANKROLL_OFFSET)|| 1e10,
    CLIENT_SEED: process.env.CLIENT_SEED || "7ae4704eb49c8808ab9ef7b119fc39ca9ef56271a97f8821b28429602e44853e",

    //Do not set any of this on production
    CRASH_AT: process.env.CRASH_AT, //Force the crash point
};