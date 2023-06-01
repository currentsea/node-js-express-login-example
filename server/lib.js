const assert = require('better-assert');
const crypto = require('crypto');
const config = require('./config')

const isUUIDv4 = (uuid) => {
    return (typeof uuid === 'string') && uuid.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
}

const hasOwnProperty = (obj, propName) => {
    return Object.prototype.hasOwnProperty.call(obj, propName);
}

const getOwnProperty = (obj, propName) => {
    return Object.prototype.hasOwnProperty.call(obj, propName) ? obj[propName] : undefined;
}

const isInt = (numVal) => {
    return typeof numVal === "number" && isFinite(numVal) && numVal > -9007199254740992 && numVal < 9007199254740992 && Math.floor(numVal) === numVal;
};

const parseTimeString = (str) => {
    const reg   = /^\s*([1-9]\d*)([dhms])\s*$/;
    const match = str.match(reg);

    if (!match)
        return null;

    let num = parseInt(match[1]);
    switch (match[2]) {
        case 'd': num *= 24;
        case 'h': num *= 60;
        case 'm': num *= 60;
        case 's': num *= 1000;
    }

    assert(num > 0);
    return num;
}

const printTimeString = (ms) => {
    const days = Math.ceil(ms / (24*60*60*1000));
    if (days >= 3) return '' + days + 'd';

    const hours = Math.ceil(ms / (60*60*1000));
    if (hours >= 3) return '' + hours + 'h';

    const minutes = Math.ceil(ms / (60*1000));
    if (minutes >= 3) return '' + minutes + 'm';

    const seconds = Math.ceil(ms / 1000);
    return '' + seconds + 's';
}

const genGameHash = (serverSeed) => {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

const divisible = (hash, mod) => {
    let val = 0;
    let o = hash.length % 4;
    for (let i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
        val = ((val << 16) + parseInt(hash.substring(i, i+4), 16)) % mod;
    }
    return val === 0;
}

// This will be the client seed of monero block 2871027

const crashPointFromHash = (serverSeed) => {
    const clientSeed = config.CLIENT_SEED || "7ae4704eb49c8808ab9ef7b119fc39ca9ef56271a97f8821b28429602e44853e"

    let hash = crypto.createHmac('sha256', serverSeed).update(clientSeed).digest('hex');

    // In 1 of 101 games the game crashes instantly.
    if (divisible(hash, 101)) {
        return 0;
    }

    // Use the most significant 52-bit from the hash to calculate the crash point
    let h = parseInt(hash.slice(0,52/4),16);
    let e = Math.pow(2,52);

    return Math.floor((100 * e - h) / (e - h));
}

const placeholder = async () => {
    return 3
}

const inverseGrowth = (result) => {
    const c = 16666.666667
    return c * Math.log(0.01 * result)
}

const removeNullsAndTrim = (str) => {
    if(typeof str === 'string')
        return str.replace(/\0/g, '').trim();
    else
        return str;
};

module.exports = { removeNullsAndTrim, inverseGrowth, placeholder, isInt, isUUIDv4, hasOwnProperty, getOwnProperty, parseTimeString, crashPointFromHash, genGameHash, printTimeString }


