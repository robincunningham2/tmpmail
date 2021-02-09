
'use strict';

const https = require('https');

const API_URL = 'https://www.1secmail.com/api/v1';

/**
 * Makes a request to the api with an endpoint
 * 
 * @method get
 * @param {string} path Api endpoint path
 * @returns {Promise<Object>} Status code and body
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
    this._messages = {};
    this._msgTimeout = null;

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
     * @returns {Promise<String>} Mail address
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
                    let messages = [],
                        tokens = [];
                    
                    res.body.forEach(msg => {
                        let id = generateHash(16, tokens, 'hex').toString('hex');
                        let message = {
                            _id: id,
                            from: msg.from,
                            to: this.id,
                            subject: msg.subject,
                            date: new Date(msg.date)
                        };

                        tokens.push(id);
                        messages.push(message);

                        this._messages[id] = Object.assign(message, { _uid: msg.id });
                    });

                    resolve(messages);
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
            if (!this._messages[id]) return reject('Invalid ID');
            let msg = this._messages[id];

            get(`/?action=readMessage&login=${this.id.split('@')[0]}&domain=${this.id.split('@')[1]}&id=${msg._uid}`)
                .then(res => {
                    let message = {
                        _id: msg._id,
                        from: msg.from,
                        to: msg.to,
                        subject: msg.subject,
                        date: msg.date,
                        body: {
                            text: res.body.textBody,
                            html: res.body.htmlBody
                        }
                    };

                    resolve(message);
                })
                .catch(reject);
        });
    }

    /**
     * Fetches messages for every [interval] ms, until process is stopped,
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
            this.fetch().then(msgs => {
                messages = [];
                msgs.forEach(msg => {
                    delete msg._uid;
                    messages.push(msg);
                });

                this._msgTimeout = setTimeout(intervalCallback, interval);
                callback(messages);
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
