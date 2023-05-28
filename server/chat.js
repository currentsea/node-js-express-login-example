const assert   =  require('assert');
const CBuffer  =  require('CBuffer');
const events   =  require('events');
const util     =  require('util');
const _        =  require('lodash');

const db       =  require('./database');
const lib      =  require('./lib');

const CHAT_HISTORY_SIZE = 50;

function Chat() {
    const self = this;

    // History of chat messages.
    self.chatTable = new CBuffer(CHAT_HISTORY_SIZE);
    // History of mod only messages.
    self.modTable  = new CBuffer(CHAT_HISTORY_SIZE);

    /*
      Collection of muted users.
        key:   Username
        value: Object with the following fields
                  time:       Date object when the user was muted
                  moderator:  The username of the moderator that muted the user
                  timespec:   Initial (nominal diff) time the user has been muted
                  end:        Until when the user is muted
                  shadow:     If the mute is a shadow mute
    */
    self.muted = {};

    events.EventEmitter.call(self);
}

util.inherits(Chat, events.EventEmitter);

Chat.prototype.getHistory = function (userInfo) {
    const history = this.chatTable.toArray();

    if (userInfo && userInfo.moderator) {
        history = history.concat(this.modTable.toArray());
        history = _.sortBy(history, 'time');

        // Sorting by time leaves younger messages at the end. So use
        // the last CHAT_HISTORY_SIZE messages.
        history = history.splice(-CHAT_HISTORY_SIZE);
    }

    return history;
};

Chat.prototype.say = function(socket, userInfo, message) {
    const self = this;
    const now = new Date();

    const msg = {
        time:      now,
        type:      'say',
        username:  userInfo.username,
        role:      userInfo.userclass,
        message:   message
    };

    if (lib.hasOwnProperty(self.muted, userInfo.username)) {
        const muted = self.muted[userInfo.username];
        if (muted.end < now) {
            // User has been muted before, but enough time has passed.
            delete self.muted[userInfo.username];
        } else if (muted.shadow) {
            // User is shadow muted. Echo the message back to the
            // user but don't broadcast.
            socket.emit('msg', msg);
            return;
        } else {
            // Inform the user that he is still muted.
            socket.emit('msg',
                { time: now,
                    type: 'info',
                    message: 'You\'re muted. ' +
                        lib.printTimeString(muted.end - now) +
                        ' remaining'
                });
            return;
        }
    }

    self.chatTable.push(msg);
    self.emit('msg', msg);
};

Chat.prototype.mute = function(shadow, moderatorInfo, username, time, callback) {
    const self = this;
    const now = new Date();
    const ms  = lib.parseTimeString(time);
    const end = new Date(Date.now() + ms);

    // Query the db to make sure that the username exists.
    db.getUserByName(username, function(err, userInfo) {

        if (err) {
            callback(err);
            return;
        }
        assert(userInfo);

        if (userInfo.admin) {
            callback('Cannot mute an admin');
            return;
        }

        // Overriding previous mutes.
        self.muted[userInfo.username] =
            { time:        now,
                moderator:   moderatorInfo.username,
                timespec:    time,
                end:         end,
                shadow:      shadow
            };

        const msg = {
            time:        now,
            type:        'mute',
            moderator:   moderatorInfo.username,
            username:    userInfo.username,
            timespec:    time,
            shadow:      shadow
        };

        if (shadow) {
            self.modTable.push(msg);
            self.emit('modmsg', msg);
        } else {
            self.chatTable.push(msg);
            self.emit('msg', msg);
        }
        callback(null);
    });
};

Chat.prototype.unmute = function(moderatorInfo, username, callback) {
    const self = this;
    const now = new Date();

    if (!lib.hasOwnProperty(self.muted, username))
        return callback('USER_NOT_MUTED');

    const shadow = self.muted[username].shadow;
    delete self.muted[username];

    const msg = {
        time:      now,
        type:      'unmute',
        moderator: moderatorInfo.username,
        username:  username,
        shadow:    shadow
    };

    if (shadow) {
        self.modTable.push(msg);
        self.emit('modmsg', msg);
    } else {
        self.chatTable.push(msg);
        self.emit('msg', msg);
    }
    callback(null);
};

Chat.prototype.listmuted = function () {
    return self.muted;
};

module.exports = Chat;
