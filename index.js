
'use strict';

const https = require('https');

const API_URL = 'https://www.1secmail.com/api/v1';

/**
 * Makes a request to the api with an endpoint
 * 
 * @method get
 * @param {string} path Api endpoint path
 * @returns {Promise<object>} Status code and body
 * @private
 */
function get(path) {
    return new Promise((resolve, reject) => {
        https.get(API_URL + path,
            (res) => {
                let response = {
                    status: res.statusCode,
                    body: ''
                };

                res.on('data', (chunk) => response.body += chunk);
                res.on('end', () => {
                    try {
                        response.body = JSON.parse(response.body);
                    } catch {}

                    if (res.status < 200 || res.status > 299) {
                        return reject(response);
                    }

                    resolve(response);
                });

                res.on('error', reject);
            }
        );
    });
}

/**
 * Generates a unique buffer with array of used items.
 * e.g. if used = ['0f'], and type = 'hex', there is no chance that it returns a '0f' hex buffer
 * 
 * @method generateHash
 * @param {number} len Length of the buffer
 * @param {any[]} used Array containing any type which will prevent the function from generating an already existing hash
 * @param {string} type Buffer type in used. Can be: hex, binary, utf8, etc.
 * @private
 */
function generateHash(len, used, type='hex') {
    let hash = '';
    for (let i = 0; i < len * 2; i++) {
        hash += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    }

    hash = Buffer.from(hash, 'hex');

    if (used.includes(hash.toString(type))) hash = generateHash(len, used, type);

    return hash;
}

/**
 * @constructor
 * @private
 */
function Mailbox() {
    this._listeners = {};
    this._msgTimeout = null;

    this.messages = [];
    this.id = null;

    /**
     * Adds an event listener to the mailbox
     * 
     * @method Mailbox.prototype.on
     * @param {string} event Event to be listened to
     * @param {function} callback Calls when event is called
     */
    this.on = function(event, callback) {
        this._listeners[event] = callback;
        return true;
    }

    /**
     * Connects the mailbox with a random mail address
     * @method Mailbox.prototype.connect
     * @returns {Promise<string>} Mail address
     */
    this.connect = function(address) {
        delete this.connect;

        if (address) {
            this.id = address;

            setTimeout(() => {
                if (this._listeners['ready']) this._listeners['ready'](this.id);
            }, 0);

            return;
        }

        new Promise((resolve, reject) => {
            get('/?action=genRandomMailbox').then(res => {
                this.id = res.body[0];

                if (this._listeners['ready']) this._listeners['ready'](this.id);
                resolve(this.id);
            }).catch(reject);
        });
    }

    /**
     * Fetches all the messages in the inbox
     * @method Mailbox.prototype.fetch
     * @returns {Promise<object[]>} Array with messages
     */
    this.fetch = function() {
        return new Promise((resolve, reject) => {
            get(`/?action=getMessages&login=${this.id.split('@')[0]}&domain=${this.id.split('@')[1]}`)
                .then(res => {
                    let tokens = [];
                    
                    res.body.forEach(msg => {
                        let cntinue = true;
                        this.messages.forEach(message => {
                            if (message._uid == msg._uid) cntinue = false;
                        });

                        if (!cntinue) return;

                        let id = generateHash(16, tokens, 'hex').toString('hex');
                        let message = {
                            _id: id,
                            _uid: msg.id,
                            from: msg.from,
                            to: this.id,
                            subject: msg.subject,
                            date: new Date(msg.date)
                        };

                        tokens.push(id);
                        this.messages.push(message);
                    });

                    resolve(this.messages);
                })
                .catch(reject);
        });
    }

    /**
     * Retrieve message content and meta data
     * 
     * @method Mailbox.prototype.findMessage
     * @param {string} id Message id
     * @returns {Promise<object>} Message
     */
    this.findMessage = function(id) {
        return new Promise((resolve, reject) => {
            let message = false;
            this.messages.forEach(msg => {
                if (msg._id == id) message = msg;
            });

            if (!message) return reject('Invalid ID');

            get(`/?action=readMessage&login=${this.id.split('@')[0]}&domain=${this.id.split('@')[1]}&id=${message._uid}`)
                .then(res => {
                    resolve(Object.assign(message, {
                        body: {
                            text: res.body.textBody,
                            html: res.body.htmlBody
                        }
                    }));
                })
                .catch(reject);
        });
    }

    /**
     * Fetches new messages for every [interval] ms, until process is stopped,
     * or Mailbox.prototype.stopMessageListener is called
     * 
     * @method Mailbox.prototype.startMessageListener
     * @param {number} interval Interval between fetches
     * @param {void} callback Gets called for every fetch
     * @returns {true}
     */
    this.startMessageListener = function(interval, callback) {
        let messages = [];
        let intervalCallback = () => {
            let isnew = [];
            this.fetch().then(msgs => {
                msgs.forEach(msg => {
                    if (messages.includes(msg._uid)) return;
                    messages.push(msg._uid);
                    isnew.push(msg);
                });

                this._msgTimeout = setTimeout(intervalCallback, interval);
                if (isnew.length) callback(isnew);
                isnew = [];
            });
        };
        
        intervalCallback();
        return true;
    }

    /**
     * Stops the messagelistener created with Mailbox.prototype.startMessageListener
     * @method Mailbox.prototype.stopMessageListener
     * @returns {true}
     */
    this.stopMessageListener = () => {
        clearTimeout(this._msgTimeout);
        this._msgTimeout = null;
        return true;
    }
}

/**
 * Creates a mailbox
 * 
 * @method Create
 * @returns {Mailbox} The mailbox
 * @public
 */
function Create() {
    const mailbox = new Mailbox();
    mailbox.connect();
    return mailbox;
}

/**
 * Logs in to an existing mailbox
 * 
 * @method Login
 * @param {string} address Created temporary mail address
 * @returns {Mailbox} The mailbox
 * @public
 */
function Login(address) {
    const mailbox = new Mailbox();
    mailbox.connect(address);
    return mailbox;
}

module.exports = { Create, Login };
